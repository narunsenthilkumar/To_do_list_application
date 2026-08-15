import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Settings, Sun, Moon, Monitor } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { SyncStatusPill } from '../navigation/SyncStatusPill';
import { useTheme, ThemeMode } from '../../store/ThemeContext';

interface TodayHeaderActionsProps {
  onOpenThemePopover: () => void;
}

export const TodayHeaderActions: React.FC<TodayHeaderActionsProps> = ({ onOpenThemePopover }) => {
  const router = useRouter();
  const { mode, colors } = useTheme();

  const themeIconScale = useSharedValue(1);

  useEffect(() => {
    themeIconScale.value = withSequence(
      withTiming(1.15, { duration: 120 }),
      withTiming(1.0, { duration: 150 })
    );
  }, [mode]);

  const animatedThemeIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: themeIconScale.value }],
  }));

  const renderThemeIcon = () => {
    if (mode === 'light') return <Sun size={20} color={colors.textPrimary} />;
    if (mode === 'dark') return <Moon size={20} color={colors.textPrimary} />;
    return <Monitor size={20} color={colors.textPrimary} />;
  };

  return (
    <View style={styles.actionsContainer}>
      <SyncStatusPill />

      <AnimatedPressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/search');
        }}
        profile="smallControl"
        accessibilityLabel="Search tasks"
        style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}
      >
        <Search size={20} color={colors.textPrimary} />
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenThemePopover();
        }}
        profile="smallControl"
        accessibilityLabel="Change theme appearance"
        style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}
      >
        <Animated.View style={animatedThemeIconStyle}>{renderThemeIcon()}</Animated.View>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/settings');
        }}
        profile="smallControl"
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
    gap: 6,
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
