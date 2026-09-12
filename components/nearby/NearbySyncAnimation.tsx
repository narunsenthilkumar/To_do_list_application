import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Zap,
  ArrowRight,
  RefreshCw,
  X,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import {
  NearbySessionState,
  ProximityLevel,
  TransferDirection,
  NearbySessionSummary,
} from '../../sync/nearby/types';
import { NearbyPhone } from './NearbyPhone';
import { NearbyRadar } from './NearbyRadar';
import { NearbyConnection } from './NearbyConnection';
import { NearbyTransferParticles } from './NearbyTransferParticles';
import { NearbyProgress } from './NearbyProgress';
import { NearbySuccess } from './NearbySuccess';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';

const { width } = Dimensions.get('window');

export interface NearbyAnimationProps {
  sessionState: NearbySessionState;
  proximity: ProximityLevel;
  transferProgress: number;
  direction?: TransferDirection;
  verificationCode?: string;
  summary?: NearbySessionSummary | null;
  errorMessage?: string;
  targetDeviceName?: string;
  stageName?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  onConfirmVerification?: () => void;
  onConnect?: () => void;
  onTriggerBump?: () => void;
  reduceMotion?: boolean;
}

export const NearbySyncAnimation: React.FC<NearbyAnimationProps> = ({
  sessionState,
  proximity,
  transferProgress,
  direction = 'BIDIRECTIONAL',
  verificationCode,
  summary = null,
  errorMessage = '',
  targetDeviceName = 'KIVENTA Device',
  stageName = '',
  onCancel,
  onRetry,
  onConfirmVerification,
  onConnect,
  onTriggerBump,
  reduceMotion = false,
}) => {
  const { colors, isDark } = useTheme();

  // Shared values for Phone horizontal separation
  const leftPhoneX = useSharedValue(-95);
  const rightPhoneX = useSharedValue(95);
  const phonesScale = useSharedValue(1);

  // Determine target distance based on real proximity and session state
  useEffect(() => {
    if (reduceMotion) {
      leftPhoneX.value = -65;
      rightPhoneX.value = 65;
      phonesScale.value = 1;
      return;
    }

    let targetLeft = -95;
    let targetRight = 95;
    let targetScale = 1;

    if (sessionState === 'SEARCHING' || sessionState === 'SCANNING' || sessionState === 'IDLE') {
      targetLeft = -95;
      targetRight = 95;
    } else if (sessionState === 'DEVICE_FOUND' || sessionState === 'APPROACHING' || sessionState === 'PROXIMITY_CHECK') {
      if (proximity === 'VERY_NEAR') {
        targetLeft = -42;
        targetRight = 42;
      } else if (proximity === 'NEAR') {
        targetLeft = -65;
        targetRight = 65;
      } else {
        // FAR or UNKNOWN
        targetLeft = -88;
        targetRight = 88;
      }
    } else if (sessionState === 'BUMP_DETECTED') {
      // Rapid impact snap to touch tops
      targetLeft = -20;
      targetRight = 20;
      targetScale = 1.08;
    } else if (
      sessionState === 'PAIRING' ||
      sessionState === 'VERIFYING' ||
      sessionState === 'CONNECTING' ||
      sessionState === 'PREPARING_TRANSFER' ||
      sessionState === 'TRANSFERRING' ||
      sessionState === 'MERGING'
    ) {
      // Stable distance for data beam & lock code
      targetLeft = -65;
      targetRight = 65;
      targetScale = 1;
    } else if (sessionState === 'COMPLETED') {
      targetLeft = -60;
      targetRight = 60;
      targetScale = 1.03;
    } else if (sessionState === 'CANCELLED' || sessionState === 'TIMEOUT' || sessionState === 'ERROR') {
      targetLeft = -105;
      targetRight = 105;
      targetScale = 0.96;
    }

    if (sessionState === 'BUMP_DETECTED') {
      // Fast impact spring
      leftPhoneX.value = withSpring(targetLeft, { damping: 10, stiffness: 220 });
      rightPhoneX.value = withSpring(targetRight, { damping: 10, stiffness: 220 });
      phonesScale.value = withSpring(targetScale, { damping: 8, stiffness: 180 });
    } else {
      leftPhoneX.value = withSpring(targetLeft, { damping: 16, stiffness: 120 });
      rightPhoneX.value = withSpring(targetRight, { damping: 16, stiffness: 120 });
      phonesScale.value = withTiming(targetScale, { duration: 300, easing: Easing.out(Easing.ease) });
    }
  }, [sessionState, proximity, reduceMotion]);

  const leftAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: leftPhoneX.value },
      { scale: phonesScale.value },
    ],
  }));

  const rightAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rightPhoneX.value },
      { scale: phonesScale.value },
    ],
  }));

  const isSearching = sessionState === 'SEARCHING' || sessionState === 'SCANNING';
  const isFound = sessionState === 'DEVICE_FOUND' || sessionState === 'APPROACHING' || sessionState === 'PROXIMITY_CHECK';
  const isVerifying = sessionState === 'VERIFYING';
  const isTransferringOrMerging =
    sessionState === 'CONNECTING' ||
    sessionState === 'PREPARING_TRANSFER' ||
    sessionState === 'TRANSFERRING' ||
    sessionState === 'MERGING';
  const isCompleted = sessionState === 'COMPLETED';
  const isFailed = sessionState === 'ERROR' || sessionState === 'TIMEOUT' || sessionState === 'CANCELLED';

  return (
    <View style={styles.container}>
      {/* 1. ANIMATION STAGE ARENA */}
      <View style={styles.stageArena}>
        {/* BLE Radar Waves in background */}
        <NearbyRadar active={isSearching} reduceMotion={reduceMotion} />

        {/* Secure connection beam & lock / CRDT badges */}
        <NearbyConnection
          sessionState={sessionState}
          verificationCode={verificationCode}
          errorMessage={errorMessage}
          reduceMotion={reduceMotion}
        />

        {/* Left Phone Silhouette (Current Device) */}
        <Animated.View style={[styles.phoneWrapper, leftAnimatedStyle]}>
          <NearbyPhone
            side="left"
            deviceName="My Phone"
            isCurrentDevice={true}
            sessionState={sessionState}
            reduceMotion={reduceMotion}
          />
        </Animated.View>

        {/* Right Phone Silhouette (Peer Device) */}
        <Animated.View style={[styles.phoneWrapper, rightAnimatedStyle]}>
          <NearbyPhone
            side="right"
            deviceName={targetDeviceName}
            isCurrentDevice={false}
            sessionState={sessionState}
            reduceMotion={reduceMotion}
          />
        </Animated.View>

        {/* Transfer Particles & Bump Impact */}
        <NearbyTransferParticles
          sessionState={sessionState}
          direction={direction}
          reduceMotion={reduceMotion}
        />
      </View>

      {/* 2. CONTEXTUAL CONTENT AREA */}
      <View style={styles.infoArea}>
        {/* SEARCHING STATE */}
        {isSearching && (
          <View style={styles.centerBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Looking for nearby devices...
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Hold another KIVENTA device close to automatically discover and pair.
            </Text>
          </View>
        )}

        {/* DEVICE FOUND / APPROACHING STATE */}
        {isFound && (
          <View style={styles.centerBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {targetDeviceName} Found
            </Text>

            <View style={[styles.proximityBadge, { backgroundColor: colors.success + '20' }]}>
              <Zap size={13} color={colors.success} style={{ marginRight: 5 }} />
              <Text style={[styles.proximityText, { color: colors.success }]}>
                {proximity === 'VERY_NEAR'
                  ? 'Very close — Bump phones or tap Connect'
                  : proximity === 'NEAR'
                  ? 'Nearby device within range'
                  : 'KIVENTA device detected'}
              </Text>
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Bring the tops of both devices together gently or tap Connect below.
            </Text>

            <View style={styles.actionRow}>
              {onTriggerBump && (
                <AnimatedPressable
                  profile="smallControl"
                  onPress={onTriggerBump}
                  style={[styles.secondaryActionBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
                    Simulate Bump 💥
                  </Text>
                </AnimatedPressable>
              )}

              {onConnect && (
                <AnimatedPressable
                  profile="primaryButton"
                  onPress={onConnect}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.accent, flex: 1 }]}
                >
                  <Text style={styles.primaryActionText}>Connect</Text>
                  <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </AnimatedPressable>
              )}
            </View>
          </View>
        )}

        {/* BUMP DETECTED STATE */}
        {sessionState === 'BUMP_DETECTED' && (
          <View style={styles.centerBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Bump Detected!</Text>
            <Text style={[styles.description, { color: colors.accent }]}>
              Correlating motion sensors & initiating secure link...
            </Text>
          </View>
        )}

        {/* VERIFYING STATE */}
        {isVerifying && (
          <View style={styles.centerBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Verify Devices</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Ensure both devices display the matching code:
            </Text>

            <View style={[styles.codeDisplayBox, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={[styles.codeDisplayText, { color: colors.accent }]}>
                {verificationCode || '483 921'}
              </Text>
            </View>

            <View style={styles.actionRow}>
              {onCancel && (
                <AnimatedPressable
                  profile="smallControl"
                  onPress={onCancel}
                  style={[styles.secondaryActionBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>Cancel</Text>
                </AnimatedPressable>
              )}

              {onConfirmVerification && (
                <AnimatedPressable
                  profile="primaryButton"
                  onPress={onConfirmVerification}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.accent, flex: 1 }]}
                >
                  <ShieldCheck size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionText}>Confirm & Sync</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        )}

        {/* TRANSFERRING / MERGING STATE */}
        {isTransferringOrMerging && (
          <View style={styles.centerBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {sessionState === 'MERGING' ? 'Merging Changes' : 'Synchronizing'}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {stageName || (sessionState === 'MERGING' ? 'Merging changes safely with CRDT...' : 'Transferring changes...')}
            </Text>

            <NearbyProgress
              progressPercent={transferProgress}
              stageName={stageName}
              reduceMotion={reduceMotion}
            />
          </View>
        )}

        {/* COMPLETED STATE */}
        {isCompleted && (
          <NearbySuccess
            summary={summary}
            onDone={onCancel || (() => {})}
            reduceMotion={reduceMotion}
          />
        )}

        {/* FAILED / ERROR / TIMEOUT / CANCELLED STATE */}
        {isFailed && (
          <View style={styles.centerBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {sessionState === 'TIMEOUT'
                ? 'No nearby KIVENTA device found'
                : sessionState === 'CANCELLED'
                ? 'Nearby Sync cancelled'
                : "Sync couldn't be completed"}
            </Text>

            {errorMessage ? (
              <Text style={[styles.errorDetailText, { color: colors.error }]}>
                {errorMessage}
              </Text>
            ) : null}

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {sessionState === 'TIMEOUT'
                ? 'Make sure Nearby Sync is active and in range.'
                : 'Your local task and project data are safe and unchanged.'}
            </Text>

            <View style={styles.actionRow}>
              {onCancel && (
                <AnimatedPressable
                  profile="smallControl"
                  onPress={onCancel}
                  style={[styles.secondaryActionBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>Close</Text>
                </AnimatedPressable>
              )}

              {onRetry && (
                <AnimatedPressable
                  profile="primaryButton"
                  onPress={onRetry}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.accent, flex: 1 }]}
                >
                  <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionText}>Try Again</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageArena: {
    width: '100%',
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: Spacing.sm,
  },
  phoneWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoArea: {
    width: '100%',
    marginTop: Spacing.xs,
    minHeight: 120,
    justifyContent: 'center',
  },
  centerBlock: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...TypographyScale.title3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    ...TypographyScale.body,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  proximityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xs,
  },
  proximityText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  codeDisplayBox: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.lg,
    marginVertical: Spacing.sm,
  },
  codeDisplayText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorDetailText: {
    ...TypographyScale.subhead,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.xs,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
  },
  primaryActionText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    ...TypographyScale.subhead,
    fontWeight: '600',
  },
});
