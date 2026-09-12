import { Platform } from 'react-native';
import {
  NearbySessionState,
  NearbyDevice,
  NearbyVerificationContext,
  NearbySessionSummary,
  NearbyTransferChunk,
  ProximityLevel,
  TransferDirection,
} from './types';
import { NearbyCapability } from './NearbyCapability';
import { NearbyPermissions } from './NearbyPermissions';
import { NearbyDiscovery } from './NearbyDiscovery';
import { NearbyTransport } from './NearbyTransport';
import { BluetoothTransport } from './BluetoothTransport';
import { MotionDetector } from './MotionDetector';
import { NearbyPairing } from './NearbyPairing';
import { NearbyTransfer } from './NearbyTransfer';
import { NearbySimulation } from './NearbySimulation';
import { DiagnosticsService } from '../../diagnostics/DiagnosticsService';

type StateListener = (state: NearbySessionState, detail?: string) => void;
type ProgressListener = (progressPercent: number, stageName: string) => void;
type DeviceListener = (device: NearbyDevice | null) => void;
type VerificationListener = (context: NearbyVerificationContext | null) => void;
type SummaryListener = (summary: NearbySessionSummary | null) => void;
type ProximityListener = (proximity: ProximityLevel) => void;

export class NearbySession {
  private state: NearbySessionState = 'IDLE';
  private targetDevice: NearbyDevice | null = null;
  private verificationContext: NearbyVerificationContext | null = null;
  private summary: NearbySessionSummary | null = null;
  private errorMessage: string = '';
  private sessionStartTime: number = 0;
  private transferDirection: TransferDirection = 'BIDIRECTIONAL';

  private discovery: NearbyDiscovery = new NearbyDiscovery();
  private transport: NearbyTransport = new NearbyTransport();
  private motionDetector: MotionDetector = new MotionDetector();

  private receivedChunks: NearbyTransferChunk[] = [];
  private bleSubscription: any = null;

  private stateListeners: Set<StateListener> = new Set();
  private progressListeners: Set<ProgressListener> = new Set();
  private deviceListeners: Set<DeviceListener> = new Set();
  private verificationListeners: Set<VerificationListener> = new Set();
  private summaryListeners: Set<SummaryListener> = new Set();
  private proximityListeners: Set<ProximityListener> = new Set();

  private sessionTimeoutTimer: any = null;

  constructor() {
    this.setupDiscoveryListeners();
    this.setupMotionListeners();
    this.setupNativeGattListeners();
  }

  private setupNativeGattListeners(): void {
    if (Platform.OS === 'android') {
      try {
        const { NativeModules, NativeEventEmitter } = require('react-native');
        if (NativeModules.TaskoraBleModule) {
          const emitter = new NativeEventEmitter(NativeModules.TaskoraBleModule);
          this.bleSubscription = emitter.addListener(
            'onChunkReceived',
            async (event: { senderDeviceId: string; data: string }) => {
              try {
                const chunk: NearbyTransferChunk = JSON.parse(event.data);
                this.receivedChunks.push(chunk);

                // Auto-reassemble when all chunks for the batch arrive on receiver
                const batchChunks = this.receivedChunks.filter((c) => c.batchId === chunk.batchId);
                if (batchChunks.length >= chunk.totalChunks) {
                  const reassembled = BluetoothTransport.reassembleChunks(batchChunks, chunk.batchId);
                  if (reassembled.success && reassembled.data) {
                    const incomingPayload = JSON.parse(reassembled.data);
                    await NearbyTransfer.processIncomingPayload(
                      incomingPayload,
                      event.senderDeviceId || 'KIVENTA Peer',
                      Date.now()
                    );

                    // Reply back to sender with receiver's outgoing payload over GATT
                    const { chunks: replyChunks } = await NearbyTransfer.prepareOutgoingPayload();
                    await this.transport.sendChunks(replyChunks, event.senderDeviceId);
                  }
                }
              } catch (e) {
                console.warn('[NearbySession] Error handling GATT chunk on receiver:', e);
              }
            }
          );
        }
      } catch (e) {
        console.warn('[NearbySession] Error setting up GATT listeners:', e);
      }
    }
  }

