import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';

/**
 * Unified Apple-Quality Animation Tokens & Motion Hierarchy:
 * - Micro: 120–220ms (Toggles, checkboxes, icons, chips)
 * - Interaction: 180–320ms (Press feedback, cards, buttons)
 * - Context: 250–450ms (Sheets, dropdowns, pickers, modals)
 * - Spatial: 350–600ms (Screen transitions, layout expand/collapse)
 * - Ambient: 8–40s (Screensaver environments, slow atmospheric loops)
 */
export const MotionDurations = {
  micro: 180,       // 120-220ms
  interaction: 240, // 180-320ms
  context: 320,     // 250-450ms
  spatial: 450,     // 350-600ms
  ambient: 20000,   // 8-40s
};

// Reanimated Spring Configurations (Physical, restrained, Apple-inspired)
export const SpringConfigs: Record<string, WithSpringConfig> = {
  snappy: {
    damping: 26,
    stiffness: 320,
    mass: 0.75,
  },
  bouncy: {
    damping: 18,
    stiffness: 220,
    mass: 0.85,
  },
  tabSlide: {
    damping: 30,
    stiffness: 300,
    mass: 0.7,
  },
  modalSheet: {
    damping: 32,
    stiffness: 280,
    mass: 0.85,
  },
  spatialExpand: {
    damping: 34,
    stiffness: 220,
    mass: 0.95,
  },
  subtleCompress: {
    damping: 28,
    stiffness: 260,
    mass: 0.75,
  },
  cardLayout: {
    damping: 24,
    stiffness: 250,
    mass: 0.8,
  },
};

// Reanimated Timing Configurations
export const TimingConfigs: Record<string, WithTimingConfig> = {
  microEase: {
    duration: MotionDurations.micro,
    easing: Easing.out(Easing.quad),
  },
  interactionEase: {
    duration: MotionDurations.interaction,
    easing: Easing.out(Easing.cubic),
  },
  contextEase: {
    duration: MotionDurations.context,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  },
  spatialEase: {
    duration: MotionDurations.spatial,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
  },
  crossfade: {
    duration: 3000,
    easing: Easing.inOut(Easing.cubic),
  },
};

// Interaction Scale Profiles for Pressable Depth
export const PressDepthProfiles = {
  smallControl: { scale: 0.95, haptic: 'light' as const },
  card: { scale: 0.98, haptic: 'light' as const },
  primaryButton: { scale: 0.96, haptic: 'medium' as const },
  floatingButton: { scale: 0.92, haptic: 'medium' as const },
  destructiveAction: { scale: 0.96, haptic: 'warning' as const },
};
