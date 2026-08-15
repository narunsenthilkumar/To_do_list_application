import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
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

  useEffect(() => {
    MigrationRunner.runMigrations();
    NotificationService.requestPermissions();
  }, []);

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

