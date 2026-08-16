import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Settings, Flame, Sun, Moon, Monitor, Check, Pin, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { ProgressRing } from '../../components/common/ProgressRing';
import { SwipeableTaskRow } from '../../components/tasks/SwipeableTaskRow';
import { TaskActionSheet } from '../../components/tasks/TaskActionSheet';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { TodayHeader } from '../../components/today/TodayHeader';
import { useTaskora, useTheme, useSmartSuggestions } from '../../store/useTaskora';
import { ThemeMode } from '../../store/ThemeContext';
import { Task } from '../../models/task';
import { Repository, getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';
import { haptics } from '../../services/haptics';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';
import { calculateTasksProgress } from '../../utils/progress';

export default function TodayScreen() {
  const router = useRouter();
  const { mode, setThemeMode, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    todayTasks,
    todayAllTasks,
    overdueTasks,
    projects,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    updateTask,
    streakStats,
  } = useTaskora();

  const { suggestions, dismissSuggestion } = useSmartSuggestions();

  const [refreshing, setRefreshing] = useState(false);
  const [themePopoverVisible, setThemePopoverVisible] = useState(false);
  const [actionSheetTask, setActionSheetTask] = useState<Task | null>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    Repository.loadOnboardingDone().then((done) => {
      if (!done) {
        router.replace('/onboarding');
      }
    });
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  const pinnedTodayTasks = todayTasks.filter((t) => t.isPinned);
  const unpinnedTodayTasks = todayTasks.filter((t) => !t.isPinned);

  const morningTasks: Task[] = [];
  const afternoonTasks: Task[] = [];
  const eveningTasks: Task[] = [];
  const noTimeTasks: Task[] = [];

  unpinnedTodayTasks.forEach((t) => {
    if (!t.dueTime) {
      noTimeTasks.push(t);
    } else {
      const hour = parseInt(t.dueTime.split(':')[0], 10);
      if (hour < 12) morningTasks.push(t);
      else if (hour < 17) afternoonTasks.push(t);
      else eveningTasks.push(t);
    }
  });

  // Calculate accurate combined today progress
  const {
    progressPercent,
    completedCount: completedTodayCount,
    totalCount: totalTodayCount,
  } = calculateTasksProgress(todayAllTasks);

  const getProjectForTask = (projectId?: string) => {
    if (!projectId) return undefined;
    return projects.find((p) => p.id === projectId);
  };

  const animatedHeaderTitleStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, 80], [1, 0.90], Extrapolate.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 80], [1, 0.92], Extrapolate.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const bottomInset = getBottomContentInset(insets);

  const renderThemeIcon = () => {
    if (mode === 'light') return <Sun size={20} color={colors.textPrimary} />;
    if (mode === 'dark') return <Moon size={20} color={colors.textPrimary} />;
    return <Monitor size={20} color={colors.textPrimary} />;
  };

  return (
    <PrimarySurface useAmbientBg>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Top Header */}
          <TodayHeader
            greeting={getGreeting()}
            dateString={getFormattedDate()}
            animatedTitleStyle={animatedHeaderTitleStyle}
            onOpenThemePopover={() => setThemePopoverVisible(true)}
          />

          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          >
            {/* Smart Daily Briefing Cards */}
            {suggestions.map((suggestion) => (
              <ElevatedCard key={suggestion.id} style={styles.suggestionCard}>
                <View style={styles.suggestionHeaderRow}>
                  <View style={styles.suggestionTitleWrap}>
                    <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>
                      {suggestion.title}
                    </Text>
                  </View>
                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => dismissSuggestion(suggestion.id)}
                    style={styles.dismissBtn}
                  >
                    <X size={16} color={colors.textTertiary} />
                  </AnimatedPressable>
                </View>

                <Text style={[styles.suggestionDesc, { color: colors.textSecondary }]}>
                  {suggestion.description}
                </Text>

                {suggestion.actionLabel && (
                  <View style={styles.suggestionActionRow}>
                    <AnimatedPressable
                      profile="smallControl"
                      onPress={() => {
                        haptics.medium();
                        if (suggestion.actionType === 'start_focus') {
                          router.push('/(tabs)/focus');
                        } else if (suggestion.actionType === 'move_today' && suggestion.data?.overdueIds) {
                          const today = getTodayDateString();
                          suggestion.data.overdueIds.forEach((id: string) => {
                            updateTask(id, { dueDate: today });
                          });
                          dismissSuggestion(suggestion.id);
                        } else if (suggestion.actionType === 'reschedule' && suggestion.data?.remainingIds) {
                          const tomorrow = getTomorrowDateString();
                          suggestion.data.remainingIds.forEach((id: string) => {
                            updateTask(id, { dueDate: tomorrow });
                          });
                          dismissSuggestion(suggestion.id);
                        } else {
                          dismissSuggestion(suggestion.id);
                        }
                      }}
                      style={[styles.suggestionActionBtn, { backgroundColor: colors.accent }]}
                    >
                      <Text style={styles.suggestionActionText}>{suggestion.actionLabel}</Text>
                    </AnimatedPressable>
                  </View>
                )}
              </ElevatedCard>
            ))}

            {/* Today's Progress Card */}
            <ElevatedCard style={styles.progressCard}>
              <View style={styles.progressRow}>
                <ProgressRing progress={progressPercent} size={72} strokeWidth={7} color={colors.accent} />
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
                    Today's Progress
                  </Text>
                  <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
                    {completedTodayCount} of {totalTodayCount} tasks completed
                  </Text>
                </View>
                <View style={[styles.streakBadge, { backgroundColor: colors.warning + '18' }]}>
                  <Flame size={16} color={colors.warning} style={{ marginRight: 4 }} />
                  <Text style={[styles.streakText, { color: colors.warning }]}>
                    {streakStats.currentStreak}d
                  </Text>
                </View>
              </View>
            </ElevatedCard>

            {/* Section: Pinned Tasks */}
            {pinnedTodayTasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.pinnedHeader}>
                  <Pin size={15} color={colors.accent} fill={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: colors.accent, marginBottom: 0 }]}>Pinned</Text>
                  <View style={[styles.pinnedBadge, { backgroundColor: colors.accent + '18' }]}>
                    <Text style={[styles.pinnedBadgeText, { color: colors.accent }]}>
                      {pinnedTodayTasks.length}
                    </Text>
                  </View>
                </View>
                {pinnedTodayTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Section: Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.overdueHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.error }]}>Overdue</Text>
                  <View style={[styles.overdueBadge, { backgroundColor: colors.error + '18' }]}>
                    <Text style={[styles.overdueBadgeText, { color: colors.error }]}>
                      {overdueTasks.length}
                    </Text>
                  </View>
                </View>
                {overdueTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Section: Morning */}
            {morningTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Morning</Text>
                {morningTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTomorrowDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Section: Afternoon */}
            {afternoonTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Afternoon</Text>
                {afternoonTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTomorrowDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Section: Evening */}
            {eveningTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Evening</Text>
                {eveningTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTomorrowDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Section: Anytime Today */}
            {noTimeTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Anytime Today</Text>
                {noTimeTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTomorrowDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {todayTasks.length === 0 && overdueTasks.length === 0 && (
              <EmptyState
                icon="check"
                title="All clear for today!"
                subtitle="Tap the + button below to add a new task."
              />
            )}
          </Animated.ScrollView>
        </View>
      </View>

      {/* Task Quick Action Sheet */}
      <TaskActionSheet
        visible={!!actionSheetTask}
        task={actionSheetTask}
        onClose={() => setActionSheetTask(null)}
        onToggleComplete={() => actionSheetTask && toggleTaskCompletion(actionSheetTask.id)}
        onTogglePin={() => actionSheetTask && toggleTaskPin(actionSheetTask.id)}
        onToggleFavorite={() => actionSheetTask && toggleTaskFavorite(actionSheetTask.id)}
        onEdit={() => actionSheetTask && router.push(`/task/${actionSheetTask.id}`)}
        onReschedule={(dueDate, dueTime) =>
          actionSheetTask && updateTask(actionSheetTask.id, { dueDate, dueTime })
        }
        onDelete={() => actionSheetTask && deleteTask(actionSheetTask.id)}
      />

      {/* Theme Selection Modal Popover */}
      <Modal
        visible={themePopoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemePopoverVisible(false)}
      >
        <Pressable
          style={[styles.popoverBackdrop, { backgroundColor: colors.modalBackdrop }]}
          onPress={() => setThemePopoverVisible(false)}
        >
          <View
            style={[
              styles.popoverMenu,
              {
                backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
                borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
              },
            ]}
          >
            {(['light', 'dark', 'system'] as ThemeMode[]).map((tMode) => {
              const isSelected = mode === tMode;
              return (
                <Pressable
                  key={tMode}
                  onPress={() => {
                    haptics.selection();
                    setThemeMode(tMode);
                    setThemePopoverVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.popoverItem,
                    { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                  ]}
                >
                  <View style={styles.popoverItemLeft}>
                    {tMode === 'light' && <Sun size={18} color={isSelected ? colors.accent : colors.textPrimary} />}
                    {tMode === 'dark' && <Moon size={18} color={isSelected ? colors.accent : colors.textPrimary} />}
                    {tMode === 'system' && <Monitor size={18} color={isSelected ? colors.accent : colors.textPrimary} />}
                    <Text
                      style={[
                        styles.popoverItemText,
                        {
                          color: isSelected ? colors.accent : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '400',
                        },
                      ]}
                    >
                      {tMode.charAt(0).toUpperCase() + tMode.slice(1)}
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={colors.accent} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  innerContentWrapper: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  suggestionCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  suggestionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: Spacing.xs,
  },
  suggestionDesc: {
    ...TypographyScale.footnote,
    marginBottom: Spacing.sm,
  },
  suggestionActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  suggestionActionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  suggestionActionText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  progressCard: {
    marginBottom: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  progressTitle: {
    ...TypographyScale.headline,
    marginBottom: 2,
  },
  progressSubtitle: {
    ...TypographyScale.footnote,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  streakText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TypographyScale.title3,
    marginBottom: Spacing.sm,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pinnedBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginLeft: Spacing.xs,
  },
  pinnedBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  overdueBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginLeft: Spacing.xs,
  },
  overdueBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  popoverBackdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: Spacing.lg,
  },
  popoverMenu: {
    width: 170,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  popoverItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  popoverItemText: {
    ...TypographyScale.body,
  },
});
