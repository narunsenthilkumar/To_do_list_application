import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LightThemeColors, DarkThemeColors, ThemeColors } from '../theme/tokens';
import { Repository } from '../services/storage/repository';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => void;
  cycleThemeMode: () => ThemeMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    Repository.loadThemeMode().then((saved) => {
      if (saved) setModeState(saved);
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

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? DarkThemeColors : LightThemeColors;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setThemeMode, cycleThemeMode }}>
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
