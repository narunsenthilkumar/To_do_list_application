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
import * as Haptics from 'expo-haptics';
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
import { safeHaptics } from '../../utils/haptics';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';

export default function TodayScreen() {
  const router = useRouter();
  const { mode, setThemeMode, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    todayTasks,
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

  const totalTodayCount = todayTasks.length;
  const completedTodayCount = todayTasks.filter((t) => t.completed).length;
  const progressPercent = totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0;

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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                <Text style={[styles.sectionTitle, { color: colors.error }]}>Overdue</Text>
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
                  />
                ))}
              </View>
            )}

            {/* Section: Anytime / No Time */}
            {noTimeTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Anytime</Text>
                {noTimeTasks.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {todayTasks.length === 0 && overdueTasks.length === 0 && (
              <EmptyState
                icon="check"
                title="No tasks yet"
                subtitle="Your day is clear. Add a task to get started."
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
        onReschedule={() => actionSheetTask && updateTask(actionSheetTask.id, { dueDate: getTodayDateString() })}
        onDelete={() => actionSheetTask && deleteTask(actionSheetTask.id)}
      />

      {/* Theme Quick Switcher Popover Modal */}
      <Modal
        visible={themePopoverVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemePopoverVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setThemePopoverVisible(false)} />
          <View
            style={[
              styles.popoverCard,
              {
                backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
                borderColor: isDark ? MaterialLayers.glass.borderDark : MaterialLayers.glass.borderLight,
              },
            ]}
          >
            <Text style={[styles.popoverTitle, { color: colors.textTertiary }]}>APPEARANCE MODE</Text>

            {(['system', 'light', 'dark'] as ThemeMode[]).map((t) => {
              const isSelected = mode === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    safeHaptics.selection();
                    setThemeMode(t);
                    setThemePopoverVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.popoverOption,
                    {
                      backgroundColor: isSelected
                        ? colors.accent + '18'
                        : pressed
                        ? colors.secondaryBackground
                        : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.optionLeft}>
                    {t === 'light' && <Sun size={18} color={isSelected ? colors.accent : colors.textPrimary} />}
                    {t === 'dark' && <Moon size={18} color={isSelected ? colors.accent : colors.textPrimary} />}
                    {t === 'system' && <Monitor size={18} color={isSelected ? colors.accent : colors.textPrimary} />}
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected ? colors.accent : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {t} Mode
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={colors.accent} />}
                </Pressable>
              );
            })}
          </View>
        </View>
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
  topHeader: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greetingText: {
    ...TypographyScale.subhead,
  },
  dateText: {
    ...TypographyScale.title1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  suggestionCard: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
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
    flex: 1,
  },
  suggestionTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  dismissBtn: {
    padding: Spacing.xs,
  },
  suggestionDesc: {
    ...TypographyScale.body,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  suggestionActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
  },
  suggestionActionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radii.pill,
  },
  suggestionActionText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressCard: {
    marginVertical: Spacing.md,
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
  },
  progressSubtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  streakText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  section: {
    marginTop: Spacing.lg,
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
  sectionTitle: {
    ...TypographyScale.headline,
    marginBottom: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: Spacing.lg,
  },
  popoverCard: {
    width: 220,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.xs,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  popoverTitle: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  popoverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionText: {
    ...TypographyScale.footnote,
  },
});


