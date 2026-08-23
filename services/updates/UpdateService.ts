import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UpdateManifest,
  UpdateState,
  UpdateStatus,
  UpdateCheckResult,
} from './UpdateTypes';
import { VersionComparator } from './VersionComparator';

const DISMISSED_VERSION_KEY = '@taskora_update_dismissed_version';
const LAST_CHECKED_KEY = '@taskora_update_last_checked_timestamp';
const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours cooldown for auto-checks

// Default production update manifest URL
export const DEFAULT_UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/narunsenthilkumar/Taskora/main/releases/version.json';

export class UpdateService {
  private static instance: UpdateService;

  private state: UpdateState = {
    status: 'idle',
    currentVersion: Constants.expoConfig?.version || '1.0.0',
    manifest: null,
    isMandatory: false,
    downloadProgress: 0,
    downloadedFileUri: null,
    errorMessage: null,
    lastCheckedAt: null,
  };

  private listeners: Set<(state: UpdateState) => void> = new Set();
  private downloadResumable: FileSystem.DownloadResumable | null = null;
  private manifestUrl: string = DEFAULT_UPDATE_MANIFEST_URL;

  private constructor() {
    this.state.currentVersion = Constants.expoConfig?.version || '1.0.0';
  }

  public static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  public getState(): UpdateState {
    return { ...this.state };
  }

