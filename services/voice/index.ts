import { Platform } from 'react-native';
import { IVoiceEngine, MicrophonePermissionStatus, VoiceResult, VoiceState } from './types';
import { AndroidVoiceEngine } from './android';
import { WindowsVoiceEngine } from './windows';
import { WebVoiceEngine } from './web';

export * from './types';

function createEngine(): IVoiceEngine {
  if (Platform.OS === 'android') {
    return new AndroidVoiceEngine();
  }
  if (
    Platform.OS === 'windows' ||
    (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) ||
    (typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent || ''))
  ) {
    return new WindowsVoiceEngine();
  }
  return new WebVoiceEngine();
}

const engine: IVoiceEngine = createEngine();

export class VoiceService {
  public static checkPermission(): Promise<MicrophonePermissionStatus> {
    return engine.checkPermission();
  }

  public static requestPermission(): Promise<MicrophonePermissionStatus> {
    return engine.requestPermission();
  }

  public static startListening(
    onResult: (result: VoiceResult) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): Promise<boolean> {
    return engine.startListening(onResult, onError, onEnd);
  }

  public static stopListening(): void {
    engine.stopListening();
  }

  public static isListening(): boolean {
    return engine.isListening();
  }

  public static setAudioLevelCallback(cb: ((level: number) => void) | null): void {
    engine.setAudioLevelCallback(cb);
  }

  public static openSettings(): Promise<void> {
    return engine.openSettings();
  }

  public static isSupported(): boolean {
    return engine.isSupported();
  }

  public static async getDiagnostics(): Promise<any> {
    if (engine.getDiagnostics) {
      return engine.getDiagnostics();
    }
    return {
      platform: Platform.OS,
      isElectron: false,
      mediaDevicesAvailable: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
      getUserMediaAvailable: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
      permissionStatus: await engine.checkPermission(),
      audioInputDevicesCount: 1,
      activeTrackState: null,
      mediaRecorderAvailable: typeof MediaRecorder !== 'undefined',
      supportedMimeType: 'audio/webm',
      speechRecognitionAvailable: true,
      speechProvider: Platform.OS === 'android' ? 'Android SpeechRecognizer' : 'Web Speech API',
      lastError: null,
    };
  }
}
