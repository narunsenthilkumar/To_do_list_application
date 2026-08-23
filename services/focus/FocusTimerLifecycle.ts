import { AppState, AppStateStatus, Platform } from 'react-native';

export type LifecycleStateCallback = (state: 'foreground' | 'background') => void;

export class FocusTimerLifecycle {
  private static listeners: Set<LifecycleStateCallback> = new Set();
  private static appStateSubscription: any = null;
  private static isInitialized = false;

  /**
   * Initializes AppState and window focus listeners
   */
  static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // React Native AppState listener (Android & iOS)
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        this.notifyListeners('foreground');
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.notifyListeners('background');
      }
    });

    // Web & Electron window focus/blur/visibility listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.notifyListeners('foreground');
      });

      window.addEventListener('blur', () => {
        this.notifyListeners('background');
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.notifyListeners('foreground');
          } else {
            this.notifyListeners('background');
          }
        });
      }
    }
  }

  /**
   * Subscribe to lifecycle changes
   */
  static subscribe(callback: LifecycleStateCallback): () => void {
    this.init();
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private static notifyListeners(state: 'foreground' | 'background'): void {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.warn('[FocusTimerLifecycle] Error in listener:', e);
      }
    });
  }

  static cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}
