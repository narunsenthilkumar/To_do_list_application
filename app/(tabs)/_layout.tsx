import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Shadows, Spacing } from '../../theme/tokens';
import { FloatingTabBar } from '../../components/navigation/FloatingTabBar';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../theme/materials';
import { useResponsive } from '../../theme/responsive';
import { WindowsDesktopShell } from '../../components/desktop/WindowsDesktopShell';

export default function TabsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useResponsive();

  const isDesktopEnvironment =
    Platform.OS === 'web' &&
    (isDesktopOrLaptop || (typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isElectron)));

  // If in desktop / Electron environment, render the Windows Desktop presentation shell
  if (isDesktopEnvironment) {
    return <WindowsDesktopShell />;
  }

  const bottomInset = Math.max(insets.bottom, 12);
  const fabBottom = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + (Platform.OS === 'ios' ? bottomInset / 2 : 0) + 16;

  const openQuickAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/modal/quick-add');
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
        <Tabs.Screen name="projects" options={{ title: 'Projects' }} />
        <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
        <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
        <Tabs.Screen name="two" options={{ href: null }} />
      </Tabs>

      {/* Prominent Floating Action Button (+) */}
      <AnimatedPressable
        onPress={openQuickAdd}
        profile="floatingButton"
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
            bottom: fabBottom,
          },
          Shadows.floating,
        ]}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

