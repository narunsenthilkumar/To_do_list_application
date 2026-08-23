export interface UpdateManifest {
  latestVersion: string; // e.g., "2.4.0"
  versionCode: number; // e.g., 240
  minimumSupportedVersion?: string; // e.g., "2.0.0"
  releaseDate: string; // e.g., "2026-08-22"
  title: string; // e.g., "Taskora 2.4.0 Release"
  releaseNotes: string[];
  downloadUrl: string; // Direct APK HTTPS download link
  sha256?: string; // SHA-256 checksum for verification
  mandatory?: boolean;
  sizeBytes?: number;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'update_available'
  | 'downloading'
  | 'verifying'
  | 'ready_to_install'
  | 'installing'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  manifest: UpdateManifest | null;
  isMandatory: boolean;
  downloadProgress: number; // 0 to 100
  downloadedFileUri: string | null;
  errorMessage: string | null;
  lastCheckedAt: number | null;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  isMandatory: boolean;
  manifest: UpdateManifest | null;
  error?: string;
}
