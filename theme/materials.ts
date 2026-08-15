import { ViewStyle, StyleSheet } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

export const MaterialLayers = {
  // Layer 0 - Canvas
  canvas: {
    light: '#F5F5FA',
    dark: '#0A0A0C',
  },
  
  // Layer 1 - Elevated Surface (Cards, Insets, Grouped Sections)
  elevated: {
    light: '#FFFFFF',
    dark: '#1C1C1E',
    borderLight: 'rgba(0, 0, 0, 0.05)',
    borderDark: 'rgba(255, 255, 255, 0.08)',
  },

  // Layer 2 - Glass Material (Tab bar, Search bar, FAB background, Bottom Sheets)
  glass: {
    light: 'rgba(255, 255, 255, 0.78)',
    dark: 'rgba(28, 28, 32, 0.78)',
    blurSubtle: 25,
    blurMedium: 65,
    blurHigh: 90,
    borderLight: 'rgba(255, 255, 255, 0.8)',
    borderDark: 'rgba(255, 255, 255, 0.14)',
  },
  
  // Depth Levels
  depth: {
    level0: { elevation: 0 },
    level1: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    level2: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    level3: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
      elevation: 12,
    },
  },
};

// Global Navigation & Safe Area Inset Calculations
export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_BOTTOM_OFFSET = 16;
export const FAB_SIZE = 56;

export const getBottomContentInset = (insets: EdgeInsets): number => {
  const bottomInset = Math.max(insets.bottom, 12);
  return TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + bottomInset + 20; // safe space to prevent overlap
};
