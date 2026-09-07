import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldAlert, ArrowLeft, Clock, Lock, Sparkles, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { useTheme, useFocusTimer } from '../../store/useTaskora';
import { FocusShieldService } from '../../services/focus/FocusShieldService';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { haptics } from '../../services/haptics';

export default function FocusShieldModal() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { blockedPkg } = useLocalSearchParams<{ blockedPkg?: string }>();
  const { secondsRemaining, resetTimer, activeSession, settings } = useFocusTimer();

  const [appName, setAppName] = useState('Blocked Application');

  useEffect(() => {
    if (blockedPkg) {
      FocusShieldService.fetchInstalledApps().then((apps) => {
        const found = apps.find((a) => a.packageName === blockedPkg);
        if (found) {
          setAppName(found.appName);
        } else {
          const simpleName = blockedPkg.split('.').pop();
          if (simpleName) {
            setAppName(simpleName.charAt(0).toUpperCase() + simpleName.slice(1));
          }
        }
      });
    }
  }, [blockedPkg]);

  // Prevent accidental hardware back button bypass
  useEffect(() => {
    const onBackPress = () => {
      handleReturnToFocus();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Pulsing shield animation
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200 }),
        withTiming(1.0, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleReturnToFocus = () => {
    haptics.medium();
    router.replace('/(tabs)/focus' as any);
  };

  const handleEndSession = () => {
    haptics.warning();
    Alert.alert(
      'End Focus Session?',
      'Are you sure you want to end your active focus session early? Your distraction shield will be deactivated.',
      [
        { text: 'Keep Focusing', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            await resetTimer();
            router.replace('/(tabs)/focus' as any);
          },
        },
      ]
    );
  };

  const handleEmergencyUnlock = () => {
    haptics.medium();
    Alert.alert(
      'Emergency Unlock',
      `Grant 5 minutes of access to ${appName}? Your focus session will continue running in the background.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock 5 Mins',
          style: 'default',
          onPress: async () => {
            await FocusShieldService.setEmergencyUnlock(5);
            router.replace('/(tabs)/focus' as any);
          },
        },
      ]
    );
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface style={{ flex: 1 }}>
      <View style={styles.outerContainer}>
        <View style={styles.innerWrapper}>
          {/* Top Shield Header */}
          <View style={styles.topHeader}>
            <Animated.View
              style={[
                styles.shieldIconCircle,
                { backgroundColor: colors.accent + '20' },
                animatedPulseStyle,
              ]}
            >
              <ShieldAlert size={44} color={colors.accent} />
            </Animated.View>

            <Text style={[styles.headingTitle, { color: colors.textPrimary }]}>
              FOCUS SESSION ACTIVE
            </Text>
            <Text style={[styles.headingSub, { color: colors.textSecondary }]}>
              Stay focused on what matters.
            </Text>
          </View>

          {/* Central Card */}
          <ElevatedCard style={styles.contentCard}>
            <View style={[styles.blockedBadge, { backgroundColor: colors.warning + '18' }]}>
              <Lock size={14} color={colors.warning} style={{ marginRight: 6 }} />
              <Text style={[styles.blockedBadgeText, { color: colors.warning }]}>
                {appName.toUpperCase()} IS BLOCKED
              </Text>
            </View>

            <Text style={[styles.motivationalMessage, { color: colors.textPrimary }]}>
              Complete your focus session before opening {appName}.
            </Text>

            {/* Timer Block */}
            <View style={[styles.timerBlock, { backgroundColor: colors.secondaryBackground }]}>
              <Clock size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.timerTimeText, { color: colors.textPrimary }]}>
                {formatTime(secondsRemaining)}
              </Text>
              <Text style={[styles.timerLabelText, { color: colors.textTertiary }]}>REMAINING</Text>
            </View>
          </ElevatedCard>

          {/* Action Buttons */}
          <View style={[styles.actionsContainer, { paddingBottom: bottomInset }]}>
            <AnimatedPressable
              profile="primaryButton"
              onPress={handleReturnToFocus}
              style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
            >
              <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>Return to Taskora Focus</Text>
            </AnimatedPressable>

            {settings.shieldSettings?.emergencyUnlockAllowed && (
              <AnimatedPressable
                profile="smallControl"
                onPress={handleEmergencyUnlock}
                style={[styles.secondaryActionBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.secondaryActionBtnText, { color: colors.textPrimary }]}>
                  Emergency Unlock (5 Mins)
                </Text>
              </AnimatedPressable>
            )}

            <AnimatedPressable
              profile="destructiveAction"
              onPress={handleEndSession}
              style={styles.textLinkBtn}
            >
              <Text style={[styles.textLinkBtnText, { color: colors.error }]}>End Focus Session</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingTop: Spacing.xl * 2,
  },
  topHeader: {
    alignItems: 'center',
  },
  shieldIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headingTitle: {
    ...TypographyScale.title2,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  headingSub: {
    ...TypographyScale.body,
    marginTop: 4,
    textAlign: 'center',
  },
  contentCard: {
    padding: Spacing.xl,
    borderRadius: Radii.xl,
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    marginBottom: Spacing.md,
  },
  blockedBadgeText: {
    ...TypographyScale.caption1,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  motivationalMessage: {
    ...TypographyScale.headline,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  timerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    width: '100%',
    justifyContent: 'center',
  },
  timerTimeText: {
    ...TypographyScale.title1,
    fontWeight: '800',
    fontSize: 28,
    marginRight: Spacing.md,
  },
  timerLabelText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionsContainer: {
    gap: Spacing.sm,
    width: '100%',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    borderRadius: Radii.lg,
  },
  primaryActionBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  secondaryActionBtnText: {
    ...TypographyScale.subhead,
    fontWeight: '600',
  },
  textLinkBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  textLinkBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
});
