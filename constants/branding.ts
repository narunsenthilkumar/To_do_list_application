import { ImageSourcePropType } from 'react-native';

/**
 * KIVENTA Centralized Brand Assets Configuration
 * Single source of truth for all brand logos, app icons, and marks.
 */
export const APP_NAME = 'KIVENTA';

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
  name: 'KIVENTA',
  tagline: 'Turn Intent Into Action',
  subtitle: 'Premium Productivity',
  version: '1.0.0',
  build: 'Phase 3 Production Build',
  copyright: 'Copyright © 2026 KIVENTA',
};

