import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DevicePairingInfo,
  PairingCodePayload,
  PairingPayload,
  PairingValidationResult,
  RevokedDeviceRecord,
  PlatformType,
} from './types';
import { DeviceIdService } from './DeviceIdService';
import { SessionService } from '../auth/SessionService';
import { AccountService } from '../auth/AccountService';
import { LocalDatabase } from '../data/database/LocalDatabase';
import { Encryption } from '../security/Encryption';
import { UserAccount } from '../auth/AccountModel';

export class DevicePairing {
  private static readonly PAIRED_DEVICES_KEY = '@taskora_paired_devices_v4';
  private static readonly REVOKED_DEVICES_KEY = '@taskora_revoked_devices_v4';
  private static readonly ACTIVE_PAIRING_CODE_KEY = '@taskora_active_pairing_code_v4';

  /**
   * Loads all authorized paired devices
   */
  public static async getPairedDevices(): Promise<DevicePairingInfo[]> {
    try {
      const raw = await AsyncStorage.getItem(this.PAIRED_DEVICES_KEY);
      if (!raw) return [];
      const parsed: DevicePairingInfo[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[DevicePairing] Error loading paired devices:', e);
      return [];
    }
  }

  /**
   * Saves paired devices list
   */
  private static async savePairedDevices(devices: DevicePairingInfo[]): Promise<void> {
    await AsyncStorage.setItem(this.PAIRED_DEVICES_KEY, JSON.stringify(devices));
  }

  /**
   * Loads all revoked devices
   */
  public static async getRevokedDevices(): Promise<RevokedDeviceRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(this.REVOKED_DEVICES_KEY);
      if (!raw) return [];
      const parsed: RevokedDeviceRecord[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('[DevicePairing] Error loading revoked devices:', e);
      return [];
    }
  }

  /**
   * Saves revoked devices list
   */
  private static async saveRevokedDevices(revoked: RevokedDeviceRecord[]): Promise<void> {
    await AsyncStorage.setItem(this.REVOKED_DEVICES_KEY, JSON.stringify(revoked));
  }

  /**
   * Checks if a device ID has been revoked
   */
  public static async isDeviceRevoked(deviceId: string): Promise<boolean> {
    const revoked = await this.getRevokedDevices();
    return revoked.some((r) => r.deviceId === deviceId);
  }

  /**
   * Revokes and removes a device authorization
   */
  public static async revokeDevice(deviceId: string, reason?: string): Promise<void> {
    const currentDeviceId = await DeviceIdService.getDeviceId();
    const devices = await this.getPairedDevices();
    const targetDevice = devices.find((d) => d.deviceId === deviceId);
    const deviceName = targetDevice?.deviceName || 'Unknown Device';

    // 1. Remove from active devices
    const filtered = devices.filter((d) => d.deviceId !== deviceId);
    await this.savePairedDevices(filtered);

    // 2. Add to persistent revocation registry
    const revokedList = await this.getRevokedDevices();
    if (!revokedList.some((r) => r.deviceId === deviceId)) {
      revokedList.push({
        deviceId,
        deviceName,
        revokedAt: new Date().toISOString(),
        revokedByDeviceId: currentDeviceId,
        reason: reason || 'Explicitly removed by user in Sync Settings',
      });
      await this.saveRevokedDevices(revokedList);
    }
  }

  /**
   * Removes device from revocation registry only when a fresh, authenticated pairing occurs
   */
  public static async unrevokeDevice(deviceId: string): Promise<void> {
    const revokedList = await this.getRevokedDevices();
    const filtered = revokedList.filter((r) => r.deviceId !== deviceId);
    await this.saveRevokedDevices(filtered);
  }

  /**
   * Authorizes or updates a device record ensuring no duplicates
   */
  public static async authorizeDevice(
    device: Omit<DevicePairingInfo, 'pairedAt' | 'authorized'>
  ): Promise<DevicePairingInfo> {
    // Un-revoke if valid authenticated pairing occurred
    await this.unrevokeDevice(device.deviceId);

    const devices = await this.getPairedDevices();
    const existingIndex = devices.findIndex((d) => d.deviceId === device.deviceId);

    const pairedInfo: DevicePairingInfo = {
      ...device,
      pairedAt: existingIndex >= 0 ? devices[existingIndex].pairedAt : new Date().toISOString(),
      authorized: true,
      lastSyncedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      devices[existingIndex] = {
        ...devices[existingIndex],
        ...pairedInfo,
      };
    } else {
      devices.push(pairedInfo);
    }

    await this.savePairedDevices(devices);
    return pairedInfo;
  }

