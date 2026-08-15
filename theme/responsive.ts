import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 600,
  tablet: 900,
  laptop: 1200,
  desktop: 1600,
};

export const MAX_CONTENT_WIDTH = 1140;
export const MAX_CALENDAR_WIDTH = 520;
export const MAX_SEGMENTED_CONTROL_WIDTH = 340;

export interface ResponsiveConfig {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isDesktopOrLaptop: boolean;
  contentMaxWidth: number;
  taskGridColumns: number;
}

export function useResponsive(): ResponsiveConfig {
  const { width, height } = useWindowDimensions();

  const isMobile = width < BREAKPOINTS.mobile;
  const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
  const isLaptop = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isDesktopOrLaptop = width >= BREAKPOINTS.tablet;

  const taskGridColumns = isDesktopOrLaptop ? 2 : 1;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isDesktopOrLaptop,
    contentMaxWidth: Math.min(width, MAX_CONTENT_WIDTH),
    taskGridColumns,
  };
}
