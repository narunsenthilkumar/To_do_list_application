import AsyncStorage from '@react-native-async-storage/async-storage';

export class LamportClock {
  private static readonly CLOCK_KEY = '@taskora_lamport_clock_v4';
  private static currentCounter: number = 1;
  private static initialized: boolean = false;

  private static async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const stored = await AsyncStorage.getItem(this.CLOCK_KEY);
      if (stored) {
        this.currentCounter = parseInt(stored, 10) || 1;
      }
    } catch {
      this.currentCounter = 1;
    }
    this.initialized = true;
  }

  /**
   * Advances the local logical clock and returns the new version
   */
  public static async tick(): Promise<number> {
    await this.init();
    this.currentCounter += 1;
    await AsyncStorage.setItem(this.CLOCK_KEY, this.currentCounter.toString());
    return this.currentCounter;
  }

  /**
   * Updates local clock with incoming remote version (max(local, remote) + 1)
   */
  public static async witness(remoteVersion: number): Promise<number> {
    await this.init();
    this.currentCounter = Math.max(this.currentCounter, remoteVersion) + 1;
    await AsyncStorage.setItem(this.CLOCK_KEY, this.currentCounter.toString());
    return this.currentCounter;
  }

  public static getCounter(): number {
    return this.currentCounter;
  }
}
