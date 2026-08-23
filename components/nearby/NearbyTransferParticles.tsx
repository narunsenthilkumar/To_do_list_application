import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
import { NearbySessionState, TransferDirection } from '../../sync/nearby/types';

export interface NearbyTransferParticlesProps {
  sessionState: NearbySessionState;
  direction?: TransferDirection;
  reduceMotion?: boolean;
}

const ABSTRACT_SYMBOLS = ['✓', '📁', '•', '↻', '☑', '+'];

export const NearbyTransferParticles: React.FC<NearbyTransferParticlesProps> = ({
  sessionState,
  direction = 'BIDIRECTIONAL',
  reduceMotion = false,
}) => {
  const { colors, isDark } = useTheme();

  // Particle 1-4 X positions (Left to Right)
  const p1X = useSharedValue(-60);
  const p1Opacity = useSharedValue(0);
  const p2X = useSharedValue(-60);
  const p2Opacity = useSharedValue(0);

  // Particle 3-4 X positions (Right to Left for Bidirectional/Receive)
  const p3X = useSharedValue(60);
  const p3Opacity = useSharedValue(0);
  const p4X = useSharedValue(60);
  const p4Opacity = useSharedValue(0);

  // Bump Impact Burst values
  const impactScale = useSharedValue(0.2);
  const impactOpacity = useSharedValue(0);
  const sparkSpread = useSharedValue(0);

  const isTransferring = sessionState === 'TRANSFERRING';
  const isMerging = sessionState === 'MERGING';
  const isBump = sessionState === 'BUMP_DETECTED';

  // Transfer particles effect
  useEffect(() => {
    if (reduceMotion || (!isTransferring && !isMerging)) {
      p1X.value = -60;
      p1Opacity.value = 0;
      p2X.value = -60;
      p2Opacity.value = 0;
      p3X.value = 60;
      p3Opacity.value = 0;
      p4X.value = 60;
      p4Opacity.value = 0;
      return;
    }

    const duration = isMerging ? 900 : 1300;
    const destRight = isMerging ? 0 : 60;
    const destLeft = isMerging ? 0 : -60;

    // Particle 1 (Left -> Right)
    p1X.value = withRepeat(
      withTiming(destRight, { duration, easing: Easing.linear }),
      -1,
      false
    );
    p1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(1, { duration: duration - 300 }),
        withTiming(0, { duration: 150 })
      ),
      -1,
      false
    );

    // Particle 2 (Left -> Right, Staggered)
    const t2 = setTimeout(() => {
      p2X.value = withRepeat(
        withTiming(destRight, { duration, easing: Easing.linear }),
        -1,
        false
      );
      p2Opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 150 }),
          withTiming(1, { duration: duration - 300 }),
          withTiming(0, { duration: 150 })
        ),
        -1,
        false
      );
    }, duration / 2);

    // Particle 3 (Right -> Left for BIDIRECTIONAL / RECEIVE / MERGING)
    if (direction === 'BIDIRECTIONAL' || direction === 'RECEIVE' || isMerging) {
      const t3 = setTimeout(() => {
        p3X.value = withRepeat(
          withTiming(destLeft, { duration, easing: Easing.linear }),
          -1,
          false
        );
        p3Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(1, { duration: duration - 300 }),
            withTiming(0, { duration: 150 })
          ),
          -1,
          false
        );
      }, 200);

      const t4 = setTimeout(() => {
        p4X.value = withRepeat(
          withTiming(destLeft, { duration, easing: Easing.linear }),
          -1,
          false
        );
        p4Opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(1, { duration: duration - 300 }),
            withTiming(0, { duration: 150 })
          ),
          -1,
          false
        );
      }, (duration / 2) + 200);

      return () => {
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        cancelAnimation(p1X);
        cancelAnimation(p1Opacity);
        cancelAnimation(p2X);
        cancelAnimation(p2Opacity);
        cancelAnimation(p3X);
        cancelAnimation(p3Opacity);
        cancelAnimation(p4X);
        cancelAnimation(p4Opacity);
      };
    }

    return () => {
      clearTimeout(t2);
      cancelAnimation(p1X);
      cancelAnimation(p1Opacity);
      cancelAnimation(p2X);
      cancelAnimation(p2Opacity);
    };
  }, [isTransferring, isMerging, direction, reduceMotion]);

  // Bump Impact Burst effect
  useEffect(() => {
    if (isBump && !reduceMotion) {
      impactScale.value = withSequence(
        withTiming(1.6, { duration: 250, easing: Easing.out(Easing.back(1.5)) }),
        withTiming(2.0, { duration: 200, easing: Easing.out(Easing.quad) })
      );
      impactOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0, { duration: 370, easing: Easing.out(Easing.quad) })
      );
      sparkSpread.value = withTiming(38, { duration: 450, easing: Easing.out(Easing.cubic) });
    } else {
      impactScale.value = 0.2;
      impactOpacity.value = 0;
      sparkSpread.value = 0;
    }
  }, [isBump, reduceMotion]);

  const p1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: p1X.value }, { translateY: -10 }],
    opacity: p1Opacity.value,
  }));
  const p2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: p2X.value }, { translateY: 10 }],
    opacity: p2Opacity.value,
  }));
  const p3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: p3X.value }, { translateY: -10 }],
    opacity: p3Opacity.value,
  }));
  const p4Style = useAnimatedStyle(() => ({
    transform: [{ translateX: p4X.value }, { translateY: 10 }],
    opacity: p4Opacity.value,
  }));

  const impactRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: impactScale.value }],
    opacity: impactOpacity.value,
  }));

  const spark1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -sparkSpread.value }, { translateY: -sparkSpread.value }],
    opacity: impactOpacity.value,
  }));
  const spark2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: sparkSpread.value }, { translateY: -sparkSpread.value }],
    opacity: impactOpacity.value,
  }));
  const spark3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -sparkSpread.value }, { translateY: sparkSpread.value }],
    opacity: impactOpacity.value,
  }));
  const spark4Style = useAnimatedStyle(() => ({
    transform: [{ translateX: sparkSpread.value }, { translateY: sparkSpread.value }],
    opacity: impactOpacity.value,
  }));

  return (
    <View style={styles.absoluteContainer} pointerEvents="none">
      {/* 1. BUMP IMPACT BURST */}
      {isBump && (
        <View style={styles.centerContainer}>
          {/* Shockwave Ring */}
          <Animated.View
            style={[
              styles.impactShockwave,
              { borderColor: colors.accent, backgroundColor: colors.accent + '30' },
              impactRingStyle,
            ]}
          />
          {/* Radiating Sparkles */}
          <Animated.Text style={[styles.sparkleText, { color: colors.accent }, spark1Style]}>
            ✦
          </Animated.Text>
          <Animated.Text style={[styles.sparkleText, { color: '#FFD700' }, spark2Style]}>
            ✦
          </Animated.Text>
          <Animated.Text style={[styles.sparkleText, { color: colors.accent }, spark3Style]}>
            ✦
          </Animated.Text>
          <Animated.Text style={[styles.sparkleText, { color: '#FFD700' }, spark4Style]}>
            ✦
          </Animated.Text>
          <Animated.Text style={[styles.impactCenterEmoji, impactRingStyle]}>
            💥
          </Animated.Text>
        </View>
      )}

      {/* 2. TRANSFER PARTICLES */}
      {(isTransferring || isMerging) && (
        <View style={styles.centerContainer}>
          <Animated.View
            style={[
              styles.tokenBubble,
              { backgroundColor: colors.accent, shadowColor: colors.accent },
              p1Style,
            ]}
          >
            <Text style={styles.tokenText}>{ABSTRACT_SYMBOLS[0]}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.tokenBubble,
              { backgroundColor: colors.accentGradientEnd || colors.accent, shadowColor: colors.accent },
              p2Style,
            ]}
          >
            <Text style={styles.tokenText}>{ABSTRACT_SYMBOLS[1]}</Text>
          </Animated.View>

          {(direction === 'BIDIRECTIONAL' || direction === 'RECEIVE' || isMerging) && (
            <>
              <Animated.View
                style={[
                  styles.tokenBubble,
                  { backgroundColor: colors.success, shadowColor: colors.success },
                  p3Style,
                ]}
              >
                <Text style={styles.tokenText}>{ABSTRACT_SYMBOLS[3]}</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.tokenBubble,
                  { backgroundColor: colors.accent, shadowColor: colors.accent },
                  p4Style,
                ]}
              >
                <Text style={styles.tokenText}>{ABSTRACT_SYMBOLS[4]}</Text>
              </Animated.View>
            </>
          )}
        </View>
      )}
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
  centerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenBubble: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 3,
  },
  tokenText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  impactShockwave: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  sparkleText: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '900',
  },
  impactCenterEmoji: {
    position: 'absolute',
    fontSize: 22,
  },
});
