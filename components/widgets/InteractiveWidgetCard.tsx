import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  Circle,
  Plus,
  Play,
  Pause,
  Clock,
  Target,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Flame,
} from 'lucide-react-native';
import { WidgetSize, WidgetSnapshotData } from '../../services/widgets/WidgetState';
import { WidgetActions } from '../../services/widgets/WidgetActions';
import { useTheme } from '../../store/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';

interface InteractiveWidgetCardProps {
  size: WidgetSize;
  data: WidgetSnapshotData;
  onRefresh?: () => void;
}

export const InteractiveWidgetCard: React.FC<InteractiveWidgetCardProps> = ({ size, data, onRefresh }) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handleAction = async (action: any, payload?: any) => {
    await WidgetActions.handleAction(action, payload, router);
    if (onRefresh) onRefresh();
  };

  const isRunning = data.focus.status === 'running';

  // --- SMALL WIDGET (2x2) ---
  if (size === 'small') {
    return (
      <View
        style={[
          styles.smallContainer,
          {
            backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
            borderColor: isDark ? MaterialLayers.glass.borderDark : MaterialLayers.glass.borderLight,
          },
          Shadows.floating,
        ]}
      >
        {/* Header */}
        <View style={styles.smallHeader}>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.brandText, { color: colors.textSecondary }]}>KIVENTA</Text>
          </View>
          <Text style={[styles.dateBadge, { color: colors.textTertiary }]}>{data.todayFormatted}</Text>
        </View>

        {/* Task Count & Progress */}
        <View style={styles.smallTaskSummary}>
          <Text style={[styles.smallCountNumber, { color: colors.textPrimary }]}>
            {data.remainingTodayTasks}
          </Text>
          <Text style={[styles.smallCountLabel, { color: colors.textSecondary }]}>
            {data.remainingTodayTasks === 1 ? 'task left' : 'tasks left'}
          </Text>
        </View>

        {/* Next Task or Focus State */}
        {data.nextTask ? (
          <AnimatedPressable
            profile="smallControl"
            onPress={() => handleAction('open_task', { taskId: data.nextTask?.id })}
            style={[styles.smallNextTaskCard, { backgroundColor: colors.secondaryBackground }]}
          >
            <View style={styles.smallTaskTitleRow}>
              {data.nextTask.projectColor && (
                <View style={[styles.taskProjectDot, { backgroundColor: data.nextTask.projectColor }]} />
              )}
              <Text numberOfLines={1} style={[styles.smallTaskTitle, { color: colors.textPrimary }]}>
                {data.nextTask.title}
              </Text>
            </View>
            {data.nextTask.dueTime && (
              <Text style={[styles.smallTaskTime, { color: colors.accent }]}>
                {data.nextTask.dueTime}
              </Text>
            )}
          </AnimatedPressable>
        ) : (
          <View style={[styles.smallEmptyState, { backgroundColor: colors.secondaryBackground }]}>
            <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 4 }} />
            <Text style={[styles.smallEmptyText, { color: colors.textSecondary }]}>All tasks done!</Text>
          </View>
        )}

        {/* Focus Timer Mini Pill */}
        <AnimatedPressable
          profile="smallControl"
          onPress={() => handleAction(isRunning ? 'pause_focus' : 'start_focus')}
          style={[
            styles.smallFocusPill,
            { backgroundColor: isRunning ? colors.accent + '20' : colors.secondaryBackground },
          ]}
        >
          <Target size={12} color={isRunning ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
          <Text
            style={[
              styles.smallFocusText,
              { color: isRunning ? colors.accent : colors.textSecondary, fontWeight: '700' },
            ]}
          >
            {data.focus.remainingFormatted}
          </Text>
          {isRunning ? (
            <Pause size={10} color={colors.accent} style={{ marginLeft: 4 }} />
          ) : (
            <Play size={10} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          )}
        </AnimatedPressable>
      </View>
    );
  }

  // --- MEDIUM WIDGET (4x2) ---
  if (size === 'medium') {
    return (
      <View
        style={[
          styles.mediumContainer,
          {
            backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
            borderColor: isDark ? MaterialLayers.glass.borderDark : MaterialLayers.glass.borderLight,
          },
          Shadows.floating,
        ]}
      >
        {/* Top Header */}
        <View style={styles.mediumHeader}>
          <View>
            <View style={styles.brandRow}>
              <View style={[styles.brandDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.brandText, { color: colors.textSecondary }]}>KIVENTA TODAY</Text>
            </View>
            <Text style={[styles.mediumGreeting, { color: colors.textPrimary }]}>{data.greeting}</Text>
          </View>

          <View style={styles.mediumHeaderRight}>
            <Text style={[styles.progressPercentText, { color: colors.accent }]}>{data.progressPercent}%</Text>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.secondaryBackground }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, data.progressPercent))}%`, backgroundColor: colors.accent },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Content Split: Left Next Task, Right Focus Timer */}
        <View style={styles.mediumBodyRow}>
          {/* Left Column: Next Task */}
          <View style={styles.mediumCol}>
            <Text style={[styles.colHeading, { color: colors.textTertiary }]}>NEXT UP</Text>
            {data.nextTask ? (
              <AnimatedPressable
                profile="smallControl"
                onPress={() => handleAction('open_task', { taskId: data.nextTask?.id })}
                style={[styles.mediumTaskCard, { backgroundColor: colors.secondaryBackground }]}
              >
                <View style={styles.mediumTaskHeader}>
                  {data.nextTask.projectColor && (
                    <View style={[styles.taskProjectDot, { backgroundColor: data.nextTask.projectColor }]} />
                  )}
                  <Text numberOfLines={1} style={[styles.mediumTaskTitle, { color: colors.textPrimary }]}>
                    {data.nextTask.title}
                  </Text>
                </View>
                <View style={styles.mediumTaskMetaRow}>
                  {data.nextTask.dueTime ? (
                    <Text style={[styles.mediumTaskTime, { color: colors.accent }]}>
                      ⏰ {data.nextTask.dueTime}
                    </Text>
                  ) : (
                    <Text style={[styles.mediumTaskTime, { color: colors.textTertiary }]}>Today</Text>
                  )}
                  {data.nextTask.priority !== 'none' && (
                    <Text style={[styles.priorityBadgeText, { color: colors.warning }]}>
                      {data.nextTask.priority.toUpperCase()}
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            ) : (
              <View style={[styles.mediumEmptyCard, { backgroundColor: colors.secondaryBackground }]}>
                <CheckCircle2 size={18} color={colors.success} style={{ marginRight: 6 }} />
                <Text style={[styles.mediumEmptyText, { color: colors.textSecondary }]}>
                  {data.totalTodayTasks > 0 ? 'All done for today!' : 'No tasks for today'}
                </Text>
              </View>
            )}
          </View>

          {/* Right Column: Focus Timer */}
          <View style={styles.mediumCol}>
            <Text style={[styles.colHeading, { color: colors.textTertiary }]}>FOCUS SESSION</Text>
            <View style={[styles.mediumFocusCard, { backgroundColor: colors.secondaryBackground }]}>
              <View style={styles.mediumFocusTop}>
                <Target size={14} color={isRunning ? colors.accent : colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.mediumFocusTime, { color: colors.textPrimary }]}>
                  {data.focus.remainingFormatted}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.mediumFocusSub, { color: colors.textTertiary }]}>
                {data.focus.taskTitle || (data.focus.mode === 'work' ? 'Deep Work' : 'Break Time')}
              </Text>

              {/* Action Button */}
              <AnimatedPressable
                profile="smallControl"
                onPress={() => handleAction(isRunning ? 'pause_focus' : 'start_focus')}
                style={[
                  styles.mediumFocusBtn,
                  { backgroundColor: isRunning ? colors.warning : colors.accent },
                ]}
              >
                {isRunning ? (
                  <>
                    <Pause size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.mediumFocusBtnText}>Pause</Text>
                  </>
                ) : (
                  <>
                    <Play size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.mediumFocusBtnText}>Start Focus</Text>
                  </>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </View>

        {/* Footer Quick Action */}
        <View style={styles.mediumFooter}>
          <AnimatedPressable
            profile="smallControl"
            onPress={() => handleAction('add_task')}
            style={[styles.mediumAddBtn, { backgroundColor: colors.accent + '18' }]}
          >
            <Plus size={14} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.mediumAddBtnText, { color: colors.accent }]}>Quick Add Task</Text>
          </AnimatedPressable>

          <AnimatedPressable
            profile="smallControl"
            onPress={() => handleAction('open_today')}
            style={styles.mediumOpenBtn}
          >
            <Text style={[styles.mediumOpenBtnText, { color: colors.textSecondary }]}>Open Today</Text>
            <ChevronRight size={14} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  // --- LARGE WIDGET (4x4) ---
  return (
    <View
      style={[
        styles.largeContainer,
        {
          backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
          borderColor: isDark ? MaterialLayers.glass.borderDark : MaterialLayers.glass.borderLight,
        },
        Shadows.floating,
      ]}
    >
      {/* Header */}
      <View style={styles.largeHeader}>
        <View>
          <View style={styles.brandRow}>
            <View style={[styles.brandDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.brandText, { color: colors.textSecondary }]}>KIVENTA</Text>
          </View>
          <Text style={[styles.largeGreeting, { color: colors.textPrimary }]}>{data.greeting}</Text>
          <Text style={[styles.largeDateSub, { color: colors.textTertiary }]}>{data.todayFormatted}</Text>
        </View>

        <View style={styles.largeStatsBlock}>
          <Text style={[styles.largeStatsNumber, { color: colors.accent }]}>
            {data.completedTodayTasks}/{data.totalTodayTasks}
          </Text>
          <Text style={[styles.largeStatsLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.largeProgressBarTrack, { backgroundColor: colors.secondaryBackground }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, Math.max(0, data.progressPercent))}%`, backgroundColor: colors.accent },
          ]}
        />
      </View>

      {/* Focus HUD Strip */}
      <View style={[styles.largeFocusStrip, { backgroundColor: colors.secondaryBackground }]}>
        <View style={styles.largeFocusLeft}>
          <Target size={18} color={isRunning ? colors.accent : colors.textSecondary} style={{ marginRight: 8 }} />
          <View>
            <Text style={[styles.largeFocusTime, { color: colors.textPrimary }]}>
              {data.focus.remainingFormatted}
            </Text>
            <Text numberOfLines={1} style={[styles.largeFocusSub, { color: colors.textTertiary }]}>
              {data.focus.taskTitle || (data.focus.mode === 'work' ? 'Pomodoro Session' : 'Break Time')}
            </Text>
          </View>
        </View>

        <AnimatedPressable
          profile="smallControl"
          onPress={() => handleAction(isRunning ? 'pause_focus' : 'start_focus')}
          style={[
            styles.largeFocusActionBtn,
            { backgroundColor: isRunning ? colors.warning : colors.accent },
          ]}
        >
          {isRunning ? (
            <>
              <Pause size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.largeFocusActionText}>Pause</Text>
            </>
          ) : (
            <>
              <Play size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.largeFocusActionText}>Start</Text>
            </>
          )}
        </AnimatedPressable>
      </View>

      {/* Today Task List */}
      <Text style={[styles.largeSectionLabel, { color: colors.textTertiary }]}>TODAY'S AGENDA</Text>
      <View style={styles.largeTaskList}>
        {data.todayTasks.slice(0, 4).map((task) => (
          <View key={task.id} style={[styles.largeTaskRow, { borderColor: colors.subtleBorder }]}>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => handleAction('complete_task', { taskId: task.id })}
              style={styles.largeCheckbox}
            >
              <Circle size={18} color={colors.textTertiary} />
            </AnimatedPressable>

            <AnimatedPressable
              profile="smallControl"
              onPress={() => handleAction('open_task', { taskId: task.id })}
              style={styles.largeTaskTextContainer}
            >
              <Text numberOfLines={1} style={[styles.largeTaskTitle, { color: colors.textPrimary }]}>
                {task.title}
              </Text>
              {task.dueTime && (
                <Text style={[styles.largeTaskTimeText, { color: colors.accent }]}>
                  {task.dueTime}
                </Text>
              )}
            </AnimatedPressable>

            {task.projectName && (
              <View
                style={[
                  styles.largeProjectBadge,
                  { backgroundColor: (task.projectColor || colors.accent) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.largeProjectBadgeText,
                    { color: task.projectColor || colors.accent },
                  ]}
                >
                  {task.projectName}
                </Text>
              </View>
            )}
          </View>
        ))}

        {data.todayTasks.length === 0 && (
          <View style={styles.largeEmptyList}>
            <CheckCircle2 size={24} color={colors.success} style={{ marginBottom: 6 }} />
            <Text style={[styles.largeEmptyText, { color: colors.textSecondary }]}>
              {data.totalTodayTasks > 0 ? 'All tasks completed for today!' : 'No tasks scheduled today'}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Action Footer */}
      <View style={styles.largeFooter}>
        <AnimatedPressable
          profile="primaryButton"
          onPress={() => handleAction('add_task')}
          style={[styles.largeAddBtn, { backgroundColor: colors.accent }]}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
          <Text style={styles.largeAddBtnText}>Add Task</Text>
        </AnimatedPressable>

        <AnimatedPressable
          profile="smallControl"
          onPress={() => handleAction('open_today')}
          style={[styles.largeOpenTodayBtn, { backgroundColor: colors.secondaryBackground }]}
        >
          <Text style={[styles.largeOpenTodayText, { color: colors.textPrimary }]}>Open KIVENTA</Text>
          <ChevronRight size={16} color={colors.textSecondary} />
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Shared
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  brandText: {
    ...TypographyScale.caption2,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  taskProjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Small Widget
  smallContainer: {
    width: '100%',
    maxWidth: 180,
    aspectRatio: 1,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  smallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBadge: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  smallTaskSummary: {
    marginVertical: 2,
  },
  smallCountNumber: {
    ...TypographyScale.title1,
    fontWeight: '800',
    lineHeight: 30,
  },
  smallCountLabel: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  smallNextTaskCard: {
    padding: Spacing.xs + 2,
    borderRadius: Radii.sm,
  },
  smallTaskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallTaskTitle: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    flex: 1,
  },
  smallTaskTime: {
    ...TypographyScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  smallEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  smallEmptyText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  smallFocusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.pill,
  },
  smallFocusText: {
    ...TypographyScale.caption2,
  },

  // Medium Widget
  mediumContainer: {
    width: '100%',
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  mediumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mediumGreeting: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  mediumHeaderRight: {
    alignItems: 'flex-end',
    width: 100,
  },
  progressPercentText: {
    ...TypographyScale.caption1,
    fontWeight: '800',
    marginBottom: 4,
  },
  mediumBodyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mediumCol: {
    flex: 1,
  },
  colHeading: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  mediumTaskCard: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 64,
    justifyContent: 'center',
  },
  mediumTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mediumTaskTitle: {
    ...TypographyScale.footnote,
    fontWeight: '600',
    flex: 1,
  },
  mediumTaskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediumTaskTime: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  priorityBadgeText: {
    ...TypographyScale.caption2,
    fontSize: 10,
    fontWeight: '800',
  },
  mediumEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 64,
  },
  mediumEmptyText: {
    ...TypographyScale.footnote,
    fontWeight: '500',
  },
  mediumFocusCard: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  mediumFocusTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediumFocusTime: {
    ...TypographyScale.headline,
    fontWeight: '800',
  },
  mediumFocusSub: {
    ...TypographyScale.caption2,
    marginVertical: 2,
  },
  mediumFocusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  mediumFocusBtnText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mediumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  mediumAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
  },
  mediumAddBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  mediumOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  mediumOpenBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    marginRight: 2,
  },

  // Large Widget
  largeContainer: {
    width: '100%',
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    borderWidth: 1,
  },

  largeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  largeGreeting: {
    ...TypographyScale.title2,
    fontWeight: '800',
  },
  largeDateSub: {
    ...TypographyScale.footnote,
    marginTop: 1,
  },
  largeStatsBlock: {
    alignItems: 'flex-end',
  },
  largeStatsNumber: {
    ...TypographyScale.title2,
    fontWeight: '800',
  },
  largeStatsLabel: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  largeProgressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  largeFocusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  largeFocusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  largeFocusTime: {
    ...TypographyScale.headline,
    fontWeight: '800',
  },
  largeFocusSub: {
    ...TypographyScale.caption1,
  },
  largeFocusActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
  },
  largeFocusActionText: {
    ...TypographyScale.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  largeSectionLabel: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  largeTaskList: {
    marginBottom: Spacing.md,
  },
  largeTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  largeCheckbox: {
    paddingRight: Spacing.sm,
  },
  largeTaskTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  largeTaskTitle: {
    ...TypographyScale.body,
    fontWeight: '500',
    flex: 1,
  },
  largeTaskTimeText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  largeProjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginLeft: Spacing.sm,
  },
  largeProjectBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  largeEmptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  largeEmptyText: {
    ...TypographyScale.footnote,
    fontWeight: '500',
  },
  largeFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  largeAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  largeAddBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  largeOpenTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
  },
  largeOpenTodayText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    marginRight: 4,
  },
});
