import { IVoiceEngine, MicrophoneDiagnostics, MicrophonePermissionStatus, VoiceResult } from './types';

export class WindowsVoiceEngine implements IVoiceEngine {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private listening: boolean = false;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private animFrameId: number | null = null;
  private unsubscribers: Array<() => void> = [];
  private lastError: string | null = null;

  private isElectron(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).electronAPI?.voice)
    );
  }

  async checkPermission(): Promise<MicrophonePermissionStatus> {
    console.log('[MIC] Checking Windows microphone permission...');
    if (this.isElectron()) {
      try {
        const res = await (window as any).electronAPI.voice.checkPermission();
        console.log('[MIC] Electron checkPermission response:', res);
        return res;
      } catch (err) {
        console.warn('[MIC] Electron checkPermission error:', err);
        return 'granted';
      }
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return 'undetermined';
    }

    try {
      if ((navigator as any).permissions?.query) {
        const status = await (navigator as any).permissions.query({ name: 'microphone' });
        console.log('[MIC] Browser permissions.query result:', status.state);
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'blocked';
      }
    } catch {}

    return 'granted';
  }

  async requestPermission(): Promise<MicrophonePermissionStatus> {
    console.log('[MIC] Requesting microphone access via getUserMedia...');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.lastError = 'Microphone API unavailable in this environment.';
      return 'denied';
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[MIC] getUserMedia success during permission request');
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (err: any) {
      console.warn('[MIC ERROR] getUserMedia permission error:', err);
      this.lastError = err.message || 'Permission denied';
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
    this.recordedChunks = [];
    this.lastError = null;

    console.log('[MIC] Starting Windows microphone capture pipeline...');

    // 1. Acquire microphone MediaStream
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        console.log('[MIC] Invoking getUserMedia with acoustic processing...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const audioTracks = stream.getAudioTracks();
        console.log(`[MIC] getUserMedia acquired ${audioTracks.length} audio track(s).`);

        if (audioTracks.length === 0) {
          throw new Error('No audio tracks detected in microphone stream.');
        }

        const primaryTrack = audioTracks[0];
        console.log(`[MIC] Primary audio track label: "${primaryTrack.label}", state: "${primaryTrack.readyState}"`);

        if (primaryTrack.readyState !== 'live') {
          console.warn('[MIC ERROR] Audio track is not live:', primaryTrack.readyState);
        }

        this.mediaStream = stream;

        // Initialize AudioContext & Analyser for real-time acoustic volume metering
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;

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
          console.log('[MIC] Audio analyser & acoustic visualizer running.');
        }

        // Initialize MediaRecorder for recording
        if (typeof MediaRecorder !== 'undefined') {
          const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
          ];
          let selectedMime = '';
          for (const mime of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mime)) {
              selectedMime = mime;
              break;
            }
          }

          console.log(`[MIC] Selected MediaRecorder MIME format: "${selectedMime || 'default'}"`);
          const recorderOptions = selectedMime ? { mimeType: selectedMime } : undefined;
          const recorder = new MediaRecorder(stream, recorderOptions);

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              this.recordedChunks.push(event.data);
            }
          };

          recorder.start(250);
          this.mediaRecorder = recorder;
          console.log('[MIC] MediaRecorder actively recording.');
        }
      } catch (err: any) {
        console.error('[MIC ERROR] Microphone acquisition failed:', err);
        this.lastError = err.message || 'Microphone acquisition failed';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          onError('Microphone permission was denied. Allow Taskora in Windows settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          onError('No microphone was detected on this device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          onError('Microphone is already in use by another application.');
        } else {
          onError(err.message || 'Microphone is currently unavailable.');
        }
        this.stopListening();
        return false;
      }
    }

    // 2. Start Speech Recognition
    if (this.isElectron()) {
      console.log('[STT] Using Windows Native Speech Recognition via Electron IPC...');
      const electronVoice = (window as any).electronAPI.voice;

      const unResult = electronVoice.onResult((res: VoiceResult) => {
        if (!this.listening) return;
        console.log('[STT] Transcription event:', res);
        onResult(res);
      });

      const unError = electronVoice.onError((err: string) => {
        if (!this.listening) return;
        console.warn('[STT ERROR] Electron voice error:', err);
        this.lastError = err;
        onError(err);
      });

      const unEnd = electronVoice.onEnd(() => {
        console.log('[STT] Electron voice worker ended.');
        if (this.listening) {
          this.listening = false;
          this.cleanupUnsubscribers();
          onEnd();
        }
      });

      const unVolume = electronVoice.onVolume((lvl: number) => {
        if (!this.listening) return;
        if (this.audioLevelCallback) {
          this.audioLevelCallback(lvl);
        }
      });

      this.unsubscribers = [unResult, unError, unEnd, unVolume];

      try {
        await electronVoice.startListening();
        return true;
      } catch (e: any) {
        console.error('[STT ERROR] Failed to start electron voice worker:', e);
        this.lastError = e.message || 'Failed to start speech recognition worker';
        onError('Failed to start Windows speech recognition.');
        return false;
      }
    }

    // 3. Fallback for Windows Browsers (Web Speech API)
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          console.log('[STT] Starting browser SpeechRecognition fallback...');
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
            console.warn('[STT ERROR] Browser recognition error:', event.error);
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
          return true;
        } catch (e: any) {
          console.warn('[STT ERROR] Speech recognition start exception:', e);
        }
      }
    }

    return true;
  }

  private cleanupUnsubscribers(): void {
    for (const unsub of this.unsubscribers) {
      try {
        unsub();
      } catch {}
    }
    this.unsubscribers = [];
  }

  stopListening(): void {
    console.log('[MIC] Stopping microphone capture and releasing resources...');
    this.listening = false;

    if (this.isElectron()) {
      try {
        (window as any).electronAPI.voice.stopListening();
      } catch {}
    }

    this.cleanupUnsubscribers();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`[MIC] Stopped audio track: ${track.label}`);
        });
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

  async openSettings(): Promise<void> {
    if (this.isElectron()) {
      try {
        await (window as any).electronAPI.voice.openSettings();
      } catch (err) {
        console.warn('[MIC] Failed to open Windows settings via IPC:', err);
      }
    }
  }

  isSupported(): boolean {
    return true;
  }

  async getDiagnostics(): Promise<MicrophoneDiagnostics> {
    const isElec = this.isElectron();
    const mediaDevicesAvail = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
    const getUserMediaAvail = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

    let permissionStatus: MicrophonePermissionStatus = 'undetermined';
    try {
      permissionStatus = await this.checkPermission();
    } catch {}

    let audioInputDevicesCount = 0;
    if (mediaDevicesAvail && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioInputDevicesCount = devices.filter((d) => d.kind === 'audioinput').length;
      } catch {}
    }

    const mediaRecorderAvail = typeof MediaRecorder !== 'undefined';
    let supportedMime: string | null = null;
    if (mediaRecorderAvail) {
      for (const mime of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
        if (MediaRecorder.isTypeSupported(mime)) {
          supportedMime = mime;
          break;
        }
      }
    }

    const speechRecAvail =
      isElec ||
      (typeof window !== 'undefined' &&
        Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

    return {
      platform: isElec ? 'Windows (Electron)' : 'Windows (Web Browser)',
      isElectron: isElec,
      mediaDevicesAvailable: mediaDevicesAvail,
      getUserMediaAvailable: getUserMediaAvail,
      permissionStatus,
      audioInputDevicesCount,
      activeTrackState: this.mediaStream ? this.mediaStream.getAudioTracks()[0]?.readyState || null : null,
      mediaRecorderAvailable: mediaRecorderAvail,
      supportedMimeType: supportedMime,
      speechRecognitionAvailable: speechRecAvail,
      speechProvider: isElec ? 'Windows SAPI / System.Speech (Local)' : 'Web Speech API',
      lastError: this.lastError,
    };
  }
}
