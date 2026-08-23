import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../store/ThemeContext';

export interface NearbyRadarProps {
  active: boolean;
  reduceMotion?: boolean;
}

export const NearbyRadar: React.FC<NearbyRadarProps> = ({ active, reduceMotion = false }) => {
  const { colors } = useTheme();

  // Left phone radar rings
  const leftScale1 = useSharedValue(0.4);
  const leftOpacity1 = useSharedValue(0);
  const leftScale2 = useSharedValue(0.4);
  const leftOpacity2 = useSharedValue(0);
  const leftScale3 = useSharedValue(0.4);
  const leftOpacity3 = useSharedValue(0);

  // Right phone radar rings
  const rightScale1 = useSharedValue(0.4);
  const rightOpacity1 = useSharedValue(0);
  const rightScale2 = useSharedValue(0.4);
  const rightOpacity2 = useSharedValue(0);
  const rightScale3 = useSharedValue(0.4);
  const rightOpacity3 = useSharedValue(0);

  useEffect(() => {
    if (!active || reduceMotion) {
      leftScale1.value = 0.4;
      leftOpacity1.value = 0;
      leftScale2.value = 0.4;
      leftOpacity2.value = 0;
      leftScale3.value = 0.4;
      leftOpacity3.value = 0;

      rightScale1.value = 0.4;
      rightOpacity1.value = 0;
      rightScale2.value = 0.4;
      rightOpacity2.value = 0;
      rightScale3.value = 0.4;
      rightOpacity3.value = 0;
      return;
    }

    const duration = 2200;

    // Left Ring 1
    leftScale1.value = withRepeat(
      withTiming(1.9, { duration, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    leftOpacity1.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 250 }),
        withTiming(0, { duration: duration - 250, easing: Easing.out(Easing.quad) })
      ),
      -1,
      false
    );

    // Left Ring 2 (Staggered 700ms)
    const t2 = setTimeout(() => {
      leftScale2.value = withRepeat(
        withTiming(1.9, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      leftOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 250 }),
          withTiming(0, { duration: duration - 250, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    }, 700);

    // Left Ring 3 (Staggered 1400ms)
    const t3 = setTimeout(() => {
      leftScale3.value = withRepeat(
        withTiming(1.9, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      leftOpacity3.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 250 }),
          withTiming(0, { duration: duration - 250, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    }, 1400);

    // Right Ring 1 (Staggered 350ms for natural bidirectional pulse)
    const tr1 = setTimeout(() => {
      rightScale1.value = withRepeat(
        withTiming(1.9, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      rightOpacity1.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 250 }),
          withTiming(0, { duration: duration - 250, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    }, 350);

    // Right Ring 2 (Staggered 1050ms)
    const tr2 = setTimeout(() => {
      rightScale2.value = withRepeat(
        withTiming(1.9, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      rightOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 250 }),
          withTiming(0, { duration: duration - 250, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    }, 1050);

    // Right Ring 3 (Staggered 1750ms)
    const tr3 = setTimeout(() => {
      rightScale3.value = withRepeat(
        withTiming(1.9, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      rightOpacity3.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 250 }),
          withTiming(0, { duration: duration - 250, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    }, 1750);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tr1);
      clearTimeout(tr2);
      clearTimeout(tr3);
      cancelAnimation(leftScale1);
      cancelAnimation(leftOpacity1);
      cancelAnimation(leftScale2);
      cancelAnimation(leftOpacity2);
      cancelAnimation(leftScale3);
      cancelAnimation(leftOpacity3);
      cancelAnimation(rightScale1);
      cancelAnimation(rightOpacity1);
      cancelAnimation(rightScale2);
      cancelAnimation(rightOpacity2);
      cancelAnimation(rightScale3);
      cancelAnimation(rightOpacity3);
    };
  }, [active, reduceMotion]);

  const leftRingStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: leftScale1.value }],
    opacity: leftOpacity1.value,
  }));
  const leftRingStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: leftScale2.value }],
    opacity: leftOpacity2.value,
  }));
  const leftRingStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: leftScale3.value }],
    opacity: leftOpacity3.value,
  }));

  const rightRingStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: rightScale1.value }],
    opacity: rightOpacity1.value,
  }));
  const rightRingStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: rightScale2.value }],
    opacity: rightOpacity2.value,
  }));
  const rightRingStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: rightScale3.value }],
    opacity: rightOpacity3.value,
  }));

  if (!active) return null;

  return (
    <View style={styles.absoluteContainer} pointerEvents="none">
      {/* Left Phone Radar Center */}
      <View style={[styles.radarOrigin, styles.leftOrigin]}>
        <Animated.View
          style={[
            styles.radarWave,
            { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
            leftRingStyle1,
          ]}
        />
        <Animated.View
          style={[
            styles.radarWave,
            { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
            leftRingStyle2,
          ]}
        />
        <Animated.View
          style={[
            styles.radarWave,
            { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
            leftRingStyle3,
          ]}
        />
      </View>

      {/* Right Phone Radar Center */}
      <View style={[styles.radarOrigin, styles.rightOrigin]}>
        <Animated.View
          style={[
            styles.radarWave,
            { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
            rightRingStyle1,
          ]}
        />
        <Animated.View
          style={[
            styles.radarWave,
            { borderColor: colors.accent, backgroundColor: colors.accent + '10' },
            rightRingStyle2,
          ]}
        />
        <Animated.View
          style={[
            styles.radarWave,
            { borderColor: colors.accent, backgroundColor: colors.accent + '08' },
            rightRingStyle3,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  radarOrigin: {
    position: 'absolute',
    top: '50%',
    marginTop: -40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftOrigin: {
    left: '22%',
    marginLeft: -40,
  },
  rightOrigin: {
    right: '22%',
    marginRight: -40,
  },
  radarWave: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
  },
});
