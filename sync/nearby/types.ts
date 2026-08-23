import { PlatformType, SyncPayload, SyncStatus } from '../types';

export const CURRENT_NEARBY_PROTOCOL_VERSION = 2;
export const MIN_NEARBY_PROTOCOL_VERSION = 1;

export type ProximityLevel = 'UNKNOWN' | 'FAR' | 'NEAR' | 'VERY_NEAR';

export type MotionState = 'IDLE' | 'MOVING' | 'PEAK_DETECTED' | 'BUMP_CANDIDATE';

export type TransferDirection = 'SEND' | 'RECEIVE' | 'BIDIRECTIONAL';

export type NearbySessionState =
  | 'IDLE'
  | 'SEARCHING'
  | 'SCANNING'
  | 'DEVICE_FOUND'
  | 'APPROACHING'
  | 'PROXIMITY_CHECK'
  | 'BUMP_DETECTED'
  | 'PAIRING'
  | 'VERIFYING'
  | 'CONNECTING'
  | 'SYNC_NEGOTIATION'
  | 'PREPARING_TRANSFER'
  | 'TRANSFERRING'
  | 'MERGING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'TIMEOUT'
  | 'ERROR';

export interface NearbyDevice {
  deviceId: string;
  deviceName: string;
  platform: PlatformType;
  rssi: number;
  smoothedRssi: number;
  proximity: ProximityLevel;
  lastSeen: number;
  protocolVersion: number;
  capabilityFlags: number;
  isSimulated?: boolean;
}

export interface NearbyCapabilityResult {
  supported: boolean;
  bluetooth: boolean;
  motionSensors: boolean;
  nearbyTransport: boolean;
  platform: PlatformType;
  reason?: string;
}

export type NearbyPermissionStatus =
  | 'granted'
  | 'denied'
  | 'permanently_denied'
  | 'restricted'
  | 'unavailable'
  | 'bluetooth_off';

export interface MotionPeakEvent {
  timestamp: number;
  magnitude: number;
  isPeak: boolean;
}

export interface NearbyHandshakeMessage {
  type: 'HANDSHAKE_INIT' | 'HANDSHAKE_ACK' | 'HANDSHAKE_REJECT';
  protocolVersion: number;
  senderDeviceId: string;
  senderDeviceName: string;
  senderPlatform: PlatformType;
  nonce: string;
  ephemeralKey: string;
  verificationCodeHash: string;
  timestamp: string;
  reason?: string;
}

export interface NearbySyncNegotiation {
  type: 'SYNC_NEGOTIATE' | 'SYNC_NEGOTIATE_ACK';
  deviceId: string;
  protocolVersion: number;
  syncVersion: number;
  lamportClock: number;
  lastSyncTimestamp?: string;
  tombstonesCount: number;
  pendingOpsCount: number;
}

export interface NearbyTransferChunk {
  batchId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  data: string;
  chunkChecksum: string;
}

export interface NearbyTransferMessage {
  type: 'TRANSFER_CHUNK' | 'TRANSFER_ACK' | 'TRANSFER_ERROR';
  batchId: string;
  chunkIndex?: number;
  totalChunks?: number;
  chunk?: NearbyTransferChunk;
  checksum?: string;
  errorMessage?: string;
}

export interface NearbyVerificationContext {
  code: string; // 6-digit numeric string formatted e.g. "483 921"
  rawCode: string; // unformatted "483921"
  peerDeviceId: string;
  peerDeviceName: string;
  peerPlatform: PlatformType;
  expiresAt: number;
}

export interface NearbySessionSummary {
  appliedCount: number;
  conflictsResolved: number;
  peerDeviceName: string;
  peerDeviceId: string;
  durationMs: number;
  timestamp: string;
  tasksMerged?: number;
  projectsUpdated?: number;
}

export type NearbySimulationScenario =
  | 'SUCCESS_INSTANT'
  | 'SUCCESS_WITH_BUMP'
  | 'SUCCESS_WITH_VERIFY'
  | 'WRONG_CODE'
  | 'TIMEOUT'
  | 'CONNECTION_LOST'
  | 'PROTOCOL_MISMATCH'
  | 'MALFORMED_PAYLOAD'
  | 'DISABLED';
