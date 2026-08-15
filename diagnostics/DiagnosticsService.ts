import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { DeviceIdService } from '../sync/DeviceIdService';
import { SessionService } from '../auth/SessionService';

export interface DiagnosticLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  category: 'database' | 'sync' | 'auth' | 'ui' | 'general';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

export class DiagnosticsService {
  private static readonly LOGS_KEY = '@taskora_diag_logs_v4';
  private static readonly DIAG_ENABLED_KEY = '@taskora_diag_enabled_v4';
  private static readonly MAX_LOGS = 50;

  /**
   * Checks if local diagnostics tracking is enabled
   */
  public static async isDiagnosticsEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(this.DIAG_ENABLED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Sets diagnostics preference
   */
  public static async setDiagnosticsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(this.DIAG_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  /**
   * Records a local diagnostic log
   */
  public static async log(
    level: 'info' | 'warn' | 'error',
    category: 'database' | 'sync' | 'auth' | 'ui' | 'general',
    message: string,
    details?: Record<string, any>
  ): Promise<void> {
    const isEnabled = await this.isDiagnosticsEnabled();
    if (!isEnabled && level === 'info') return;

    try {
      const logs = await this.getLogs();
      const newLog: DiagnosticLog = {
        id: `diag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        level,
        category,
        message,
        timestamp: new Date().toISOString(),
        details,
      };

      const updated = [newLog, ...logs].slice(0, this.MAX_LOGS);
      await AsyncStorage.setItem(this.LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[DiagnosticsService] Failed to record log:', e);
    }
  }

  /**
   * Retrieves all recorded logs
   */
  public static async getLogs(): Promise<DiagnosticLog[]> {
    try {
      const raw = await AsyncStorage.getItem(this.LOGS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Clears all recorded diagnostic logs
   */
  public static async clearLogs(): Promise<void> {
    await AsyncStorage.removeItem(this.LOGS_KEY);
  }

  /**
   * Generates exportable diagnostic report text
   */
  public static async generateReport(): Promise<string> {
    const deviceId = await DeviceIdService.getDeviceId();
    const session = await SessionService.getActiveSession();
    const logs = await this.getLogs();

    const report = {
      app: 'Taskora',
      version: '4.0.0',
      generatedAt: new Date().toISOString(),
      system: {
        platform: Platform.OS,
        deviceId,
        isGuest: session.isGuest,
      },
      logs,
    };

    return JSON.stringify(report, null, 2);
  }
}
