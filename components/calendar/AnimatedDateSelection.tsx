import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../store/ThemeContext';
import { Radii } from '../../theme/tokens';

export interface DateCellLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnimatedDateSelectionProps {
  selectedDate: string;
  cellLayouts: Record<string, DateCellLayout>;
  sameDateTapCount?: number;
  color?: string;
  borderRadius?: number;
  insetPadding?: number;
  style?: ViewStyle;
}

const FLOW_SPRING_CONFIG = {
  damping: 24,
  stiffness: 260,
  mass: 0.8,
};

const SETTLE_SPRING_CONFIG = {
  damping: 22,
  stiffness: 280,
  mass: 0.7,
};

export const AnimatedDateSelection: React.FC<AnimatedDateSelectionProps> = ({
  selectedDate,
  cellLayouts,
  sameDateTapCount = 0,
  color,
  borderRadius = Radii.md,
  insetPadding = 2,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const tintColor = color || colors.accent;

  const posX = useSharedValue(0);
  const posY = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillHeight = useSharedValue(0);
  const scale = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const opacity = useSharedValue(0);

  const isInitialized = useSharedValue(false);
  const prevDateRef = useRef<string | null>(null);
  const prevTapCountRef = useRef<number>(sameDateTapCount);

  // Animate on selected date or layout measurement change
  useEffect(() => {
    const layout = cellLayouts[selectedDate];
    if (!layout || layout.width === 0 || layout.height === 0) {
      return;
    }

    const targetX = layout.x + insetPadding;
    const targetY = layout.y + insetPadding;
    const targetW = layout.width - insetPadding * 2;
    const targetH = layout.height - insetPadding * 2;

    if (!isInitialized.value) {
      // First mount: place immediately and fade in
      posX.value = targetX;
      posY.value = targetY;
      pillWidth.value = targetW;
      pillHeight.value = targetH;
      opacity.value = withTiming(1, { duration: 180 });
      isInitialized.value = true;
      prevDateRef.current = selectedDate;
      return;
    }

    const isSameDate = prevDateRef.current === selectedDate;
    prevDateRef.current = selectedDate;

    if (isSameDate) {
      // Same date selected again: subtle micro-compression pulse
      scale.value = withSequence(
        withTiming(0.92, { duration: 70 }),
        withSpring(1.0, SETTLE_SPRING_CONFIG)
      );
      return;
    }

    // New date selected: measure distance for fluid dynamic deformation
    const dx = targetX - posX.value;
    const dy = targetY - posY.value;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Phase 1 & 2: Travel with Reanimated Springs
    posX.value = withSpring(targetX, FLOW_SPRING_CONFIG);
    posY.value = withSpring(targetY, FLOW_SPRING_CONFIG);
    pillWidth.value = withSpring(targetW, FLOW_SPRING_CONFIG);
    pillHeight.value = withSpring(targetH, FLOW_SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 100 });

    // Subtle fluid material stretch in travel direction
    if (distance > 20) {
      const isMostlyHorizontal = Math.abs(dx) >= Math.abs(dy);
      scaleX.value = withSequence(
        withTiming(isMostlyHorizontal ? 1.08 : 1.03, { duration: 85 }),
        withSpring(1.0, SETTLE_SPRING_CONFIG)
      );
      scaleY.value = withSequence(
        withTiming(!isMostlyHorizontal ? 1.06 : 0.94, { duration: 85 }),
        withSpring(1.0, SETTLE_SPRING_CONFIG)
      );
      scale.value = withSequence(
        withTiming(0.95, { duration: 60 }),
        withSpring(1.0, SETTLE_SPRING_CONFIG)
      );
    } else {
      scale.value = withSequence(
        withTiming(0.96, { duration: 60 }),
        withSpring(1.0, SETTLE_SPRING_CONFIG)
      );
    }
  }, [selectedDate, cellLayouts, insetPadding]);

  // Handle same-day explicit tap pulse
  useEffect(() => {
    if (sameDateTapCount > 0 && sameDateTapCount !== prevTapCountRef.current) {
      prevTapCountRef.current = sameDateTapCount;
      scale.value = withSequence(
        withTiming(0.92, { duration: 70 }),
        withSpring(1.0, SETTLE_SPRING_CONFIG)
      );
    }
  }, [sameDateTapCount]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: posX.value,
      top: posY.value,
      width: pillWidth.value,
      height: pillHeight.value,
      opacity: opacity.value,
      transform: [
        { scale: scale.value },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          backgroundColor: tintColor,
          borderRadius,
          shadowColor: tintColor,
          shadowOpacity: isDark ? 0.35 : 0.22,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1,
  },
});
