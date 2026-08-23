import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { LightThemeColors, DarkThemeColors, ThemeColors } from '../theme/tokens';
import { Repository, DesktopClockStyle } from '../services/storage/repository';
import { TimeFormat, detectSystemTimeFormat } from '../utils/timeFormatter';
import {
  getInitialSystemTheme,
  subscribeToSystemTheme,
  resolveTheme,
  ResolvedTheme,
} from '../services/theme/SystemThemeService';

export type ThemeMode = 'system' | 'light' | 'dark';
export type { ResolvedTheme };
export type BackgroundStyle = 'ambient' | 'aurora' | 'liquid' | 'mesh' | 'minimal' | 'dynamic';

export interface BackgroundSettings {
  style: BackgroundStyle;
  accentColor: string;
  intensity: number; // 0 to 100
  blur: number; // 0 to 100
  animationEnabled: boolean;
  motionSpeed: number; // 0 to 100
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  style: 'ambient',
  accentColor: '#007AFF',
  intensity: 65,
  blur: 45,
  animationEnabled: true,
  motionSpeed: 50,
};

export interface ThemeContextType {
  mode: ThemeMode; // User's theme preference ('system' | 'light' | 'dark')
  themePreference: ThemeMode; // Explicit alias for user's theme preference
  resolvedTheme: ResolvedTheme; // Current active theme ('light' | 'dark')
  systemTheme: ResolvedTheme; // Detected OS theme ('light' | 'dark')
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  setThemePreference: (mode: ThemeMode) => void;
  cycleThemeMode: () => ThemeMode;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  clockStyle: DesktopClockStyle;
  setClockStyle: (style: DesktopClockStyle) => void;
  backgroundSettings: BackgroundSettings;
  updateBackgroundSettings: (settings: Partial<BackgroundSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize system theme to prevent theme flash on startup
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getInitialSystemTheme);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('12h');
  const [clockStyle, setClockStyleState] = useState<DesktopClockStyle>('digital');
  const [backgroundSettings, setBackgroundSettingsState] = useState<BackgroundSettings>(
    DEFAULT_BACKGROUND_SETTINGS
  );

  // Subscribe to real-time OS appearance changes (Web matchMedia, Electron native IPC, React Native Appearance)
  useEffect(() => {
    const unsubscribe = subscribeToSystemTheme((newSystemTheme) => {
      setSystemTheme(newSystemTheme);
    });

    return unsubscribe;
  }, []);

  // Load persisted user preference from storage
  useEffect(() => {
    Repository.loadThemeMode().then((saved) => {
      if (saved && (saved === 'system' || saved === 'light' || saved === 'dark')) {
        setModeState(saved);
      }
    });

    Repository.loadTimeFormat().then((saved) => {
      if (saved) {
        setTimeFormatState(saved);
      } else {
        const detected = detectSystemTimeFormat();
        setTimeFormatState(detected);
      }
    });

    Repository.loadClockStyle().then((saved) => {
      if (saved) setClockStyleState(saved);
    });

    Repository.loadBackgroundSettings().then((saved) => {
      if (saved && typeof saved === 'object') {
        setBackgroundSettingsState({
          ...DEFAULT_BACKGROUND_SETTINGS,
          ...saved,
        });
      }
    });
  }, []);

  // Persists ONLY the user's preference ('system', 'light', 'dark')
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    Repository.saveThemeMode(newMode);
  }, []);

  const setThemePreference = useCallback((newPref: ThemeMode) => {
    setThemeMode(newPref);
  }, [setThemeMode]);

  const cycleThemeMode = useCallback((): ThemeMode => {
    let next: ThemeMode = 'dark';
    if (mode === 'light') next = 'dark';
    else if (mode === 'dark') next = 'system';
    else if (mode === 'system') next = 'light';
    setThemeMode(next);
    return next;
  }, [mode, setThemeMode]);

  const setTimeFormat = useCallback((newFormat: TimeFormat) => {
    setTimeFormatState(newFormat);
    Repository.saveTimeFormat(newFormat);
  }, []);

  const setClockStyle = useCallback((newStyle: DesktopClockStyle) => {
    setClockStyleState(newStyle);
    Repository.saveClockStyle(newStyle);
  }, []);

  const updateBackgroundSettings = useCallback((updates: Partial<BackgroundSettings>) => {
    setBackgroundSettingsState((prev) => {
      const next = { ...prev, ...updates };
      Repository.saveBackgroundSettings(next);
      return next;
    });
  }, []);

  // Deterministically resolve the active theme
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    return resolveTheme(mode, systemTheme);
  }, [mode, systemTheme]);

  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? DarkThemeColors : LightThemeColors;

  const contextValue: ThemeContextType = useMemo(
    () => ({
      mode,
      themePreference: mode,
      resolvedTheme,
      systemTheme,
      isDark,
      colors,
      setThemeMode,
      setThemePreference,
      cycleThemeMode,
      timeFormat,
      setTimeFormat,
      clockStyle,
      setClockStyle,
      backgroundSettings,
      updateBackgroundSettings,
    }),
    [
      mode,
      resolvedTheme,
      systemTheme,
      isDark,
      colors,
      setThemeMode,
      setThemePreference,
      cycleThemeMode,
      timeFormat,
      setTimeFormat,
      clockStyle,
      setClockStyle,
      backgroundSettings,
      updateBackgroundSettings,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { resolveTheme };