  public subscribe(listener: (state: UpdateState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('[UpdateService] Listener error:', err);
      }
    });
  }

  private setState(updates: Partial<UpdateState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  public setManifestUrl(url: string) {
    this.manifestUrl = url;
  }

  public getCurrentVersion(): string {
    return this.state.currentVersion;
  }

  /**
   * Checks for available updates against the remote manifest.
   * @param force - If true, bypasses cooldown and dismissed version check.
   */
  public async checkForUpdates(force: boolean = false): Promise<UpdateCheckResult> {
    if (Platform.OS !== 'android') {
      return { updateAvailable: false, isMandatory: false, manifest: null };
    }

    try {
      this.setState({ status: 'checking', errorMessage: null });

      // Check cooldown if not forced
      if (!force) {
        const lastCheckedStr = await AsyncStorage.getItem(LAST_CHECKED_KEY);
        if (lastCheckedStr) {
          const lastChecked = parseInt(lastCheckedStr, 10);
          if (Date.now() - lastChecked < CHECK_COOLDOWN_MS && this.state.manifest) {
            const isAvail = VersionComparator.isUpdateAvailable(
              this.state.currentVersion,
              this.state.manifest.latestVersion
            );
            this.setState({
              status: isAvail ? 'update_available' : 'up_to_date',
              lastCheckedAt: lastChecked,
            });
            return {
              updateAvailable: isAvail,
              isMandatory: this.state.isMandatory,
              manifest: this.state.manifest,
            };
          }
        }
      }

      // Fetch manifest from remote with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let manifest: UpdateManifest | null = null;

      try {
        const response = await fetch(this.manifestUrl, {
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          manifest = await response.json();
        }
      } catch (fetchErr) {
        console.warn('[UpdateService] Remote manifest fetch notice:', fetchErr);
      }

      const now = Date.now();
      await AsyncStorage.setItem(LAST_CHECKED_KEY, now.toString());

      if (!manifest || !manifest.latestVersion) {
        this.setState({
          status: 'up_to_date',
          errorMessage: null,
          lastCheckedAt: now,
        });
        return { updateAvailable: false, isMandatory: false, manifest: null };
      }

      const updateAvailable = VersionComparator.isUpdateAvailable(
        this.state.currentVersion,
        manifest.latestVersion
      );

      const isMandatory =
        !!manifest.mandatory ||
        VersionComparator.isBelowMinimum(
          this.state.currentVersion,
          manifest.minimumSupportedVersion
        );

      if (!updateAvailable) {
        this.setState({
          status: 'up_to_date',
          manifest,
          isMandatory: false,
          lastCheckedAt: now,
        });
        return { updateAvailable: false, isMandatory: false, manifest };
      }

      // Check if this specific version was dismissed by the user (unless forced or mandatory)
      if (!force && !isMandatory) {
        const dismissedVersion = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
        if (dismissedVersion === manifest.latestVersion) {
          this.setState({
            status: 'idle',
            manifest,
            isMandatory: false,
            lastCheckedAt: now,
          });
          return { updateAvailable: true, isMandatory: false, manifest };
        }
      }

      this.setState({
        status: 'update_available',
        manifest,
        isMandatory,
        lastCheckedAt: now,
      });

      return { updateAvailable: true, isMandatory, manifest };
    } catch (err: any) {
      console.error('[UpdateService] Error checking for updates:', err);
      this.setState({
        status: 'error',
        errorMessage: err?.message || 'Failed to check for updates',
      });
      return {
        updateAvailable: false,
        isMandatory: false,
        manifest: null,
        error: err?.message,
      };
    }
  }

  /**
   * Dismisses the current update prompt for the specified version.
   */
  public async dismissUpdate(version?: string): Promise<void> {
    const ver = version || this.state.manifest?.latestVersion;
    if (ver) {
      await AsyncStorage.setItem(DISMISSED_VERSION_KEY, ver);
    }
    this.setState({ status: 'idle' });
  }

  /**
   * Starts downloading the APK with progress reporting.
   */
  public async downloadUpdate(): Promise<boolean> {
    if (Platform.OS !== 'android' || !this.state.manifest?.downloadUrl) {
      return false;
    }

    try {
      this.setState({
        status: 'downloading',
        downloadProgress: 0,
        errorMessage: null,
      });

      const fileName = `taskora-${this.state.manifest.latestVersion}.apk`;
      const localApkUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Clean up old downloaded file if present
      const fileInfo = await FileSystem.getInfoAsync(localApkUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localApkUri, { idempotent: true });
      }

      this.downloadResumable = FileSystem.createDownloadResumable(
        this.state.manifest.downloadUrl,
        localApkUri,
        {},
        (downloadProgress) => {
          const total = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          if (total > 0) {
            const progress = Math.min(100, Math.round((written / total) * 100));
            this.setState({ downloadProgress: progress });
          }
        }
      );

      const result = await this.downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('Download failed: file not created');
      }

      // SHA-256 verification if provided
      if (this.state.manifest.sha256) {
        this.setState({ status: 'verifying' });
        try {
          // Read downloaded file and verify digest
          const fileContent = await FileSystem.readAsStringAsync(result.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const computedHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            fileContent
          );

          if (computedHash.toLowerCase() !== this.state.manifest.sha256.toLowerCase()) {
            throw new Error(
              `Integrity verification failed. Checksum mismatch: expected ${this.state.manifest.sha256}, got ${computedHash}`
            );
          }
        } catch (cryptoErr) {
          console.warn('[UpdateService] Checksum check warning:', cryptoErr);
        }
      }

      this.setState({
        status: 'ready_to_install',
        downloadProgress: 100,
        downloadedFileUri: result.uri,
      });

      return true;
    } catch (err: any) {
      console.error('[UpdateService] Download error:', err);
      this.setState({
        status: 'error',
        errorMessage: err?.message || 'Download failed. Please check connection.',
      });
      return false;
    }
  }

  /**
   * Launches Android native package installer for the downloaded APK.
   */
  public async installUpdate(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const fileUri = this.state.downloadedFileUri;
    if (!fileUri) {
      this.setState({
        status: 'error',
        errorMessage: 'APK file not found. Please download again.',
      });
      return false;
    }

    try {
      this.setState({ status: 'installing' });

      // Convert file:// URI to content:// URI using Expo FileSystem FileProvider
      const contentUri = await FileSystem.getContentUriAsync(fileUri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

      return true;
    } catch (err: any) {
      console.error('[UpdateService] Installer launch error:', err);
      // Fallback: Attempt opening directly via Linking if IntentLauncher fails
      try {
        if (this.state.manifest?.downloadUrl) {
          await Linking.openURL(this.state.manifest.downloadUrl);
          return true;
        }
      } catch {}

      this.setState({
        status: 'error',
        errorMessage: err?.message || 'Could not launch package installer',
      });
      return false;
    }
  }
}

export const updateService = UpdateService.getInstance();
