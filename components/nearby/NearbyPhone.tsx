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
import { Check, ListTodo } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { NearbySessionState } from '../../sync/nearby/types';
import { TypographyScale } from '../../theme/tokens';

export interface NearbyPhoneProps {
  side: 'left' | 'right';
  deviceName: string;
  isCurrentDevice?: boolean;
  sessionState: NearbySessionState;
  reduceMotion?: boolean;
  scaleOffset?: number;
}

export const NearbyPhone: React.FC<NearbyPhoneProps> = ({
  side,
  deviceName,
  isCurrentDevice = false,
  sessionState,
  reduceMotion = false,
}) => {
  const { colors, isDark } = useTheme();

  // Floating vertical offset shared value
  const floatY = useSharedValue(0);
  const tiltDeg = useSharedValue(side === 'left' ? 2 : -2);

  useEffect(() => {
    if (reduceMotion) {
      floatY.value = 0;
      tiltDeg.value = 0;
      return;
    }

    // Offset float animation timing so Phone A and Phone B oscillate out of phase
    const delay = side === 'left' ? 0 : 700;
    const duration = 2400;
    const amplitude = 5;

    const timer = setTimeout(() => {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.quad) }),
          withTiming(amplitude, { duration: duration / 2, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );

      tiltDeg.value = withRepeat(
        withSequence(
          withTiming(side === 'left' ? -1.5 : 1.5, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(side === 'left' ? 2 : -2, { duration: duration / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, delay);

    return () => {
      clearTimeout(timer);
      cancelAnimation(floatY);
      cancelAnimation(tiltDeg);
    };
  }, [side, reduceMotion]);

  const animatedFloatStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      transform: [
        { translateY: floatY.value },
        { rotateZ: `${tiltDeg.value}deg` },
      ],
    };
  });

  // Dynamic glow color based on session state
  const getGlowColor = () => {
    if (sessionState === 'ERROR') return colors.error;
    if (sessionState === 'COMPLETED') return colors.success;
    if (sessionState === 'TRANSFERRING' || sessionState === 'MERGING') return colors.accent;
    if (sessionState === 'VERIFYING' || sessionState === 'CONNECTING') return colors.accent;
    if (sessionState === 'BUMP_DETECTED') return '#FFFFFF';
    return isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
  };

  const glowColor = getGlowColor();

  return (
    <Animated.View style={[styles.wrapper, animatedFloatStyle]}>
      {/* Device Silhouette Container */}
      <View
        style={[
          styles.phoneFrame,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FAFAFC',
            borderColor: glowColor,
            shadowColor: glowColor,
          },
        ]}
      >
        {/* Dynamic Island / Notch */}
        <View
          style={[
            styles.dynamicIsland,
            { backgroundColor: isDark ? '#000000' : '#2C2C2E' },
          ]}
        />

        {/* Screen Glass Area */}
        <View
          style={[
            styles.screenGlass,
            {
              backgroundColor: isDark
                ? 'rgba(30, 32, 40, 0.7)'
                : 'rgba(240, 242, 248, 0.85)',
            },
          ]}
        >
          {/* Abstract Taskora Wireframe */}
          <View style={styles.wireframeHeader}>
            <View
              style={[
                styles.wireframeDot,
                { backgroundColor: colors.accent, opacity: 0.8 },
              ]}
            />
            <View
              style={[
                styles.wireframeTitleBar,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)' },
              ]}
            />
          </View>

          {/* Wireframe Mock Task Rows */}
          <View style={styles.wireframeRows}>
            <View style={styles.wireframeRow}>
              <View
                style={[
                  styles.checkDot,
                  {
                    borderColor:
                      sessionState === 'COMPLETED'
                        ? colors.success
                        : colors.accent,
                    backgroundColor:
                      sessionState === 'COMPLETED'
                        ? colors.success + '30'
                        : 'transparent',
                  },
                ]}
              >
                {sessionState === 'COMPLETED' && (
                  <Check size={8} color={colors.success} />
                )}
              </View>
              <View
                style={[
                  styles.wireframeBar,
                  {
                    width: '68%',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                  },
                ]}
              />
            </View>

            <View style={styles.wireframeRow}>
              <View
                style={[
                  styles.checkDot,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  },
                ]}
              />
              <View
                style={[
                  styles.wireframeBar,
                  {
                    width: '50%',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              />
            </View>

            <View style={styles.wireframeRow}>
              <View
                style={[
                  styles.checkDot,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  },
                ]}
              />
              <View
                style={[
                  styles.wireframeBar,
                  {
                    width: '78%',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              />
            </View>
          </View>

          {/* Central state badge icon inside phone screen */}
          {(sessionState === 'TRANSFERRING' || sessionState === 'MERGING') && (
            <View
              style={[
                styles.screenCenterPill,
                { backgroundColor: colors.accent + '25' },
              ]}
            >
              <ListTodo size={12} color={colors.accent} />
            </View>
          )}
        </View>

        {/* Bottom Home Indicator */}
        <View
          style={[
            styles.homeIndicator,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' },
          ]}
        />
      </View>

      {/* Device Label */}
      <View style={styles.labelWrap}>
        <Text
          numberOfLines={1}
          style={[
            styles.deviceName,
            { color: colors.textPrimary },
          ]}
        >
          {isCurrentDevice ? 'This Device' : deviceName || 'Nearby Device'}
        </Text>
        <Text
          style={[
            styles.deviceRole,
            { color: isCurrentDevice ? colors.accent : colors.textTertiary },
          ]}
        >
          {isCurrentDevice ? 'Local' : 'Peer'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: 96,
  },
  phoneFrame: {
    width: 82,
    height: 140,
    borderRadius: 22,
    borderWidth: 2.5,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  dynamicIsland: {
    width: 26,
    height: 7,
    borderRadius: 3.5,
    marginTop: 2,
  },
  screenGlass: {
    width: '100%',
    flex: 1,
    borderRadius: 15,
    marginTop: 4,
    marginBottom: 4,
    padding: 6,
    justifyContent: 'space-between',
  },
  wireframeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  wireframeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wireframeTitleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  wireframeRows: {
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  wireframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wireframeBar: {
    height: 4,
    borderRadius: 2,
  },
  screenCenterPill: {
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  homeIndicator: {
    width: 24,
    height: 3,
    borderRadius: 1.5,
    marginBottom: 2,
  },
  labelWrap: {
    alignItems: 'center',
    marginTop: 8,
    maxWidth: 90,
  },
  deviceName: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    textAlign: 'center',
  },
  deviceRole: {
    ...TypographyScale.caption2,
    fontWeight: '500',
    marginTop: 1,
    fontSize: 10,
  },
});
