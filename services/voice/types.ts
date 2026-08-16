export type VoiceState = 'idle' | 'requesting_permission' | 'ready' | 'listening' | 'processing' | 'success' | 'error';
export type MicrophonePermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

export interface VoiceResult {
  text: string;
  isFinal: boolean;
}

export interface MicrophoneDiagnostics {
  platform: string;
  isElectron: boolean;
  mediaDevicesAvailable: boolean;
  getUserMediaAvailable: boolean;
  permissionStatus: MicrophonePermissionStatus;
  audioInputDevicesCount: number;
  activeTrackState: string | null;
  mediaRecorderAvailable: boolean;
  supportedMimeType: string | null;
  speechRecognitionAvailable: boolean;
  speechProvider: string;
  lastError: string | null;
}

export interface IVoiceEngine {
  checkPermission(): Promise<MicrophonePermissionStatus>;
  requestPermission(): Promise<MicrophonePermissionStatus>;
  startListening(
    onResult: (result: VoiceResult) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): Promise<boolean>;
  stopListening(): void;
  isListening(): boolean;
  setAudioLevelCallback(cb: ((level: number) => void) | null): void;
  openSettings(): Promise<void>;
  isSupported(): boolean;
  getDiagnostics?(): Promise<MicrophoneDiagnostics>;
}
