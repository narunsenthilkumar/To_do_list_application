import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Safe cross-platform Haptics helper that suppresses web browser vibrate warnings
 */
export const safeHaptics = {
  impactAsync: async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.impactAsync(style);
    } catch {}
  },

  notificationAsync: async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.notificationAsync(type);
    } catch {}
  },

  selectionAsync: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    try {
      await Haptics.selectionAsync();
    } catch {}
  },
};

export { Haptics };
