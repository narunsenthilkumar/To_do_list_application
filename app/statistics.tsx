import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, Award, CheckCircle, Target, TrendingUp, Pin, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimarySurface } from '../components/common/PrimarySurface';
import { ElevatedCard } from '../components/common/ElevatedCard';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { useStatistics, useTheme } from '../store/useTaskora';
import { Radii, Spacing, TypographyScale } from '../theme/tokens';
import { safeGoBack } from '../utils/navigation';

export default function StatisticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    streakStats,
    completedTodayCount,
    totalCompletedCount,
    pinnedTasksCount,
    favoriteTasksCount,
    completionRate,
    completedSessionsToday,
  } = useStatistics();

  const MILESTONES = [3, 7, 14, 30, 60, 100];
  const bottomInset = Math.max(insets.bottom, 24) + 20;

  return (
    <PrimarySurface>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Productivity Stats</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Streak Celebration Banner */}
        <ElevatedCard style={styles.streakBanner}>
          <View style={styles.streakBannerRow}>
            <View style={[styles.fireBox, { backgroundColor: colors.warning + '20' }]}>
              <Flame size={36} color={colors.warning} />
            </View>
            <View style={styles.streakBannerInfo}>
              <Text style={[styles.streakNumberText, { color: colors.textPrimary }]}>
                🔥 {streakStats.currentStreak} Day Streak
              </Text>
              <Text style={[styles.streakSubText, { color: colors.textSecondary }]}>
                Best streak: {streakStats.bestStreak} days
              </Text>
            </View>
          </View>

          {/* Milestones row */}
          <Text style={[styles.milestonesLabel, { color: colors.textTertiary }]}>Streak Milestones</Text>
          <View style={styles.milestonesRow}>
            {MILESTONES.map((m) => {
              const unlocked = streakStats.currentStreak >= m;
              return (
                <View
                  key={m}
                  style={[
                    styles.milestoneBadge,
                    {
                      backgroundColor: unlocked ? colors.warning + '20' : colors.secondaryBackground,
                      borderColor: unlocked ? colors.warning : colors.subtleBorder,
                    },
                  ]}
                >
                  <Award size={14} color={unlocked ? colors.warning : colors.textTertiary} />
                  <Text
                    style={[
                      styles.milestoneText,
                      { color: unlocked ? colors.warning : colors.textTertiary },
                    ]}
                  >
                    {m}d
                  </Text>
                </View>
              );
            })}
          </View>
        </ElevatedCard>

        {/* Overview Grid 1 */}
        <View style={styles.gridRow}>
          <ElevatedCard style={styles.gridCard}>
            <CheckCircle size={24} color={colors.success} style={{ marginBottom: Spacing.xs }} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>{completedTodayCount}</Text>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Completed Today</Text>
          </ElevatedCard>

          <ElevatedCard style={styles.gridCard}>
            <Target size={24} color={colors.accent} style={{ marginBottom: Spacing.xs }} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>{completedSessionsToday}</Text>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Focus Sessions</Text>
          </ElevatedCard>
        </View>

        {/* Overview Grid 2 */}
        <View style={styles.gridRow}>
          <ElevatedCard style={styles.gridCard}>
            <TrendingUp size={24} color={colors.priorityMedium} style={{ marginBottom: Spacing.xs }} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>{completionRate}%</Text>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Completion Rate</Text>
          </ElevatedCard>

          <ElevatedCard style={styles.gridCard}>
            <Award size={24} color={colors.warning} style={{ marginBottom: Spacing.xs }} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>{totalCompletedCount}</Text>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Total Completed</Text>
          </ElevatedCard>
        </View>

        {/* Overview Grid 3: Importance & Favorites */}
        <View style={styles.gridRow}>
          <ElevatedCard style={styles.gridCard}>
            <Pin size={24} color={colors.accent} fill={colors.accent} style={{ marginBottom: Spacing.xs }} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>{pinnedTasksCount}</Text>
            <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Pinned Tasks</Text>
          </ElevatedCard>

          <AnimatedPressable
            profile="card"
            onPress={() => router.push('/favorites')}
            style={{ flex: 1 }}
          >
            <ElevatedCard style={[styles.gridCard, { width: '100%' }]}>
              <Star size={24} color="#FFCC00" fill="#FFCC00" style={{ marginBottom: Spacing.xs }} />
              <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>{favoriteTasksCount}</Text>
              <Text style={[styles.gridLabel, { color: colors.textTertiary }]}>Starred Favorites →</Text>
            </ElevatedCard>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...TypographyScale.headline,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  streakBanner: {
    marginBottom: Spacing.lg,
  },
  streakBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  fireBox: {
    width: 60,
    height: 60,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  streakBannerInfo: {
    flex: 1,
  },
  streakNumberText: {
    ...TypographyScale.title2,
  },
  streakSubText: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  milestonesLabel: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  milestonesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: 4,
  },
  milestoneText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  gridNumber: {
    ...TypographyScale.title1,
  },
  gridLabel: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
});

