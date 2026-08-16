import { ImageSourcePropType } from 'react-native';

/**
 * Taskora Centralized Brand Assets Configuration
 * Single source of truth for all brand logos, app icons, and marks.
 */
export const BrandAssets = {
  // Primary App Logo (1024x1024 master icon)
  logo: require('../assets/branding/taskora-logo.png') as ImageSourcePropType,
  
  // Icon-only version
  icon: require('../assets/branding/taskora-icon.png') as ImageSourcePropType,
  
  // Splash Screen mark
  splash: require('../assets/branding/taskora-splash.png') as ImageSourcePropType,
  
  // Android Notification Glyph
  notificationIcon: require('../assets/branding/taskora-notification-icon.png') as ImageSourcePropType,
  
  // Favicon (Web)
  favicon: require('../assets/branding/taskora-favicon.png') as ImageSourcePropType,
};

export const BrandInfo = {
  name: 'Taskora',
  tagline: 'Apple-inspired Local-First Smart Task Management',
  subtitle: 'Premium Productivity',
  version: '1.0.0',
  build: 'Phase 3 Production Build',
  copyright: 'Copyright © 2026 Taskora',
};
