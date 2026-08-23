import { ProximityLevel } from './types';

export interface ProximityConfig {
  veryNearThreshold: number; // e.g. -55 dBm
  nearThreshold: number;     // e.g. -70 dBm
  smoothingAlpha: number;    // e.g. 0.4 (EMA weight)
  sampleWindowSize: number;  // e.g. 5 samples
}

export const DEFAULT_PROXIMITY_CONFIG: ProximityConfig = {
  veryNearThreshold: -55,
  nearThreshold: -70,
  smoothingAlpha: 0.4,
  sampleWindowSize: 5,
};

export class ProximityEstimator {
  private samples: number[] = [];
  private currentSmoothedRssi: number | null = null;
  private config: ProximityConfig;

  constructor(config: Partial<ProximityConfig> = {}) {
    this.config = { ...DEFAULT_PROXIMITY_CONFIG, ...config };
  }

  /**
   * Resets estimator state
   */
  public reset(): void {
    this.samples = [];
    this.currentSmoothedRssi = null;
  }

  /**
   * Adds an RSSI sample and returns updated smoothed value and proximity classification
   */
  public addSample(rssi: number): { smoothedRssi: number; proximity: ProximityLevel } {
    if (typeof rssi !== 'number' || isNaN(rssi)) {
      return {
        smoothedRssi: this.currentSmoothedRssi ?? -100,
        proximity: this.classify(this.currentSmoothedRssi ?? -100),
      };
    }

    this.samples.push(rssi);
    if (this.samples.length > this.config.sampleWindowSize) {
      this.samples.shift();
    }

    if (this.currentSmoothedRssi === null) {
      this.currentSmoothedRssi = rssi;
    } else {
      // Exponential Moving Average
      this.currentSmoothedRssi =
        this.config.smoothingAlpha * rssi + (1 - this.config.smoothingAlpha) * this.currentSmoothedRssi;
    }

    const smoothed = Math.round(this.currentSmoothedRssi);
    const proximity = this.classify(smoothed);

    return {
      smoothedRssi: smoothed,
      proximity,
    };
  }

  /**
   * Classifies an RSSI value into a ProximityLevel
   */
  public classify(rssi: number): ProximityLevel {
    if (this.samples.length === 0) {
      return 'UNKNOWN';
    }
    if (rssi >= this.config.veryNearThreshold) {
      return 'VERY_NEAR';
    }
    if (rssi >= this.config.nearThreshold) {
      return 'NEAR';
    }
    return 'FAR';
  }

  /**
   * Gets current smoothed RSSI
   */
  public getSmoothedRssi(): number | null {
    return this.currentSmoothedRssi !== null ? Math.round(this.currentSmoothedRssi) : null;
  }

  /**
   * Gets current proximity
   */
  public getProximity(): ProximityLevel {
    if (this.currentSmoothedRssi === null) return 'UNKNOWN';
    return this.classify(this.currentSmoothedRssi);
  }
}