  public getState(): NearbySessionState {
    return this.state;
  }

  public getTargetDevice(): NearbyDevice | null {
    return this.targetDevice;
  }

  public getProximity(): ProximityLevel {
    return this.targetDevice?.proximity || 'UNKNOWN';
  }

  public getVerificationContext(): NearbyVerificationContext | null {
    return this.verificationContext;
  }

  public getSummary(): NearbySessionSummary | null {
    return this.summary;
  }

  public getErrorMessage(): string {
    return this.errorMessage;
  }

  public getTransferDirection(): TransferDirection {
    return this.transferDirection;
  }

  /**
   * Starts a new Nearby Sync session
   */
  public async startSession(isSimulation: boolean = false): Promise<boolean> {
    this.cleanup();
    this.sessionStartTime = Date.now();
    this.errorMessage = '';
    this.summary = null;

    NearbySimulation.setSimulationActive(isSimulation);

    DiagnosticsService.log('info', 'sync', 'nearby_session_started', { isSimulation });

    // Step 1: Capability check
    if (!isSimulation) {
      const caps = await NearbyCapability.getCapabilities();
      if (!caps.supported) {
        this.setError(caps.reason || 'Nearby Sync is not supported on this device.');
        return false;
      }

      // Step 2: Permissions check
      const permStatus = await NearbyPermissions.checkPermissions();
      if (permStatus !== 'granted') {
        const requested = await NearbyPermissions.requestPermissions();
        if (requested !== 'granted') {
          DiagnosticsService.log('warn', 'sync', 'nearby_permission_denied');
          this.setError('Bluetooth and location permissions are required to discover nearby devices.');
          return false;
        }
      }
    }

    this.setState('SEARCHING');
    this.notifyProgress(10, 'Looking for nearby KIVENTA devices...');

    // Start motion detector
    await this.motionDetector.start();

    // Start discovery
    if (isSimulation) {
      this.runSimulationFlow();
    } else {
      await this.discovery.startScanning(25000);
    }

    return true;
  }

  /**
   * Manually triggers or simulates a physical bump
   */
  public triggerBump(): void {
    if (this.targetDevice && (this.state === 'DEVICE_FOUND' || this.state === 'APPROACHING' || this.state === 'PROXIMITY_CHECK' || this.state === 'SEARCHING' || this.state === 'SCANNING')) {
      this.motionDetector.triggerManualBump();
    }
  }

  /**
   * Connects to a selected or detected device
   */
  public async connectToDevice(device: NearbyDevice): Promise<void> {
    this.targetDevice = device;
    this.notifyDevice(device);

    this.setState('PAIRING');
    this.notifyProgress(35, `Connecting with ${device.deviceName}...`);

    try {
      if (!device.isSimulated) {
        await this.transport.connect(device);
      }

      const { message, verificationContext } = await NearbyPairing.createHandshakeInit(device);

      if (!device.isSimulated) {
        await this.transport.sendHandshake(device.deviceId, JSON.stringify(message));
      }

      this.verificationContext = verificationContext;
      this.notifyVerification(verificationContext);

      this.setState('VERIFYING');
      this.notifyProgress(50, 'Confirming verification code...');
    } catch (err: any) {
      this.setError(`Pairing handshake failed: ${err.message}`);
    }
  }

