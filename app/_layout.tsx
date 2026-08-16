import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../store/ThemeContext';
import { TaskProvider, useTaskStore } from '../store/TaskContext';
import { FocusProvider } from '../store/FocusContext';
import { Snackbar } from '../components/common/Snackbar';
import { MigrationRunner } from '../data/migrations/MigrationRunner';
import { NotificationService } from '../services/notifications/notificationService';
import { ErrorBoundary } from '../diagnostics/ErrorBoundary';

function RootStack() {
  const { isDark } = useTheme();
  const { activeUndoAction, undoLastAction, dismissUndo } = useTaskStore();
  const router = useRouter();

  useEffect(() => {
    MigrationRunner.runMigrations();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Remove browser focus rings globally for clean Apple aesthetics
      const styleId = 'taskora-focus-reset';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          input, textarea, select, [tabindex] {
            outline: none !important;
            outline-width: 0 !important;
            outline-color: transparent !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          input:focus, textarea:focus, select:focus, [tabindex]:focus {
            outline: none !important;
            outline-width: 0 !important;
            outline-color: transparent !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(style);
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          if (e.key === 'Escape') {
            (document.activeElement as HTMLElement)?.blur();
          }
          return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
          e.preventDefault();
          router.push('/modal/quick-add');
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          router.push('/search');
        } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
          e.preventDefault();
          router.push('/settings');
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [router]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="project/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="modal/quick-add" options={{ presentation: 'transparentModal', animation: 'fade' }} />

        <Stack.Screen name="search" options={{ presentation: 'card' }} />
        <Stack.Screen name="statistics" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings/backup" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings/privacy-diagnostics" options={{ presentation: 'card' }} />
        <Stack.Screen name="sync/index" options={{ presentation: 'card' }} />
        <Stack.Screen name="auth/login" options={{ presentation: 'card' }} />
        <Stack.Screen name="auth/register" options={{ presentation: 'card' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
      <Snackbar action={activeUndoAction} onUndo={undoLastAction} onDismiss={dismissUndo} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <TaskProvider>
              <FocusProvider>
                <RootStack />
              </FocusProvider>
            </TaskProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

