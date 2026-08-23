import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Lock, ShieldCheck, AlertTriangle, Check, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { NearbySessionState } from '../../sync/nearby/types';
import { Radii, TypographyScale } from '../../theme/tokens';

export interface NearbyConnectionProps {
  sessionState: NearbySessionState;
  verificationCode?: string;
  errorMessage?: string;
  reduceMotion?: boolean;
}

export const NearbyConnection: React.FC<NearbyConnectionProps> = ({
  sessionState,
  verificationCode,
  errorMessage,
  reduceMotion = false,
}) => {
  const { colors, isDark } = useTheme();

  // Moving light pulse along the beam
  const lightPulseX = useSharedValue(-50);
  const crystalRotate = useSharedValue(0);

  const isBeamVisible =
    sessionState === 'CONNECTING' ||
    sessionState === 'PREPARING_TRANSFER' ||
    sessionState === 'TRANSFERRING' ||
    sessionState === 'MERGING' ||
    sessionState === 'COMPLETED';

  useEffect(() => {
    if (reduceMotion || !isBeamVisible) {
      lightPulseX.value = -50;
      crystalRotate.value = 0;
      return;
    }

    // Moving beam pulse
    lightPulseX.value = withRepeat(
      withTiming(50, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // CRDT Crystal rotation
    crystalRotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      cancelAnimation(lightPulseX);
      cancelAnimation(crystalRotate);
    };
  }, [isBeamVisible, reduceMotion]);

  const animatedPulseStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      transform: [{ translateX: lightPulseX.value }],
    };
  });

  const animatedCrystalStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      transform: [{ rotate: `${crystalRotate.value}deg` }],
    };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1. SECURE BEAM LINE */}
      {isBeamVisible && (
        <View style={styles.beamWrapper}>
          {/* Background beam */}
          <View
            style={[
              styles.beamLine,
              {
                backgroundColor:
                  sessionState === 'COMPLETED'
                    ? colors.success
                    : colors.accent,
                opacity: 0.7,
              },
            ]}
          />
          {/* Moving glowing energy light */}
          {!reduceMotion && (
            <Animated.View
              style={[
                styles.beamPulse,
                {
                  backgroundColor: '#FFFFFF',
                  shadowColor:
                    sessionState === 'COMPLETED'
                      ? colors.success
                      : colors.accent,
                },
                animatedPulseStyle,
              ]}
            />
          )}
        </View>
      )}

      {/* 2. VERIFYING LOCK BADGE */}
      {sessionState === 'VERIFYING' && (
        <View
          style={[
            styles.centerBadge,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        >
          <View style={[styles.badgeIconWrap, { backgroundColor: colors.accent + '20' }]}>
            <Lock size={16} color={colors.accent} />
          </View>
          <Text style={[styles.badgeTitle, { color: colors.textPrimary }]}>Verify Devices</Text>
          {verificationCode ? (
            <View style={[styles.codePill, { backgroundColor: colors.accent + '15' }]}>
              <Text style={[styles.codeText, { color: colors.accent }]}>{verificationCode}</Text>
            </View>
          ) : (
            <Text style={[styles.badgeSubtitle, { color: colors.textSecondary }]}>
              Confirm pairing
            </Text>
          )}
        </View>
      )}

      {/* 3. CRDT MERGING CRYSTAL */}
      {sessionState === 'MERGING' && (
        <View style={styles.crdtNodeWrapper}>
          <Animated.View
            style={[
              styles.crdtDiamond,
              {
                borderColor: colors.accent,
                backgroundColor: isDark ? '#1C2230' : '#FFFFFF',
                shadowColor: colors.accent,
              },
              animatedCrystalStyle,
            ]}
          >
            <Sparkles size={14} color={colors.accent} />
          </Animated.View>
          <View style={[styles.crdtTag, { backgroundColor: colors.accent + '20' }]}>
            <Text style={[styles.crdtTagText, { color: colors.accent }]}>CRDT MERGE</Text>
          </View>
        </View>
      )}

      {/* 4. ERROR BADGE */}
      {sessionState === 'ERROR' && (
        <View
          style={[
            styles.centerBadge,
            {
              backgroundColor: isDark ? '#2D1B1B' : '#FFF2F2',
              borderColor: colors.error,
              shadowColor: colors.error,
            },
          ]}
        >
          <AlertTriangle size={22} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>Sync Incomplete</Text>
          {errorMessage ? (
            <Text numberOfLines={2} style={[styles.errorDetail, { color: colors.textSecondary }]}>
              {errorMessage}
            </Text>
          ) : null}
        </View>
      )}

      {/* 5. TIMEOUT BADGE */}
      {sessionState === 'TIMEOUT' && (
        <View
          style={[
            styles.centerBadge,
            {
              backgroundColor: isDark ? '#22252A' : '#F5F5FA',
              borderColor: colors.separator,
            },
          ]}
        >
          <Text style={[styles.timeoutDots, { color: colors.textTertiary }]}>• • •</Text>
          <Text style={[styles.timeoutText, { color: colors.textSecondary }]}>
            No device found
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beamWrapper: {
    width: 140,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beamLine: {
    width: '100%',
    height: 3.5,
    borderRadius: 2,
  },
  beamPulse: {
    position: 'absolute',
    width: 24,
    height: 7,
    borderRadius: 3.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  centerBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    maxWidth: 160,
  },
  badgeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeTitle: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeSubtitle: {
    ...TypographyScale.caption2,
    marginTop: 2,
    textAlign: 'center',
  },
  codePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    marginTop: 4,
  },
  codeText: {
    ...TypographyScale.subhead,
    fontWeight: '800',
    letterSpacing: 2,
  },
  crdtNodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crdtDiamond: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  crdtTag: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  crdtTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorTitle: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginTop: 4,
  },
  errorDetail: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  timeoutDots: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
  },
  timeoutText: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
});
