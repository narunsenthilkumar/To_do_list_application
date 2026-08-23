import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../store/ThemeContext';
import { Radii, TypographyScale } from '../../theme/tokens';

export interface NearbyProgressProps {
  progressPercent: number;
  stageName: string;
  reduceMotion?: boolean;
}

export const NearbyProgress: React.FC<NearbyProgressProps> = ({
  progressPercent,
  stageName,
  reduceMotion = false,
}) => {
  const { colors, isDark } = useTheme();

  // Progress width shared value for buttery smooth transitions
  const animatedWidth = useSharedValue(progressPercent);
  const shimmerX = useSharedValue(-100);

  useEffect(() => {
    animatedWidth.value = withTiming(progressPercent, {
      duration: 350,
      easing: Easing.out(Easing.ease),
    });
  }, [progressPercent]);

  useEffect(() => {
    if (reduceMotion) {
      shimmerX.value = -100;
      return;
    }

    shimmerX.value = withRepeat(
      withTiming(200, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(shimmerX);
    };
  }, [reduceMotion]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      transform: [{ translateX: shimmerX.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Progress Info Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.stageText, { color: colors.textSecondary }]}>
          {stageName || 'Syncing changes...'}
        </Text>
        <Text style={[styles.percentBadge, { color: colors.accent }]}>
          {Math.round(progressPercent)}%
        </Text>
      </View>

      {/* Progress Track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: colors.accent },
            animatedFillStyle,
          ]}
        >
          {/* Shimmer sweep */}
          {!reduceMotion && (
            <Animated.View style={[styles.shimmer, animatedShimmerStyle]} />
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stageText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  percentBadge: {
    ...TypographyScale.caption1,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 7,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  shimmer: {
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    opacity: 0.8,
  },
});
