import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Settings, Sun, Moon, Monitor } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { SyncStatusPill } from '../navigation/SyncStatusPill';
import { useTheme, ThemeMode } from '../../store/ThemeContext';
import { safeHaptics } from '../../utils/haptics';

interface TodayHeaderActionsProps {
  onOpenThemePopover: () => void;
}

export const TodayHeaderActions: React.FC<TodayHeaderActionsProps> = ({ onOpenThemePopover }) => {
  const router = useRouter();
  const { mode, isDark, colors, cycleThemeMode } = useTheme();

  const themeIconScale = useSharedValue(1);
  const themeIconRotate = useSharedValue(0);

  useEffect(() => {
    themeIconScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1.0, { damping: 12, stiffness: 220 })
    );
    themeIconRotate.value = withSequence(
      withTiming(15, { duration: 80 }),
      withTiming(0, { duration: 120 })
    );
  }, [mode]);

  const animatedThemeIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: themeIconScale.value },
      { rotate: `${themeIconRotate.value}deg` },
    ],
  }));

  const renderThemeIcon = () => {
    if (mode === 'light') return <Sun size={20} color="#F59E0B" />;
    if (mode === 'dark') return <Moon size={20} color="#38BDF8" />;
    return <Monitor size={20} color={colors.textPrimary} />;
  };

  const handleToggleTheme = () => {
    safeHaptics.impact(Haptics.ImpactFeedbackStyle.Medium);
    cycleThemeMode();
  };

  return (
    <View style={styles.actionsContainer}>
      <SyncStatusPill />

      <AnimatedPressable
        onPress={() => {
          safeHaptics.impact(Haptics.ImpactFeedbackStyle.Light);
          router.push('/search');
        }}
        profile="smallControl"
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityLabel="Search tasks"
        style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}
      >
        <Search size={20} color={colors.textPrimary} />
      </AnimatedPressable>

      <AnimatedPressable
        onPress={handleToggleTheme}
        onLongPress={() => {
          safeHaptics.impact(Haptics.ImpactFeedbackStyle.Heavy);
          onOpenThemePopover();
        }}
        profile="smallControl"
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityLabel={`Appearance mode is ${mode}. Tap to switch or long-press for options.`}
        style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}
      >
        <Animated.View style={animatedThemeIconStyle}>{renderThemeIcon()}</Animated.View>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => {
          safeHaptics.impact(Haptics.ImpactFeedbackStyle.Light);
          router.push('/settings');
        }}
        profile="smallControl"
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        accessibilityLabel="Open settings"
        style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}
      >
        <Settings size={20} color={colors.textPrimary} />
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
