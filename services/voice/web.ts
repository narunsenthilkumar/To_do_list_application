import { IVoiceEngine, MicrophonePermissionStatus, VoiceResult } from './types';

export class WebVoiceEngine implements IVoiceEngine {
  private mediaStream: any = null;
  private audioContext: any = null;
  private recognitionInstance: any = null;
  private listening: boolean = false;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private animFrameId: any = null;

  async checkPermission(): Promise<MicrophonePermissionStatus> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return 'undetermined';
    }
    try {
      if ((navigator as any).permissions?.query) {
        const status = await (navigator as any).permissions.query({ name: 'microphone' });
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'blocked';
      }
    } catch {}
    return 'undetermined';
  }

  async requestPermission(): Promise<MicrophonePermissionStatus> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'denied';
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return 'blocked';
      }
      return 'denied';
    }
  }

  async startListening(
    onResult: (result: VoiceResult) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): Promise<boolean> {
    this.stopListening();
    this.listening = true;

    // Real-time microphone audio level sampling
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaStream = stream;

        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          this.audioContext = audioCtx;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const sampleAudio = () => {
            if (!this.listening) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
            if (this.audioLevelCallback) {
              this.audioLevelCallback(normalizedLevel);
            }
            this.animFrameId = requestAnimationFrame(sampleAudio);
          };
          this.animFrameId = requestAnimationFrame(sampleAudio);
        }
      } catch (err: any) {
        console.warn('[WebVoiceEngine] Audio stream error', err);
      }
    }

    if (typeof window !== 'undefined') {
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
            if (event.error !== 'network' && event.error !== 'service-not-allowed') {
              onError(event.error || 'Recognition error');
            }
          };

          recognition.onend = () => {
            if (this.listening) {
              this.listening = false;
              onEnd();
            }
          };

          recognition.start();
          this.recognitionInstance = recognition;
          return true;
        } catch (e: any) {
          console.warn('[WebVoiceEngine] Speech recognition start exception:', e);
        }
      }
    }

    return true;
  }

  stopListening(): void {
    this.listening = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {}
      this.recognitionInstance = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track: any) => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

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

  async openSettings(): Promise<void> {}

  isSupported(): boolean {
    if (typeof window !== 'undefined') {
      return (
        'webkitSpeechRecognition' in window ||
        'SpeechRecognition' in window ||
        ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices)
      );
    }
    return false;
  }
}
