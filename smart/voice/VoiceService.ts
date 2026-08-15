import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
export type MicrophonePermissionStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

export interface VoiceResult {
  text: string;
  isFinal: boolean;
}

export class VoiceService {
  private static recognitionInstance: any = null;
  private static isListeningState: boolean = false;

  /**
   * Checks current microphone permission status without triggering a prompt
   */
  public static async checkPermission(): Promise<MicrophonePermissionStatus> {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return hasPermission ? 'granted' : 'undetermined';
      } catch (e) {
        console.warn('[VoiceService] Error checking Android permission:', e);
        return 'undetermined';
      }
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const status = await (navigator.permissions as any).query({ name: 'microphone' });
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'blocked';
        return 'undetermined';
      } catch {
        return 'undetermined';
      }
    }

    return 'granted';
  }

  /**
   * Prompts the user for microphone recording permission on Android / Native
   */
  public static async requestPermission(): Promise<MicrophonePermissionStatus> {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Taskora needs access to your microphone to capture tasks by voice.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          return 'granted';
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return 'blocked';
        } else {
          return 'denied';
        }
      } catch (e) {
        console.warn('[VoiceService] Error requesting Android permission:', e);
        return 'denied';
      }
    }

    return 'granted';
  }

  /**
   * Opens Android Application Settings if permissions were permanently denied
   */
  public static async openSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        await Linking.openSettings();
      }
    } catch (e) {
      console.warn('[VoiceService] Could not open app settings:', e);
    }
  }

  public static isSupported(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    return true;
  }

  /**
   * Starts speech listening. Pre-condition: caller must ensure permission is granted.
   */
  public static startListening(
    onResult: (result: VoiceResult) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): boolean {
    if (this.isListeningState) {
      this.stopListening();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
            }
            const isFinal = event.results[event.results.length - 1]?.isFinal ?? true;
            onResult({ text: transcript, isFinal });
          };

          recognition.onerror = (event: any) => {
            console.warn('[VoiceService] Speech recognition error:', event.error);
            this.isListeningState = false;
            onError(event.error || 'Speech recognition failed');
          };

          recognition.onend = () => {
            this.isListeningState = false;
            onEnd();
          };

          recognition.start();
          this.recognitionInstance = recognition;
          this.isListeningState = true;
          return true;
        } catch (e: any) {
          onError(e.message || 'Could not start speech recognition');
          return false;
        }
      }
    }

    // Native simulation / fallback
    this.isListeningState = true;
    return true;
  }

  public static stopListening(): void {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {}
      this.recognitionInstance = null;
    }
    this.isListeningState = false;
  }

  public static isListening(): boolean {
    return this.isListeningState;
  }
}
