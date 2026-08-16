import { Platform, Vibration } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

/**
 * Apple-inspired tactile haptics & vibration design language.
 * Provides unified, subtle, platform-appropriate tactile feedback:
 * - Android: Native Expo Haptics & Vibration patterns
 * - Windows / Web: Safe execution with animation feedback fallbacks (no hardware errors)
 */
export const haptics = {
  /**
   * Light tactile feedback: icon buttons, navigation tabs, search, filter chips, theme toggles
   */
  light: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
    } catch {
      try {
        Vibration.vibrate(10);
      } catch {}
    }
  },

  /**
   * Selection feedback: segmented controls, date selection, priority picker changes
   */
  selection: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.selectionAsync();
    } catch {
      try {
        Vibration.vibrate(8);
      } catch {}
    }
  },

  /**
   * Medium tactile feedback: create task, save task, pin task, favorite task, start focus
   */
  medium: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
    } catch {
      try {
        Vibration.vibrate(25);
      } catch {}
    }
  },

  /**
   * Heavy feedback: destructive confirmations, delete task, clear completed tasks
   */
  heavy: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
    } catch {
      try {
        Vibration.vibrate(40);
      } catch {}
    }
  },

  /**
   * Success notification: task completed, subtask completed, backup exported, restore successful
   */
  success: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
    } catch {
      try {
        Vibration.vibrate([0, 15, 30, 20]);
      } catch {}
    }
  },

  /**
   * Warning notification: defer, disable reminder, destructive confirmation prompt
   */
  warning: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
    } catch {
      try {
        Vibration.vibrate([0, 25, 40, 25]);
      } catch {}
    }
  },

  /**
   * Error notification: invalid input, failed backup, microphone error, notification failure
   */
  error: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
    } catch {
      try {
        Vibration.vibrate([0, 30, 50, 30, 50, 30]);
      } catch {}
    }
  },

  /**
   * General notification trigger
   */
  notification: async (type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await ExpoHaptics.notificationAsync(type);
    } catch {
      try {
        Vibration.vibrate(20);
      } catch {}
    }
  },

  /**
   * Android custom vibration pattern helper
   */
  vibratePattern: (pattern: number | number[], repeat: boolean = false): void => {
    if (Platform.OS === 'web') return;
    try {
      Vibration.vibrate(pattern, repeat);
    } catch {}
  },

  /**
   * Cancel active vibration
   */
  cancelVibration: (): void => {
    if (Platform.OS === 'web') return;
    try {
      Vibration.cancel();
    } catch {}
  },
};

// Aliases for compatibility with existing imports
export const safeHaptics = {
  impactAsync: (style?: ExpoHaptics.ImpactFeedbackStyle) => {
    if (style === ExpoHaptics.ImpactFeedbackStyle.Heavy) return haptics.heavy();
    if (style === ExpoHaptics.ImpactFeedbackStyle.Medium) return haptics.medium();
    return haptics.light();
  },
  notificationAsync: (type?: ExpoHaptics.NotificationFeedbackType) => {
    if (type === ExpoHaptics.NotificationFeedbackType.Warning) return haptics.warning();
    if (type === ExpoHaptics.NotificationFeedbackType.Error) return haptics.error();
    return haptics.success();
  },
  selectionAsync: () => haptics.selection(),
  impact: (style?: ExpoHaptics.ImpactFeedbackStyle) => safeHaptics.impactAsync(style),
  notification: (type?: ExpoHaptics.NotificationFeedbackType) => safeHaptics.notificationAsync(type),
  selection: () => safeHaptics.selectionAsync(),
};

export { ExpoHaptics as Haptics };