  /**
   * Confirms verification code and proceeds to transactional sync
   */
  public async confirmVerification(inputCode?: string): Promise<void> {
    if (!this.targetDevice || !this.verificationContext) {
      this.setError('No active verification context.');
      return;
    }

    const scenario = NearbySimulation.getScenario();
    if (NearbySimulation.isSimulation() && scenario === 'WRONG_CODE') {
      this.setError('Verification code mismatch. Pairing cancelled for security.');
      return;
    }

    this.setState('CONNECTING');
    this.notifyProgress(60, 'Secure connection established');

    try {
      await NearbyPairing.confirmPairing(
        this.targetDevice.deviceId,
        this.targetDevice.deviceName,
        this.targetDevice.platform
      );

      this.setState('PREPARING_TRANSFER');
      this.notifyProgress(70, 'Preparing your tasks...');

      this.setState('TRANSFERRING');
      this.notifyProgress(80, 'Transferring changes...');

      let incomingPayload;
      if (NearbySimulation.isSimulation()) {
        incomingPayload = NearbySimulation.createSimulatedPayload(
          this.targetDevice.deviceId,
          this.targetDevice.deviceName
        );
      } else {
        const { payload, chunks } = await NearbyTransfer.prepareOutgoingPayload();
        await this.transport.sendChunks(chunks, this.targetDevice.deviceId);

        // Wait briefly for peer response chunks to arrive over GATT if bidirectional
        if (this.receivedChunks.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        if (this.receivedChunks.length > 0) {
          const batchId = this.receivedChunks[0]?.batchId || payload.batchId;
          const reassembled = BluetoothTransport.reassembleChunks(this.receivedChunks, batchId);
          if (reassembled.success && reassembled.data) {
            incomingPayload = JSON.parse(reassembled.data);
          } else {
            incomingPayload = payload;
          }
        } else {
          incomingPayload = payload;
        }
      }

      this.setState('MERGING');
      this.notifyProgress(95, 'Merging changes safely...');

      const summary = await NearbyTransfer.processIncomingPayload(
        incomingPayload,
        this.targetDevice.deviceName,
        this.sessionStartTime
      );

      this.summary = summary;
      this.notifySummary(summary);
      this.setState('COMPLETED');
      this.notifyProgress(100, 'Sync Complete');
    } catch (err: any) {
      this.setError(err.message || 'Sync transfer failed.');
    }
  }

  /**
   * Cancels active session
   */
  public cancelSession(): void {
    DiagnosticsService.log('info', 'sync', 'nearby_session_cancelled');
    this.cleanup();
    this.setState('CANCELLED', 'Nearby Sync cancelled');
  }

  /**
   * Internal simulation runner
   */
  private runSimulationFlow(): void {
    const scenario = NearbySimulation.getScenario();

    setTimeout(() => {
      if (this.state !== 'SEARCHING' && this.state !== 'SCANNING') return;

      if (scenario === 'TIMEOUT') {
        this.setState('TIMEOUT');
        this.setError('No nearby KIVENTA device found');
        return;
      }

      const simDevice = NearbySimulation.createSimulatedDevice();
      this.targetDevice = simDevice;
      this.notifyDevice(simDevice);
      this.notifyProximity(simDevice.proximity);
      this.setState('DEVICE_FOUND');
      this.notifyProgress(30, 'KIVENTA device found');

      if (scenario === 'SUCCESS_WITH_BUMP') {
        setTimeout(() => {
          if (this.state === 'DEVICE_FOUND' || this.state === 'APPROACHING') {
            this.motionDetector.triggerManualBump();
          }
        }, 1200);
      } else if (scenario === 'SUCCESS_INSTANT') {
        setTimeout(() => {
          if (this.state === 'DEVICE_FOUND') {
            this.connectToDevice(simDevice).then(() => {
              this.confirmVerification();
            });
          }
        }, 800);
      }
    }, 1500);
  }

  private setupDiscoveryListeners(): void {
    this.discovery.onDeviceDiscovered((device) => {
      if (this.state === 'SEARCHING' || this.state === 'SCANNING') {
        this.targetDevice = device;
        this.notifyDevice(device);
        this.notifyProximity(device.proximity);
        this.setState('DEVICE_FOUND');
        this.notifyProgress(30, 'KIVENTA device found');
      }
    });

    this.discovery.onDeviceUpdated((device) => {
      if (this.targetDevice?.deviceId === device.deviceId) {
        this.targetDevice = device;
        this.notifyDevice(device);
        this.notifyProximity(device.proximity);

        if (this.state === 'DEVICE_FOUND' && device.proximity === 'VERY_NEAR') {
          this.setState('APPROACHING');
        }
      }
    });

    this.discovery.onScanTimeout(() => {
      if (this.state === 'SEARCHING' || this.state === 'SCANNING') {
        this.setState('TIMEOUT');
        this.setError('No nearby KIVENTA device found');
      }
    });
  }

  private setupMotionListeners(): void {
    this.motionDetector.addListener((motionState) => {
      if (
        motionState === 'BUMP_CANDIDATE' &&
        this.targetDevice &&
        (this.state === 'DEVICE_FOUND' ||
          this.state === 'APPROACHING' ||
          this.state === 'PROXIMITY_CHECK' ||
          this.state === 'SEARCHING' ||
          this.state === 'SCANNING')
      ) {
        this.setState('BUMP_DETECTED');
        this.notifyProgress(40, 'Bump detected');

        // Short Apple-inspired impact window (~450ms) then transition to pairing / verification
        setTimeout(() => {
          if (this.targetDevice) {
            this.connectToDevice(this.targetDevice);
          }
        }, 450);
      }
    });
  }

  private setState(newState: NearbySessionState, detail?: string): void {
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState, detail));
  }

  private setError(msg: string): void {
    this.errorMessage = msg;
    this.setState('ERROR', msg);
    DiagnosticsService.log('error', 'sync', 'nearby_session_error', { message: msg });
  }

  private notifyProgress(percent: number, stage: string): void {
    this.progressListeners.forEach((l) => l(percent, stage));
  }

  private notifyDevice(device: NearbyDevice | null): void {
    this.deviceListeners.forEach((l) => l(device));
  }

  private notifyVerification(context: NearbyVerificationContext | null): void {
    this.verificationListeners.forEach((l) => l(context));
  }

  private notifySummary(summary: NearbySessionSummary | null): void {
    this.summaryListeners.forEach((l) => l(summary));
  }

  private notifyProximity(prox: ProximityLevel): void {
    this.proximityListeners.forEach((l) => l(prox));
  }

  public cleanup(): void {
    this.discovery.stopScanning();
    this.transport.disconnect();
    this.motionDetector.stop();
    this.receivedChunks = [];
    if (this.bleSubscription) {
      this.bleSubscription.remove();
      this.bleSubscription = null;
    }
    NearbyPairing.clearActiveVerification();
    if (this.sessionTimeoutTimer) {
      clearTimeout(this.sessionTimeoutTimer);
      this.sessionTimeoutTimer = null;
    }
  }

  // Subscription methods
  public onStateChange(l: StateListener): () => void {
    this.stateListeners.add(l);
    l(this.state);
    return () => this.stateListeners.delete(l);
  }

  public onProgress(l: ProgressListener): () => void {
    this.progressListeners.add(l);
    return () => this.progressListeners.delete(l);
  }

  public onDevice(l: DeviceListener): () => void {
    this.deviceListeners.add(l);
    l(this.targetDevice);
    return () => this.deviceListeners.delete(l);
  }

  public onVerification(l: VerificationListener): () => void {
    this.verificationListeners.add(l);
    l(this.verificationContext);
    return () => this.verificationListeners.delete(l);
  }

  public onSummary(l: SummaryListener): () => void {
    this.summaryListeners.add(l);
    l(this.summary);
    return () => this.summaryListeners.delete(l);
  }

  public onProximityChange(l: ProximityListener): () => void {
    this.proximityListeners.add(l);
    l(this.getProximity());
    return () => this.proximityListeners.delete(l);
  }
}
