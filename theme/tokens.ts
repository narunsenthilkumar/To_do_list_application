export const LightThemeColors = {
  // Surface Hierarchy (Layer 0, 1, 2)
  primaryBackground: '#F5F5FA',      // Premium Apple soft neutral canvas
  secondaryBackground: '#EAEAEF',    // Grouped inset background
  elevatedCard: '#FFFFFF',           // Raised card surface
  glassSurface: 'rgba(255, 255, 255, 0.82)', // Translucent glass material
  glassBorder: 'rgba(255, 255, 255, 0.8)',
  
  // Typography
  textPrimary: '#1C1C1E',
  textSecondary: '#48484A',
  textTertiary: '#8E8E93',
  textQuaternary: '#C7C7CC',
  
  // Accent & Brand Colors
  accent: '#007AFF',                // Apple System Blue
  accentGradientStart: '#007AFF',
  accentGradientEnd: '#5856D6',
  
  // Dividers & Borders
  separator: '#E5E5EA',
  subtleBorder: 'rgba(0, 0, 0, 0.05)',
  
  // States & Indicators
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Priority Palette
  priorityUrgent: '#FF3B30',
  priorityHigh: '#FF9500',
  priorityMedium: '#5856D6',
  priorityLow: '#34C759',
  priorityNone: '#8E8E93',
  
  // Floating Action / Modals
  fabBackground: '#007AFF',
  fabIcon: '#FFFFFF',
  modalBackdrop: 'rgba(0, 0, 0, 0.35)',
};

export const DarkThemeColors = {
  // Surface Hierarchy (Layer 0, 1, 2)
  primaryBackground: '#0A0A0C',      // Deep neutral dark canvas
  secondaryBackground: '#161618',    // Dark secondary grouped inset
  elevatedCard: '#1C1C1E',           // Raised dark card surface
  glassSurface: 'rgba(28, 28, 34, 0.82)', // Translucent dark glass
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  
  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textQuaternary: '#48484A',
  
  // Accent & Brand Colors
  accent: '#0A84FF',                // Apple Dark Mode System Blue
  accentGradientStart: '#0A84FF',
  accentGradientEnd: '#5E5CE6',
  
  // Dividers & Borders
  separator: '#2C2C2E',
  subtleBorder: 'rgba(255, 255, 255, 0.07)',
  
  // States & Indicators
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  
  // Priority Palette
  priorityUrgent: '#FF453A',
  priorityHigh: '#FF9F0A',
  priorityMedium: '#5E5CE6',
  priorityLow: '#30D158',
  priorityNone: '#8E8E93',
  
  // Floating Action / Modals
  fabBackground: '#0A84FF',
  fabIcon: '#FFFFFF',
  modalBackdrop: 'rgba(0, 0, 0, 0.65)',
};

export type ThemeColors = typeof LightThemeColors;

export const TypographyScale = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
    letterSpacing: 0.07,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  sheet: 32,
  pill: 9999,
};

export const Shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
};

