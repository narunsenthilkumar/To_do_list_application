import { useRouter } from 'expo-router';

export type AppRouter = ReturnType<typeof useRouter>;

/**
 * Safe goBack helper for Expo Router to prevent unhandled 'GO_BACK' errors
 * when a user opens or refreshes a screen directly.
 */
export function safeGoBack(router: AppRouter, fallbackRoute: string = '/(tabs)'): void {
  try {
    if (router && typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else if (router && typeof router.replace === 'function') {
      router.replace(fallbackRoute as any);
    }
  } catch {
    if (router && typeof router.replace === 'function') {
      router.replace(fallbackRoute as any);
    }
  }
}
