import { Appearance, Platform } from 'react-native';
import { ThemeMode } from '../../store/ThemeContext';

export type ResolvedTheme = 'light' | 'dark';

/**
 * Deterministically resolves the active theme from the user's preference and OS appearance.
 *
 * Matrix:
 * resolveTheme("light", "dark")  -> "light"
 * resolveTheme("light", "light") -> "light"
 * resolveTheme("dark", "light")  -> "dark"
 * resolveTheme("dark", "dark")   -> "dark"
 * resolveTheme("system", "light")-> "light"
 * resolveTheme("system", "dark") -> "dark"
 */
export function resolveTheme(
  preference: ThemeMode,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemTheme === 'dark' ? 'dark' : 'light';
}

/**
 * Synchronously detects the initial system color scheme.
 */
export function getInitialSystemTheme(): ResolvedTheme {
  // 1. Web & Electron window.matchMedia check
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    } catch {
      // Fallback
    }
  }

  // 2. React Native Appearance check
  try {
    const rnScheme = Appearance.getColorScheme();
    if (rnScheme === 'dark' || rnScheme === 'light') {
      return rnScheme;
    }
  } catch {
    // Fallback
  }

  return 'light';
}

/**
 * Subscribes to real-time OS appearance changes across Web, Electron, and React Native/Expo.
 * Returns a cleanup function that safely unregisters all event listeners.
 */
export function subscribeToSystemTheme(
  callback: (theme: ResolvedTheme) => void
): () => void {
  const cleanups: Array<() => void> = [];

  // 1. Electron Native IPC listener (if running inside Electron desktop shell)
  if (
    typeof window !== 'undefined' &&
    (window as any).electronAPI?.theme?.onSystemThemeChange
  ) {
    try {
      const unsubElectron = (window as any).electronAPI.theme.onSystemThemeChange(
        (theme: ResolvedTheme) => {
          if (theme === 'light' || theme === 'dark') {
            callback(theme);
          }
        }
      );
      cleanups.push(unsubElectron);

      // Also query async in case nativeTheme has updated
      if ((window as any).electronAPI.theme.getSystemTheme) {
        (window as any).electronAPI.theme
          .getSystemTheme()
          .then((theme: ResolvedTheme) => {
            if (theme === 'light' || theme === 'dark') {
              callback(theme);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('[SystemThemeService] Electron theme subscription warning:', e);
    }
  }

  // 2. Web / Expo Web MediaQueryList listener
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
        const theme: ResolvedTheme = e.matches ? 'dark' : 'light';
        callback(theme);
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange);
        cleanups.push(() => {
          mediaQuery.removeEventListener('change', handleMediaChange);
        });
      } else if (typeof (mediaQuery as any).addListener === 'function') {
        // Fallback for older browsers / webviews
        (mediaQuery as any).addListener(handleMediaChange);
        cleanups.push(() => {
          (mediaQuery as any).removeListener(handleMediaChange);
        });
      }
    } catch (e) {
      console.warn('[SystemThemeService] matchMedia subscription warning:', e);
    }
  }

  // 3. React Native Appearance listener
  try {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme === 'dark' || colorScheme === 'light') {
        callback(colorScheme);
      }
    });

    if (subscription && typeof subscription.remove === 'function') {
      cleanups.push(() => subscription.remove());
    }
  } catch (e) {
    console.warn('[SystemThemeService] Appearance subscription warning:', e);
  }

  // Return composite teardown
  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });
  };
}
