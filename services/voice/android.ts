import { PermissionsAndroid, Linking, Platform } from 'react-native';
import { IVoiceEngine, MicrophonePermissionStatus, VoiceResult } from './types';

function getSpeechModule(): any {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      const mod = require('expo-speech-recognition');
      return mod.ExpoSpeechRecognitionModule || mod;
    } catch {
      return null;
    }
  }
  return null;
}

export class AndroidVoiceEngine implements IVoiceEngine {
  private listening: boolean = false;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private subscriptions: Array<{ remove: () => void }> = [];

  async checkPermission(): Promise<MicrophonePermissionStatus> {
    if (Platform.OS !== 'android') return 'granted';
    const speechModule = getSpeechModule();
    try {
      if (speechModule?.getPermissionsAsync) {
        const res = await speechModule.getPermissionsAsync();
        if (res.granted) return 'granted';
        if (!res.canAskAgain && res.status === 'denied') return 'blocked';
      }

      const hasPerm = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      return hasPerm ? 'granted' : 'undetermined';
    } catch (e) {
      console.warn('[AndroidVoiceEngine] Permission check error', e);
      return 'undetermined';
    }
  }

  async requestPermission(): Promise<MicrophonePermissionStatus> {
    if (Platform.OS !== 'android') return 'granted';
    const speechModule = getSpeechModule();
    try {
      if (speechModule?.requestPermissionsAsync) {
        const res = await speechModule.requestPermissionsAsync();
        if (res.granted) return 'granted';
        if (!res.canAskAgain) return 'blocked';
        return 'denied';
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'KIVENTA requires microphone access to transcribe and create tasks from your voice.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Permission',
        }
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        return 'granted';
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return 'blocked';
      }
      return 'denied';
    } catch (e) {
      console.warn('[AndroidVoiceEngine] Permission request error', e);
      return 'denied';
    }
  }

  async startListening(
    onResult: (result: VoiceResult) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): Promise<boolean> {
    this.stopListening();

    const perm = await this.checkPermission();
    if (perm !== 'granted') {
      const req = await this.requestPermission();
      if (req !== 'granted') {
        onError(
          req === 'blocked'
            ? 'Microphone permission is blocked. Please allow it in Android Settings.'
            : 'Microphone permission is required for Voice Tasks.'
        );
        return false;
      }
    }

    this.listening = true;
    const speechModule = getSpeechModule();

    try {
      if (speechModule?.start) {
        // Subscribe to speech recognition events
        const resultSub = speechModule.addListener('result', (event: any) => {
          if (!this.listening) return;
          const transcript = event.results?.[0]?.transcript || '';
          if (transcript) {
            onResult({
              text: transcript,
              isFinal: event.isFinal ?? false,
            });
          }
        });

        const errorSub = speechModule.addListener('error', (event: any) => {
          if (!this.listening) return;
          console.warn('[AndroidVoiceEngine] Native recognition notice:', event.error, event.message);
          if (event.error === 'not-allowed') {
            onError('Microphone access not allowed.');
          } else if (event.error === 'no-speech' || event.error === 'speech-timeout') {
            // Harmless timeout when user finished speaking
            this.stopListening();
            onEnd();
          } else if (event.error !== 'aborted') {
            onError(event.message || 'Speech recognition error.');
          }
        });

        const endSub = speechModule.addListener('end', () => {
          if (this.listening) {
            this.listening = false;
            this.cleanupSubscriptions();
            onEnd();
          }
        });

        const volumeSub = speechModule.addListener('volumechange', (event: any) => {
          if (!this.listening) return;
          // Normalizes volume (RMS dB to 0-100 level)
          const value = typeof event.value === 'number' ? event.value : 0;
          const normalized = Math.min(100, Math.max(0, Math.round(((value + 2) / 12) * 100)));
          if (this.audioLevelCallback) {
            this.audioLevelCallback(normalized);
          }
        });

        this.subscriptions = [resultSub, errorSub, endSub, volumeSub];

        await speechModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: false,
          requiresOnDeviceRecognition: false,
          addsPunctuation: true,
        });

        return true;
      }
    } catch (err: any) {
      console.warn('[AndroidVoiceEngine] Native start exception:', err);
      onError(err.message || 'Failed to start microphone.');
      this.stopListening();
      return false;
    }

    return true;
  }

  private cleanupSubscriptions(): void {
    for (const sub of this.subscriptions) {
      try {
        sub.remove();
      } catch {}
    }
    this.subscriptions = [];
  }

  stopListening(): void {
    this.listening = false;
    const speechModule = getSpeechModule();

    if (speechModule?.stop) {
      try {
        speechModule.stop();
      } catch {}
    }

    this.cleanupSubscriptions();

    if (this.audioLevelCallback) {
      this.audioLevelCallback(0);
    }
  }

  isListening(): boolean {
    return this.listening;
  }

  setAudioLevelCallback(cb: ((level: number) => void) | null): void {
    this.audioLevelCallback = cb;
  }

  async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.warn('[AndroidVoiceEngine] Could not open settings', e);
    }
  }

  isSupported(): boolean {
    return true;
  }
}
