import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Check, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { NearbySessionSummary } from '../../sync/nearby/types';
import { ElevatedCard } from '../common/ElevatedCard';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';

export interface NearbySuccessProps {
  summary: NearbySessionSummary | null;
  onDone: () => void;
  reduceMotion?: boolean;
}

export const NearbySuccess: React.FC<NearbySuccessProps> = ({
  summary,
  onDone,
  reduceMotion = false,
}) => {
  const { colors, isDark } = useTheme();

  // Success checkmark entrance scale and sparkles
  const checkScale = useSharedValue(reduceMotion ? 1 : 0.4);
  const sparkleOpacity = useSharedValue(0);
  const sparkleSpread = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      checkScale.value = 1;
      sparkleOpacity.value = 0;
      return;
    }

    // Spring entrance for checkmark
    checkScale.value = withSpring(1, {
      damping: 12,
      stiffness: 140,
    });

    // Gentle radiating sparkles
    sparkleOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0.8, { duration: 1500 })
    );

    sparkleSpread.value = withTiming(36, {
      duration: 700,
      easing: Easing.out(Easing.back(1.4)),
    });

    return () => {
      cancelAnimation(checkScale);
      cancelAnimation(sparkleOpacity);
      cancelAnimation(sparkleSpread);
    };
  }, [reduceMotion]);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const spark1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -sparkleSpread.value }, { translateY: -sparkleSpread.value * 0.8 }],
    opacity: sparkleOpacity.value,
  }));
  const spark2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: sparkleSpread.value }, { translateY: -sparkleSpread.value * 0.9 }],
    opacity: sparkleOpacity.value,
  }));
  const spark3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: -sparkleSpread.value * 0.9 }, { translateY: sparkleSpread.value * 0.6 }],
    opacity: sparkleOpacity.value,
  }));
  const spark4Style = useAnimatedStyle(() => ({
    transform: [{ translateX: sparkleSpread.value * 0.8 }, { translateY: sparkleSpread.value * 0.7 }],
    opacity: sparkleOpacity.value,
  }));

  const tasksMerged = summary?.tasksMerged ?? summary?.appliedCount ?? 0;
  const projectsUpdated = summary?.projectsUpdated ?? 0;
  const conflictsResolved = summary?.conflictsResolved ?? 0;
  const peerName = summary?.peerDeviceName || 'peer device';

  return (
    <View style={styles.container}>
      {/* 1. Sparkles and Glowing Checkmark */}
      <View style={styles.badgeWrapper}>
        {!reduceMotion && (
          <>
            <Animated.Text style={[styles.sparkle, { color: colors.success }, spark1Style]}>
              ✦
            </Animated.Text>
            <Animated.Text style={[styles.sparkle, { color: '#FFD700' }, spark2Style]}>
              ✦
            </Animated.Text>
            <Animated.Text style={[styles.sparkle, { color: colors.accent }, spark3Style]}>
              ✦
            </Animated.Text>
            <Animated.Text style={[styles.sparkle, { color: colors.success }, spark4Style]}>
              ✦
            </Animated.Text>
          </>
        )}

        <Animated.View
          style={[
            styles.checkCircle,
            {
              backgroundColor: colors.success + '22',
              borderColor: colors.success,
              shadowColor: colors.success,
            },
            animatedCheckStyle,
          ]}
        >
          <Check size={36} color={colors.success} strokeWidth={3} />
        </Animated.View>
      </View>

      {/* 2. Text Summary Header */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>Sync Complete</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Changes merged safely with {peerName}.
      </Text>

      {/* 3. Real Result Card */}
      <ElevatedCard style={styles.card}>
        <View style={styles.rowItem}>
          <Text style={[styles.bullet, { color: colors.success }]}>✓</Text>
          <Text style={[styles.rowText, { color: colors.textPrimary }]}>
            <Text style={styles.boldNum}>{tasksMerged}</Text> {tasksMerged === 1 ? 'task' : 'tasks'} merged
          </Text>
        </View>

        {projectsUpdated > 0 && (
          <View style={styles.rowItem}>
            <Text style={[styles.bullet, { color: colors.success }]}>✓</Text>
            <Text style={[styles.rowText, { color: colors.textPrimary }]}>
              <Text style={styles.boldNum}>{projectsUpdated}</Text> {projectsUpdated === 1 ? 'project' : 'projects'} updated
            </Text>
          </View>
        )}

        <View style={styles.rowItem}>
          <Text style={[styles.bullet, { color: colors.accent }]}>✓</Text>
          <Text style={[styles.rowText, { color: colors.textPrimary }]}>
            <Text style={styles.boldNum}>{conflictsResolved}</Text> conflicts resolved with Lamport clocks
          </Text>
        </View>

        <View style={styles.rowItem}>
          <Text style={[styles.bullet, { color: colors.success }]}>✓</Text>
          <Text style={[styles.rowText, { color: colors.success }]}>
            Local data preserved & verified
          </Text>
        </View>
      </ElevatedCard>

      {/* 4. Action Button */}
      <AnimatedPressable
        profile="primaryButton"
        onPress={onDone}
        style={[styles.doneButton, { backgroundColor: colors.accent }]}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  badgeWrapper: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    ...TypographyScale.title3,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  card: {
    width: '100%',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    fontWeight: '800',
  },
  rowText: {
    ...TypographyScale.subhead,
  },
  boldNum: {
    fontWeight: '700',
  },
  doneButton: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
