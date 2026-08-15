import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';

// Motion Categories & Timing Values
export const MotionDurations = {
  micro: 180,       // 120-220ms: Toggles, buttons, checkboxes, chips
  context: 280,     // 200-350ms: Cards, bottom sheets, context menus, pickers
  spatial: 400,     // 300-500ms: Screen transitions, detail views, shared element
  ambient: 30000,   // 10-40s: Slow background ambient light field loops
};

// Reanimated Spring Configurations
export const SpringConfigs: Record<string, WithSpringConfig> = {
  snappy: {
    damping: 24,
    stiffness: 300,
    mass: 0.8,
  },
  bouncy: {
    damping: 15,
    stiffness: 200,
    mass: 0.9,
  },
  tabSlide: {
    damping: 28,
    stiffness: 280,
    mass: 0.7,
  },
  modalSheet: {
    damping: 30,
    stiffness: 260,
    mass: 0.9,
  },
  spatialExpand: {
    damping: 32,
    stiffness: 200,
    mass: 1.0,
  },
  subtleCompress: {
    damping: 26,
    stiffness: 240,
    mass: 0.8,
  },
};

// Reanimated Timing Configurations
export const TimingConfigs: Record<string, WithTimingConfig> = {
  microEase: {
    duration: MotionDurations.micro,
    easing: Easing.out(Easing.quad),
  },
  contextEase: {
    duration: MotionDurations.context,
    easing: Easing.out(Easing.cubic),
  },
  spatialEase: {
    duration: MotionDurations.spatial,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  },
};

// Interaction Scale Profiles for Pressable Depth
export const PressDepthProfiles = {
  smallControl: { scale: 0.96, haptic: 'light' as const },
  card: { scale: 0.98, haptic: 'light' as const },
  primaryButton: { scale: 0.96, haptic: 'medium' as const },
  floatingButton: { scale: 0.92, haptic: 'medium' as const },
  destructiveAction: { scale: 0.96, haptic: 'warning' as const },
};

