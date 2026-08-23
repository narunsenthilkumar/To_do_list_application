import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../store/ThemeContext';

export interface ToastProgressProps {
  duration?: number;
  isPaused?: boolean;
  onComplete?: () => void;
  color?: string;
  reduceMotion?: boolean;
}

export const ToastProgress: React.FC<ToastProgressProps> = ({
  duration = 4000,
  isPaused = false,
  onComplete,
  color,
  reduceMotion = false,
}) => {
  const { colors } = useTheme();
  const progress = useSharedValue(1);

  const startTimeRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    if (isPaused) {
      // Pause progress
      cancelAnimation(progress);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      elapsedRef.current += Date.now() - startTimeRef.current;
    } else {
      // Resume / Start progress
      startTimeRef.current = Date.now();
      const remaining = Math.max(0, duration - elapsedRef.current);

      if (remaining <= 0) {
        if (onComplete) onComplete();
        return;
      }

      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });

      timerRef.current = setTimeout(() => {
        if (onComplete) onComplete();
      }, remaining);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      cancelAnimation(progress);
    };
  }, [isPaused, duration, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { display: 'none' };
    return {
      transform: [{ scaleX: progress.value }],
    };
  });

  const progressColor = color || colors.accent;

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: progressColor },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bar: {
    height: '100%',
    width: '100%',
    transformOrigin: 'left',
  },
});
