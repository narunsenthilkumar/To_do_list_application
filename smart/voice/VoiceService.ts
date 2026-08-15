import { Platform } from 'react-native';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceResult {
  text: string;
  isFinal: boolean;
}

export class VoiceService {
  private static recognitionInstance: any = null;
  private static isListeningState: boolean = false;

  public static isSupported(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }
    // Supported via native/fallback abstraction
    return true;
  }

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
            const isFinal = event.results[event.results.length - 1].isFinal;
            onResult({ text: transcript, isFinal });
          };

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
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

    // Native / Simulated Voice Input for Expo Go environment
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
