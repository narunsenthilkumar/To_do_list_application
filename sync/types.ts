export type SyncEntityType = 'task' | 'project' | 'tag' | 'focus_session' | 'settings';

export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

export interface SyncOperation {
  operationId: string;
  userId: string;
  deviceId: string;
  entityId: string;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  timestamp: string;
  version: number;
  lamportClock?: number;
  payload: Record<string, any>;
}

export type PlatformType = 'android' | 'windows' | 'web' | 'ios';

export interface DevicePairingInfo {
  deviceId: string;
  deviceName: string;
  platform: PlatformType;
  pairedAt: string;
  lastSyncedAt?: string;
  authorized: boolean;
  isCurrentDevice?: boolean;
}

export interface RevokedDeviceRecord {
  deviceId: string;
  deviceName: string;
  revokedAt: string;
  revokedByDeviceId: string;
  reason?: string;
}

export type SyncStatus =
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'conflict'
  | 'error'
  | 'device_revoked'
  | 'needs_pairing'
  | 'manual_required';

export type SyncEngineErrorCode =
  | 'NO_NETWORK'
  | 'AUTH_EXPIRED'
  | 'INVALID_PAIRING_CODE'
  | 'PAIRING_CODE_EXPIRED'
  | 'INVALID_PAYLOAD'
  | 'DEVICE_REVOKED'
  | 'SYNC_CONFLICT'
  | 'SYNC_TIMEOUT'
  | 'SYNC_FAILED'
  | 'DATA_CORRUPTION'
  | 'INVALID_ACCOUNT'
  | 'DUPLICATE_DEVICE'
  | 'CHECKSUM_MISMATCH';

export interface SyncPayload {
  batchId: string;
  senderDeviceId: string;
  senderDeviceName: string;
  userId: string;
  timestamp: string;
  operations: SyncOperation[];
  checksum: string;
}

export interface PairingCodePayload {
  code: string;
  deviceId: string;
  deviceName: string;
  userId: string;
  expiresAt: number;
}

export interface InitialStateSnapshot {
  tasks: any[];
  projects: any[];
  tags: any[];
  smartSettings?: Record<string, any>;
  themeMode?: string;
  timeFormat?: string;
}

export interface PairingPayload {
  version: number;
  type: 'TASKORA_ACCOUNT_PAIRING';
  accountId: string;
  accountName: string;
  email: string;
  senderDeviceId: string;
  senderDeviceName: string;
  senderPlatform: PlatformType;
  codeHash: string;
  createdAt: string;
  expiresAt: number;
  syncVersion: number;
  initialState: InitialStateSnapshot;
  checksum: string;
}

export type PairingValidationErrorCode =
  | 'INVALID_PAYLOAD'
  | 'EXPIRED_PAYLOAD'
  | 'INVALID_CODE'
  | 'ACCOUNT_NOT_FOUND'
  | 'UNSUPPORTED_VERSION'
  | 'MALFORMED_PAYLOAD'
  | 'CHECKSUM_MISMATCH'
  | 'DEVICE_REVOKED';

export interface PairingValidationResult {
  isValid: boolean;
  errorCode?: PairingValidationErrorCode;
  errorMessage?: string;
  payload?: PairingPayload;
}
