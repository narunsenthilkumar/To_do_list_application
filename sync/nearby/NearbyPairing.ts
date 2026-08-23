import { DeviceIdService } from '../DeviceIdService';
import { DevicePairing } from '../DevicePairing';
import {
  NearbyDevice,
  NearbyHandshakeMessage,
  NearbyVerificationContext,
  CURRENT_NEARBY_PROTOCOL_VERSION,
  MIN_NEARBY_PROTOCOL_VERSION,
} from './types';
import { NearbySecurity } from './NearbySecurity';

export class NearbyPairing {
  private static activeVerification: NearbyVerificationContext | null = null;
  private static currentNonce: string | null = null;

  /**
   * Initiates handshake with a discovered peer device
   */
  public static async createHandshakeInit(targetDevice: NearbyDevice): Promise<{
    message: NearbyHandshakeMessage;
    verificationContext: NearbyVerificationContext;
  }> {
    const myDeviceId = await DeviceIdService.getDeviceId();
    const myDeviceName = DeviceIdService.getDeviceName();
    const myPlatform = DeviceIdService.getPlatformType();

    const { raw, formatted } = NearbySecurity.generateVerificationCode();
    const nonce = NearbySecurity.generateNonce();
    this.currentNonce = nonce;

    const codeHash = NearbySecurity.computeCodeHash(raw, nonce);

    const verificationContext: NearbyVerificationContext = {
      code: formatted,
      rawCode: raw,
      peerDeviceId: targetDevice.deviceId,
      peerDeviceName: targetDevice.deviceName,
      peerPlatform: targetDevice.platform,
      expiresAt: Date.now() + 60000, // 60s validity window
    };

    this.activeVerification = verificationContext;

    const message: NearbyHandshakeMessage = {
      type: 'HANDSHAKE_INIT',
      protocolVersion: CURRENT_NEARBY_PROTOCOL_VERSION,
      senderDeviceId: myDeviceId,
      senderDeviceName: myDeviceName,
      senderPlatform: myPlatform,
      nonce,
      ephemeralKey: NearbySecurity.generateNonce(),
      verificationCodeHash: codeHash,
      timestamp: new Date().toISOString(),
    };

    return { message, verificationContext };
  }

  /**
   * Validates an incoming handshake message
   */
  public static validateHandshake(message: NearbyHandshakeMessage): {
    valid: boolean;
    errorCode?: string;
    errorMessage?: string;
  } {
    if (!message || !message.senderDeviceId || !message.senderDeviceName) {
      return { valid: false, errorCode: 'MALFORMED_HANDSHAKE', errorMessage: 'Malformed handshake packet received.' };
    }

    if (
      message.protocolVersion < MIN_NEARBY_PROTOCOL_VERSION ||
      message.protocolVersion > CURRENT_NEARBY_PROTOCOL_VERSION
    ) {
      return {
        valid: false,
        errorCode: 'PROTOCOL_VERSION_MISMATCH',
        errorMessage: `Incompatible Taskora protocol version (Peer: v${message.protocolVersion}, Local: v${CURRENT_NEARBY_PROTOCOL_VERSION}). Please update Taskora on both devices.`,
      };
    }

    return { valid: true };
  }

  /**
   * Confirms pairing and authorizes the peer device in persistent storage
   */
  public static async confirmPairing(
    peerDeviceId: string,
    peerDeviceName: string,
    peerPlatform: 'android' | 'windows' | 'web' | 'ios'
  ): Promise<boolean> {
    try {
      await DevicePairing.authorizeDevice({
        deviceId: peerDeviceId,
        deviceName: peerDeviceName,
        platform: peerPlatform,
      });
      this.clearActiveVerification();
      return true;
    } catch (e) {
      console.error('[NearbyPairing] Error authorizing peer device:', e);
      return false;
    }
  }

  public static getActiveVerification(): NearbyVerificationContext | null {
    if (this.activeVerification && Date.now() > this.activeVerification.expiresAt) {
      this.activeVerification = null;
    }
    return this.activeVerification;
  }

  public static clearActiveVerification(): void {
    this.activeVerification = null;
    this.currentNonce = null;
  }
}
