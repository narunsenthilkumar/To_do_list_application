import { Platform } from 'react-native';
import { VoiceService } from '../voice';
import { PermissionDetails, PermissionState } from './types';

export class MicrophonePermission {
  static async check(): Promise<PermissionDetails> {
    const now = Date.now();

    try {
      const status = await VoiceService.checkPermission();
      let state: PermissionState = 'UNKNOWN';
      if (status === 'granted') state = 'GRANTED';
      else if (status === 'blocked') state = 'BLOCKED';
      else if (status === 'denied') state = 'DENIED';

      return {
        type: 'microphone',
        state,
        canRequest: state === 'UNKNOWN' || state === 'DENIED',
        message: state === 'GRANTED' ? 'Microphone allowed' : 'Microphone access disabled',
        lastChecked: now,
      };
    } catch {
      return {
        type: 'microphone',
        state: 'UNKNOWN',
        canRequest: true,
        lastChecked: now,
      };
    }
  }

  static async request(): Promise<PermissionDetails> {
    const now = Date.now();

    try {
      const status = await VoiceService.requestPermission();
      let state: PermissionState = 'UNKNOWN';
      if (status === 'granted') state = 'GRANTED';
      else if (status === 'blocked') state = 'BLOCKED';
      else if (status === 'denied') state = 'DENIED';

      return {
        type: 'microphone',
        state,
        canRequest: state === 'UNKNOWN' || state === 'DENIED',
        message: state === 'GRANTED' ? 'Microphone allowed' : 'Microphone access denied',
        lastChecked: now,
      };
    } catch {
      return {
        type: 'microphone',
        state: 'DENIED',
        canRequest: false,
        lastChecked: now,
      };
    }
  }
}
