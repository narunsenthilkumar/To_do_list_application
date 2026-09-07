import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../store/ThemeContext';
import { SpringConfigs } from '../../theme/animations';
import { Shadows } from '../../theme/tokens';

interface AnimatedToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const AnimatedToggle: React.FC<AnimatedToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel = 'Task Reminders',
}) => {
  const { colors, isDark } = useTheme();

  const progress = useSharedValue(value ? 1 : 0);
  const thumbScale = useSharedValue(1);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, SpringConfigs.tabSlide);
    thumbScale.value = withSequence(
      withTiming(1.1, { duration: 100 }),
      withTiming(1.0, { duration: 120 })
    );
  }, [value]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  };

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [
        isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.12)',
        colors.accent,
      ]
    );
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [
        isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.10)',
        colors.accent,
      ]
    );
    return {
      backgroundColor,
      borderColor,
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const translateX = progress.value * 20; // 52 width - 28 thumb - 4 padding = 20 max translation
    return {
      transform: [{ translateX }, { scale: thumbScale.value }],
    };
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={styles.pressArea}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.track, animatedTrackStyle]}>
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: '#FFFFFF' },
            Shadows.card,
            animatedThumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressArea: {
    minHeight: 44,
    minWidth: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});
