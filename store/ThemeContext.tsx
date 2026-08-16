import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LightThemeColors, DarkThemeColors, ThemeColors } from '../theme/tokens';
import { Repository } from '../services/storage/repository';
import { TimeFormat, detectSystemTimeFormat } from '../utils/timeFormatter';

export type ThemeMode = 'system' | 'light' | 'dark';
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

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  cycleThemeMode: () => ThemeMode;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  backgroundSettings: BackgroundSettings;
  updateBackgroundSettings: (settings: Partial<BackgroundSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('12h');
  const [backgroundSettings, setBackgroundSettingsState] = useState<BackgroundSettings>(
    DEFAULT_BACKGROUND_SETTINGS
  );

  useEffect(() => {
    Repository.loadThemeMode().then((saved) => {
      if (saved) setModeState(saved);
    });

    Repository.loadTimeFormat().then((saved) => {
      if (saved) {
        setTimeFormatState(saved);
      } else {
        const detected = detectSystemTimeFormat();
        setTimeFormatState(detected);
      }
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

  const setThemeMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    Repository.saveThemeMode(newMode);
  };

  const cycleThemeMode = (): ThemeMode => {
    let next: ThemeMode = 'dark';
    if (mode === 'light') next = 'dark';
    else if (mode === 'dark') next = 'system';
    else if (mode === 'system') next = 'light';
    setThemeMode(next);
    return next;
  };

  const setTimeFormat = (newFormat: TimeFormat) => {
    setTimeFormatState(newFormat);
    Repository.saveTimeFormat(newFormat);
  };

  const updateBackgroundSettings = (updates: Partial<BackgroundSettings>) => {
    setBackgroundSettingsState((prev) => {
      const next = { ...prev, ...updates };
      Repository.saveBackgroundSettings(next);
      return next;
    });
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? DarkThemeColors : LightThemeColors;

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        setThemeMode,
        cycleThemeMode,
        timeFormat,
        setTimeFormat,
        backgroundSettings,
        updateBackgroundSettings,
      }}
    >
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