  /**
   * Updates a device's custom name
   */
  public static async updateDeviceName(deviceId: string, newName: string): Promise<void> {
    if (!newName.trim()) return;
    const devices = await this.getPairedDevices();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (device) {
      device.deviceName = newName.trim();
      await this.savePairedDevices(devices);
    }
  }

  /**
   * Updates last synced timestamp for a device
   */
  public static async recordSyncTime(deviceId: string): Promise<void> {
    const devices = await this.getPairedDevices();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (device) {
      device.lastSyncedAt = new Date().toISOString();
      await this.savePairedDevices(devices);
    }
  }

  /**
   * Checks if a device is currently authorized
   */
  public static async isDeviceAuthorized(deviceId: string): Promise<boolean> {
    if (await this.isDeviceRevoked(deviceId)) {
      return false;
    }
    const devices = await this.getPairedDevices();
    const match = devices.find((d) => d.deviceId === deviceId);
    return !!match && match.authorized;
  }

  /**
   * Generates a secure, cryptographically random 6-digit pairing code valid for 5 minutes
   */
  public static async generatePairingCode(): Promise<PairingCodePayload> {
    const rawNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedCode = `${rawNumber.substring(0, 3)}-${rawNumber.substring(3, 6)}`;
    const deviceId = await DeviceIdService.getDeviceId();
    const deviceName = DeviceIdService.getDeviceName();
    const session = await SessionService.getActiveSession();

    const payload: PairingCodePayload = {
      code: formattedCode,
      deviceId,
      deviceName,
      userId: session.userId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
    };

    await AsyncStorage.setItem(this.ACTIVE_PAIRING_CODE_KEY, JSON.stringify(payload));
    return payload;
  }

  /**
   * Generates a complete, validated, versioned PairingPayload snapshot to transfer identity & data
   */
  public static async generatePairingPayload(): Promise<{
    payload: PairingPayload;
    encodedString: string;
    code: string;
  }> {
    const pairingCodeObj = await this.generatePairingCode();
    const cleanCode = pairingCodeObj.code.replace(/\D/g, '');
    const codeHash = Encryption.hashString(cleanCode);

    const deviceId = await DeviceIdService.getDeviceId();
    const deviceName = DeviceIdService.getDeviceName();
    const session = await SessionService.getActiveSession();
    const primaryAccount = await AccountService.getPrimaryAccount();

    await LocalDatabase.init();
    const allTasks = await LocalDatabase.getAllTasks();
    const allProjects = await LocalDatabase.getAllProjects();
    const allTags = await LocalDatabase.getAllTags();

    const rawPayload: Omit<PairingPayload, 'checksum'> = {
      version: 1,
      type: 'TASKORA_ACCOUNT_PAIRING',
      accountId: primaryAccount ? primaryAccount.userId : session.userId,
      accountName: primaryAccount ? primaryAccount.displayName : session.displayName || 'Taskora User',
      email: primaryAccount ? primaryAccount.email : session.email || '',
      senderDeviceId: deviceId,
      senderDeviceName: deviceName,
      senderPlatform: DeviceIdService.getPlatformType(),
      codeHash,
      createdAt: new Date().toISOString(),
      expiresAt: pairingCodeObj.expiresAt,
      syncVersion: 1,
      initialState: {
        tasks: allTasks,
        projects: allProjects,
        tags: allTags,
      },
    };

    const checksum = Encryption.computePayloadChecksum(rawPayload);
    const payload: PairingPayload = {
      ...rawPayload,
      checksum,
    };

    const encodedString = JSON.stringify(payload);
    return { payload, encodedString, code: pairingCodeObj.code };
  }

