export type PermissionType = 'notifications' | 'bluetooth' | 'microphone' | 'alarms' | 'nearby';

export type PermissionState =
  | 'UNKNOWN'
  | 'GRANTED'
  | 'DENIED'
  | 'BLOCKED'
  | 'RESTRICTED'
  | 'UNAVAILABLE';

export interface PermissionDetails {
  type: PermissionType;
  state: PermissionState;
  canRequest: boolean;
  message?: string;
  lastChecked: number;
}

export type PermissionStatusMap = Record<PermissionType, PermissionDetails>;

export type PermissionChangeListener = (statusMap: PermissionStatusMap) => void;
