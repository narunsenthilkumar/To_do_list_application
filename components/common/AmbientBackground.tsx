import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { useTheme } from '../../store/ThemeContext';
import { MotionDurations } from '../../theme/animations';

const { width, height } = Dimensions.get('window');

interface AmbientBackgroundProps {
  children?: React.ReactNode;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ children }) => {
  const { colors, isDark } = useTheme();
  const pathname = usePathname();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(isDark ? 0.14 : 0.08);

  useEffect(() => {
    // Continuous 25s slow ambient breathing loop
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: MotionDurations.ambient / 2, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: MotionDurations.ambient / 2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(scale);
    };
  }, [pathname]);

  const animatedOrbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const topColor = isDark ? '#1C274C' : '#E0E7FF';      // Soft Indigo / Deep Blue
  const bottomColor = isDark ? '#2D1F47' : '#F3E8FF';   // Soft Lavender / Deep Purple

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryBackground }]}>
      {/* Top Right Ambient Glow Orb */}
      <Animated.View
        style={[
          styles.orb,
          styles.topOrb,
          { backgroundColor: topColor },
          animatedOrbStyle,
        ]}
      />

      {/* Bottom Left Ambient Glow Orb */}
      <Animated.View
        style={[
          styles.orb,
          styles.bottomOrb,
          { backgroundColor: bottomColor },
          animatedOrbStyle,
        ]}
      />

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 180,
    pointerEvents: 'none',
  },
  topOrb: {
    top: -60,
    right: -60,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
  },
  bottomOrb: {
    bottom: -90,
    left: -60,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
  },
});