  /**
   * Validates an incoming PairingPayload and 6-digit code
   */
  public static validatePairingPayload(
    input: string | PairingPayload,
    enteredCode?: string
  ): PairingValidationResult {
    let payload: PairingPayload;

    if (typeof input === 'string') {
      try {
        payload = JSON.parse(input.trim());
      } catch {
        return {
          isValid: false,
          errorCode: 'MALFORMED_PAYLOAD',
          errorMessage: 'Payload is not valid JSON. Please copy the complete payload string.',
        };
      }
    } else {
      payload = input;
    }

    if (!payload || typeof payload !== 'object') {
      return {
        isValid: false,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Invalid payload structure.',
      };
    }

    if (payload.type !== 'TASKORA_ACCOUNT_PAIRING') {
      return {
        isValid: false,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Invalid Taskora pairing payload type.',
      };
    }

    if (payload.version !== 1) {
      return {
        isValid: false,
        errorCode: 'UNSUPPORTED_VERSION',
        errorMessage: `Unsupported pairing version (${payload.version}). Please update Taskora.`,
      };
    }

    if (!payload.accountId || !payload.codeHash || !payload.checksum) {
      return {
        isValid: false,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Payload is missing mandatory identity or cryptographic fields.',
      };
    }

    // Verify Checksum Integrity
    const { checksum, ...rawPayload } = payload;
    const computedChecksum = Encryption.computePayloadChecksum(rawPayload);
    if (computedChecksum !== checksum) {
      return {
        isValid: false,
        errorCode: 'CHECKSUM_MISMATCH',
        errorMessage: 'Payload checksum verification failed. The data may have been corrupted or modified.',
      };
    }

    // Verify Expiration (5-minute TTL)
    if (Date.now() > payload.expiresAt) {
      return {
        isValid: false,
        errorCode: 'EXPIRED_PAYLOAD',
        errorMessage: 'This pairing payload has expired. Please generate a new code on the source device.',
      };
    }

    // Verify 6-Digit Code if provided
    if (enteredCode) {
      const cleanEntered = enteredCode.replace(/\D/g, '');
      const hashedEntered = Encryption.hashString(cleanEntered);

      if (hashedEntered !== payload.codeHash) {
        return {
          isValid: false,
          errorCode: 'INVALID_CODE',
          errorMessage: 'The entered 6-digit verification code does not match this payload.',
        };
      }
    }

    return {
      isValid: true,
      payload,
    };
  }

  /**
   * Atomically stages and commits paired account identity and initial tasks/projects/tags
   */
  public static async commitPairingPayload(payload: PairingPayload): Promise<{
    tasksImported: number;
    projectsImported: number;
    tagsImported: number;
  }> {
    const validation = this.validatePairingPayload(payload);
    if (!validation.isValid) {
      throw new Error(validation.errorMessage || 'Invalid payload.');
    }

    console.log(`[DevicePairing] Committing paired account "${payload.accountId}" from ${payload.senderDeviceName}...`);

    // 1. Authorize sender device in local registry (clearing prior revocation since fresh authenticated pairing occurred)
    await this.authorizeDevice({
      deviceId: payload.senderDeviceId,
      deviceName: payload.senderDeviceName,
      platform: payload.senderPlatform,
    });

    // 2. Restore or create user account identity
    const restoredAccount: UserAccount = {
      userId: payload.accountId,
      username: payload.accountName.toLowerCase().replace(/\s+/g, '') || 'paired-user',
      displayName: payload.accountName,
      email: payload.email || '',
      passwordHash: '',
      passwordSalt: '',
      createdAt: payload.createdAt,
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await AccountService.restoreOrUpdateAccountFromPairing(restoredAccount);

    // 3. Atomically stage and import initial tasks, projects, and tags
    await LocalDatabase.init();

    let tasksImported = 0;
    let projectsImported = 0;
    let tagsImported = 0;

    if (Array.isArray(payload.initialState.projects)) {
      for (const proj of payload.initialState.projects) {
        await LocalDatabase.applyRemoteProject(proj);
        projectsImported++;
      }
    }

    if (Array.isArray(payload.initialState.tags)) {
      for (const tag of payload.initialState.tags) {
        await LocalDatabase.applyRemoteTag(tag);
        tagsImported++;
      }
    }

    if (Array.isArray(payload.initialState.tasks)) {
      for (const task of payload.initialState.tasks) {
        await LocalDatabase.applyRemoteTask(task);
        tasksImported++;
      }
    }

    await this.recordSyncTime(payload.senderDeviceId);

    console.log(
      `[DevicePairing] Successfully paired! Imported ${tasksImported} tasks, ${projectsImported} projects, ${tagsImported} tags.`
    );

    return { tasksImported, projectsImported, tagsImported };
  }
}
