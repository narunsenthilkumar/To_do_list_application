import { Platform } from 'react-native';

export interface WidgetCapabilityInfo {
  isSupported: boolean;
  platform: 'android' | 'ios' | 'electron' | 'web';
  title: string;
  description: string;
  instructions: string[];
}

export class WidgetCapability {
  static getCapability(): WidgetCapabilityInfo {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      return {
        isSupported: true,
        platform: 'electron',
        title: 'Taskora Desktop Mini-Widget',
        description: 'Interactive compact HUD widget and system tray status for Windows.',
        instructions: [
          'Use the in-app Widget Studio to preview and customize your desktop HUD widget.',
          'Quick actions allow instant task creation and focus timer toggling from anywhere.',
        ],
      };
    }

    if (Platform.OS === 'android') {
      return {
        isSupported: true,
        platform: 'android',
        title: 'Android Home Screen Widgets',
        description: 'Live interactive Taskora widgets for your Android Home Screen and Always-On Display.',
        instructions: [
          'Long-press any empty space on your Android Home Screen.',
          'Select "Widgets" from the bottom popup menu.',
          'Scroll to "Taskora" and choose Small, Medium, or Large.',
          'Drag the widget to your desired home screen location.',
        ],
      };
    }

    if (Platform.OS === 'ios') {
      return {
        isSupported: true,
        platform: 'ios',
        title: 'iOS Smart Stack Widgets',
        description: 'Beautiful SF-styled widgets with live progress and focus indicators.',
        instructions: [
          'Touch and hold an empty area on your Home Screen until the apps jiggle.',
          'Tap the "+" button in the upper-left corner.',
          'Search for "Taskora" and select your preferred widget size.',
          'Tap "Add Widget" and place it on your screen.',
        ],
      };
    }

    return {
      isSupported: true,
      platform: 'web',
      title: 'Web & Desktop Widget Preview',
      description: 'Interactive widget simulator and quick-action companion.',
      instructions: [
        'Preview and test live widget states directly in the Taskora Widget Studio.',
        'Widget data is kept synchronized in real time with your local tasks and focus sessions.',
      ],
    };
  }
}
