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
  payload: Record<string, any>;
}

export interface DevicePairingInfo {
  deviceId: string;
  deviceName: string;
  platform: 'android' | 'windows' | 'web' | 'ios';
  pairedAt: string;
  lastSyncedAt?: string;
  authorized: boolean;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'conflict' | 'error';

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
