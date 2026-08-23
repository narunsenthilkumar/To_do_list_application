import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import {
  Check,
  Plus,
  Flame,
  Clock,
  Flag,
  Folder,
  Pin,
  Star,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Target,
  X,
  ListTodo,
  Calendar,
} from 'lucide-react-native';
import { useTaskora, useTheme, useSmartSuggestions } from '../../store/useTaskora';
import { Task, PriorityLevel } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { formatTaskTime } from '../../utils/timeFormatter';
import { calculateTasksProgress } from '../../utils/progress';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';
import { ContextMenuPosition } from './WindowsTaskContextMenu';

interface WindowsDesktopTodayProps {
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onContextMenu: (task: Task, pos: ContextMenuPosition) => void;
  onOpenQuickAdd: () => void;
}

export const WindowsDesktopToday: React.FC<WindowsDesktopTodayProps> = ({
  selectedTaskId,
  onSelectTask,
  onContextMenu,
  onOpenQuickAdd,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const {
    todayTasks,
    todayAllTasks,
    overdueTasks,
    completedTasks,
    projects,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    addTask,
    streakStats,
    completedSessionsToday,
  } = useTaskora();

  const { suggestions, dismissSuggestion } = useSmartSuggestions();

  const [quickInput, setQuickInput] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);

  const todayStats = calculateTasksProgress(todayAllTasks);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleInlineAdd = async () => {
    if (!quickInput.trim()) return;
    await addTask({
      title: quickInput.trim(),
      dueDate: getTodayDateString(),
      inbox: true,
      projectIds: [],
    });
    setQuickInput('');
  };

  const pinnedTasks = todayTasks.filter((t) => t.isPinned);
  const unpinnedTasks = todayTasks.filter((t) => !t.isPinned);

  const morningTasks: Task[] = [];
  const afternoonTasks: Task[] = [];
  const eveningTasks: Task[] = [];
  const unscheduledTasks: Task[] = [];

  unpinnedTasks.forEach((t) => {
    if (!t.dueTime) {
      unscheduledTasks.push(t);
    } else {
      const hour = parseInt(t.dueTime.split(':')[0], 10);
      if (hour < 12) morningTasks.push(t);
      else if (hour < 17) afternoonTasks.push(t);
      else eveningTasks.push(t);
    }
  });

  const renderTaskCard = (t: Task) => {
    const isSelected = selectedTaskId === t.id;
    const project = projects.find((p) => p.id === t.projectId);
    const subtaskCompleted = t.subtasks?.filter((s) => s.completed).length || 0;
    const subtaskTotal = t.subtasks?.length || 0;

    const priorityColor =
      t.priority === 'urgent'
        ? colors.priorityUrgent
        : t.priority === 'high'
        ? colors.priorityHigh
        : t.priority === 'medium'
        ? colors.priorityMedium
        : t.priority === 'low'
        ? colors.priorityLow
        : null;

    return (
      <Pressable
        key={t.id}
        style={({ hovered }: any) => [
          styles.taskCard,
          {
            backgroundColor: isDark
              ? isSelected
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.03)'
              : isSelected
              ? 'rgba(0, 122, 255, 0.08)'
              : '#FFFFFF',
            borderColor: isSelected
              ? colors.accent
              : isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(0, 0, 0, 0.06)',
          },
          hovered && !isSelected && {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          },
          Shadows.subtle,
        ]}
        onPress={() => onSelectTask(t)}
        {...({
          onContextMenu: (e: any) => {
            if (Platform.OS === 'web') {
              e.preventDefault();
              onContextMenu(t, { x: e.clientX, y: e.clientY });
            }
          },
        } as any)}
      >
        {/* Left Checkbox */}
        <Pressable
          style={[
            styles.taskCheckbox,
            {
              borderColor: t.completed ? colors.success : colors.textTertiary,
              backgroundColor: t.completed ? colors.success : 'transparent',
            },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            toggleTaskCompletion(t.id);
          }}
        >
          {t.completed && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
        </Pressable>

        {/* Center Content */}
        <View style={styles.taskCardContent}>
          <View style={styles.taskTitleRow}>
            <Text
              style={[
                styles.taskTitle,
                { color: colors.textPrimary },
                t.completed && styles.completedText,
              ]}
              numberOfLines={1}
            >
              {t.title}
            </Text>

            {t.isPinned && <Pin size={12} color={colors.accent} style={{ marginLeft: 6 }} />}
            {t.isFavorite && <Star size={12} color="#FF9500" style={{ marginLeft: 4 }} />}
          </View>

          {/* Badges / Metadata Row */}
          <View style={styles.taskMetaRow}>
            {/* Due Time */}
            {t.dueTime && (
              <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Clock size={10} color={colors.textTertiary} style={{ marginRight: 3 }} />
                <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                  {formatTaskTime(t.dueTime, timeFormat)}
                </Text>
              </View>
            )}

            {/* Priority Badge */}
            {priorityColor && (
              <View style={[styles.metaBadge, { backgroundColor: priorityColor + '15' }]}>
                <Flag size={10} color={priorityColor} style={{ marginRight: 3 }} />
                <Text style={[styles.metaBadgeText, { color: priorityColor, fontWeight: '700' }]}>
                  {t.priority.toUpperCase()}
                </Text>
              </View>
            )}

            {/* Project Badge */}
            {project && (
              <View style={[styles.metaBadge, { backgroundColor: (project.color || colors.accent) + '15' }]}>
                <View style={[styles.projectDot, { backgroundColor: project.color || colors.accent }]} />
                <Text style={[styles.metaBadgeText, { color: project.color || colors.accent }]}>
                  {project.name}
                </Text>
              </View>
            )}

            {/* Subtasks Count Badge */}
            {subtaskTotal > 0 && (
              <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <ListTodo size={10} color={colors.textTertiary} style={{ marginRight: 3 }} />
                <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                  {subtaskCompleted}/{subtaskTotal}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Banner Greeting */}
      <View style={styles.greetingHeader}>
        <View>
          <Text style={[styles.greetingTitle, { color: colors.textPrimary }]}>
            {getGreeting()}, Narun
          </Text>
          <Text style={[styles.greetingDate, { color: colors.textTertiary }]}>
            {getFormattedDate()}
          </Text>
        </View>

        <Pressable
          style={({ hovered }: any) => [
            styles.quickAddHeaderBtn,
            { backgroundColor: colors.accent },
            hovered && { opacity: 0.9 },
            Shadows.subtle,
          ]}
          onPress={onOpenQuickAdd}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
          <Text style={styles.quickAddHeaderBtnText}>New Task (Ctrl+N)</Text>
        </Pressable>
      </View>

      {/* Productivity Summary Dashboard Card */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {todayStats.completedCount}/{todayStats.totalCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Tasks Completed</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.statCol}>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {todayStats.progressPercent}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Daily Progress</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.statCol}>
          <View style={styles.statValueRow}>
            <Flame size={18} color="#FF9500" style={{ marginRight: 4 }} />
            <Text style={[styles.statValue, { color: '#FF9500' }]}>{streakStats.currentStreak}</Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Day Streak</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.statCol}>
          <View style={styles.statValueRow}>
            <Target size={18} color="#5856D6" style={{ marginRight: 4 }} />
            <Text style={[styles.statValue, { color: '#5856D6' }]}>{completedSessionsToday}</Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Focus Sessions</Text>
        </View>
      </View>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          {suggestions.map((sug) => (
            <View
              key={sug.id}
              style={[
                styles.suggestionCard,
                {
                  backgroundColor: isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)',
                  borderColor: isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.15)',
                },
              ]}
            >
              <Sparkles size={16} color={colors.accent} style={{ marginRight: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.suggestionTitle, { color: colors.accent }]}>{sug.title}</Text>
                <Text style={[styles.suggestionMessage, { color: colors.textSecondary }]}>{sug.description}</Text>
              </View>
              <Pressable
                style={styles.dismissSugBtn}
                onPress={() => dismissSuggestion(sug.id)}
              >
                <X size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Inline Fast Quick Add Bar */}
      <View
        style={[
          styles.inlineAddBox,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          },
          Shadows.subtle,
        ]}
      >
        <Plus size={16} color={colors.accent} style={{ marginRight: Spacing.sm }} />
        <TextInput
          style={[styles.inlineInput, { color: colors.textPrimary }]}
          placeholder="Add a task to Today... (Press Enter)"
          placeholderTextColor={colors.textTertiary}
          value={quickInput}
          onChangeText={setQuickInput}
          onSubmitEditing={handleInlineAdd}
          returnKeyType="done"
        />
        {quickInput.trim().length > 0 && (
          <Pressable style={[styles.inlineSaveBtn, { backgroundColor: colors.accent }]} onPress={handleInlineAdd}>
            <Text style={styles.inlineSaveBtnText}>Add</Text>
          </Pressable>
        )}
      </View>

      {/* Overdue Section (if any) */}
      {overdueTasks.length > 0 && (
        <View style={styles.taskSection}>
          <View style={styles.sectionHeaderRow}>
            <AlertCircle size={14} color={colors.error} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.error }]}>
              Overdue ({overdueTasks.length})
            </Text>
          </View>
          <View style={styles.taskGrid}>{overdueTasks.map(renderTaskCard)}</View>
        </View>
      )}

      {/* Pinned Tasks Section */}
      {pinnedTasks.length > 0 && (
        <View style={styles.taskSection}>
          <View style={styles.sectionHeaderRow}>
            <Pin size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Pinned ({pinnedTasks.length})
            </Text>
          </View>
          <View style={styles.taskGrid}>{pinnedTasks.map(renderTaskCard)}</View>
        </View>
      )}

      {/* Today's Tasks */}
      <View style={styles.taskSection}>
        <View style={styles.sectionHeaderRow}>
          <Calendar size={14} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Today's Schedule ({unpinnedTasks.length})
          </Text>
        </View>

        {unpinnedTasks.length === 0 && pinnedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle2 size={40} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>All Clear for Today!</Text>
            <Text style={[styles.emptyStateSub, { color: colors.textTertiary }]}>
              You have no pending tasks scheduled for today. Enjoy your day or plan ahead.
            </Text>
          </View>
        ) : (
          <View style={styles.taskGrid}>{unpinnedTasks.map(renderTaskCard)}</View>
        )}
      </View>

      {/* Completed Section Toggle */}
      {completedTasks.length > 0 && (
        <View style={styles.completedSection}>
          <Pressable
            style={styles.completedToggle}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? (
              <ChevronDown size={16} color={colors.textTertiary} />
            ) : (
              <ChevronRight size={16} color={colors.textTertiary} />
            )}
            <Text style={[styles.completedToggleText, { color: colors.textTertiary }]}>
              Completed Tasks ({completedTasks.length})
            </Text>
          </Pressable>

          {showCompleted && (
            <View style={styles.taskGrid}>
              {completedTasks.slice(0, 20).map(renderTaskCard)}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
    maxWidth: 960,
  },
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greetingTitle: {
    ...TypographyScale.title2,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  greetingDate: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  quickAddHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  quickAddHeaderBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statCol: {
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  statLabel: {
    ...TypographyScale.caption2,
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  suggestionsSection: {
    marginBottom: Spacing.lg,
    gap: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  suggestionTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  suggestionMessage: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  dismissSugBtn: {
    padding: 4,
    cursor: 'pointer' as any,
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  inlineInput: {
    flex: 1,
    ...TypographyScale.footnote,
    outlineStyle: 'none',
  } as any,
  inlineSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  inlineSaveBtnText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  taskGrid: {
    gap: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radii.sm,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  taskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  taskCardContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  emptyStateSub: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 4,
  },
  completedSection: {
    marginTop: Spacing.md,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    cursor: 'pointer' as any,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  completedToggleText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
});
