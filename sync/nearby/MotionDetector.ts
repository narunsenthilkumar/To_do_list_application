import { Platform } from 'react-native';
import { MotionPeakEvent, MotionState } from './types';

export interface MotionDetectorConfig {
  peakThreshold: number;       // Magnitude threshold in g (default 1.8g)
  correlationWindowMs: number; // Duration a peak stays valid (default 1500ms)
  updateIntervalMs: number;    // Sensor sample interval (default 50ms)
}

export const DEFAULT_MOTION_CONFIG: MotionDetectorConfig = {
  peakThreshold: 1.8,
  correlationWindowMs: 1500,
  updateIntervalMs: 50,
};

type MotionListener = (state: MotionState, peakEvent?: MotionPeakEvent) => void;

export class MotionDetector {
  private config: MotionDetectorConfig;
  private isRunning: boolean = false;
  private sensorSubscription: any = null;
  private lastPeakTimestamp: number = 0;
  private currentState: MotionState = 'IDLE';
  private listeners: Set<MotionListener> = new Set();
  private isSensorAvailable: boolean = false;

  constructor(config: Partial<MotionDetectorConfig> = {}) {
    this.config = { ...DEFAULT_MOTION_CONFIG, ...config };
  }

  /**
   * Checks if accelerometer hardware is available on the current platform
   */
  public async checkAvailability(): Promise<boolean> {
    if (Platform.OS === 'web' || Platform.OS === 'windows') {
      this.isSensorAvailable = false;
      return false;
    }

    try {
      // Lazy load expo-sensors to prevent crash on unsupported runtimes
      const { Accelerometer } = require('expo-sensors');
      if (Accelerometer && typeof Accelerometer.isAvailableAsync === 'function') {
        this.isSensorAvailable = await Accelerometer.isAvailableAsync();
        return this.isSensorAvailable;
      }
      this.isSensorAvailable = false;
      return false;
    } catch {
      this.isSensorAvailable = false;
      return false;
    }
  }

  /**
   * Starts motion monitoring
   */
  public async start(): Promise<boolean> {
    if (this.isRunning) return true;

    const available = await this.checkAvailability();
    if (!available) {
      this.currentState = 'IDLE';
      this.notifyState('IDLE');
      return false;
    }

    try {
      const { Accelerometer } = require('expo-sensors');
      Accelerometer.setUpdateInterval(this.config.updateIntervalMs);

      this.sensorSubscription = Accelerometer.addListener(
        ({ x, y, z }: { x: number; y: number; z: number }) => {
          this.processAccelerometerSample(x, y, z);
        }
      );

      this.isRunning = true;
      this.currentState = 'IDLE';
      this.notifyState('IDLE');
      return true;
    } catch (err) {
      console.warn('[MotionDetector] Error starting accelerometer:', err);
      this.isRunning = false;
      return false;
    }
  }

  /**
   * Stops motion monitoring and cleans up listeners
   */
  public stop(): void {
    if (this.sensorSubscription) {
      try {
        this.sensorSubscription.remove();
      } catch {}
      this.sensorSubscription = null;
    }
    this.isRunning = false;
    this.currentState = 'IDLE';
    this.notifyState('IDLE');
  }

  /**
   * Subscribes to motion state events
   */
  public addListener(listener: MotionListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Manually triggers a bump event (useful for accessibility or simulation)
   */
  public triggerManualBump(): void {
    const now = Date.now();
    this.lastPeakTimestamp = now;
    const peakEvent: MotionPeakEvent = {
      timestamp: now,
      magnitude: 2.5,
      isPeak: true,
    };
    this.currentState = 'BUMP_CANDIDATE';
    this.notifyState('BUMP_CANDIDATE', peakEvent);
  }

  /**
   * Checks if a bump occurred within the correlation window
   */
  public hasRecentBump(): boolean {
    const now = Date.now();
    return now - this.lastPeakTimestamp <= this.config.correlationWindowMs;
  }

  /**
   * Processes a raw acceleration sample
   */
  private processAccelerometerSample(x: number, y: number, z: number): void {
    // Calculate total acceleration magnitude vector (in g)
    const totalMagnitude = Math.sqrt(x * x + y * y + z * z);
    // Dynamic acceleration excluding Earth gravity (1.0g)
    const dynamicMagnitude = Math.abs(totalMagnitude - 1.0);

    const now = Date.now();

    if (dynamicMagnitude >= this.config.peakThreshold) {
      this.lastPeakTimestamp = now;
      const peakEvent: MotionPeakEvent = {
        timestamp: now,
        magnitude: totalMagnitude,
        isPeak: true,
      };

      this.currentState = 'PEAK_DETECTED';
      this.notifyState('PEAK_DETECTED', peakEvent);

      // Transition to bump candidate
      this.currentState = 'BUMP_CANDIDATE';
      this.notifyState('BUMP_CANDIDATE', peakEvent);
    } else if (dynamicMagnitude > 0.3) {
      if (this.currentState !== 'MOVING' && !this.hasRecentBump()) {
        this.currentState = 'MOVING';
        this.notifyState('MOVING');
      }
    } else {
      if (!this.hasRecentBump() && this.currentState !== 'IDLE') {
        this.currentState = 'IDLE';
        this.notifyState('IDLE');
      }
    }
  }

  private notifyState(state: MotionState, peakEvent?: MotionPeakEvent): void {
    this.listeners.forEach((l) => l(state, peakEvent));
  }
}
