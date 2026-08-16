import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Bell, Repeat, CheckSquare, Pin, Star } from 'lucide-react-native';
import { Task } from '../../models/task';
import { Project } from '../../models/project';
import { useTheme } from '../../store/ThemeContext';
import { TaskCheckbox } from './TaskCheckbox';
import { PriorityBadge } from './PriorityBadge';
import { TagChip } from './TagChip';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';
import { getTodayDateString } from '../../services/storage/repository';
import { formatTaskTime } from '../../utils/timeFormatter';
import { AnimatedPressable } from '../common/AnimatedPressable';

interface TaskRowProps {
  task: Task;
  project?: Project;
  onPress: () => void;
  onToggleComplete: () => void;
  onLongPress?: () => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  project,
  onPress,
  onToggleComplete,
  onLongPress,
  isMultiSelectMode,
  isSelected,
  onSelect,
}) => {
  const { colors, isDark, timeFormat } = useTheme();

  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const completedSubtasks = subtasks.filter((s) => s && s.completed).length;
  const totalSubtasks = subtasks.length;

  const isToday = task.dueDate === getTodayDateString();
  const isOverdue = !task.completed && !!task.dueDate && task.dueDate < getTodayDateString();

  return (
    <AnimatedPressable
      onPress={isMultiSelectMode ? onSelect : onPress}
      onLongPress={onLongPress || onSelect}
      profile="card"
      style={[
        styles.container,
        {
          backgroundColor: colors.elevatedCard,
          borderColor: isSelected
            ? colors.accent
            : isDark
            ? MaterialLayers.elevated.borderDark
            : MaterialLayers.elevated.borderLight,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.leftColumn}>
        <TaskCheckbox
          completed={task.completed}
          onToggle={onToggleComplete}
          priority={task.priority}
        />
      </View>

      <View style={styles.contentColumn}>
        {/* Title with Pin & Favorite badges */}
        <View style={styles.titleRow}>
          {task.isPinned && (
            <Pin
              size={13}
              color={colors.accent}
              fill={colors.accent}
              style={styles.pinIcon}
            />
          )}
          {task.isFavorite && (
            <Star
              size={13}
              color="#FFCC00"
              fill="#FFCC00"
              style={styles.starIcon}
            />
          )}
          <Text
            style={[
              styles.titleText,
              {
                color: task.completed ? colors.textTertiary : colors.textPrimary,
                textDecorationLine: task.completed ? 'line-through' : 'none',
                opacity: task.completed ? 0.65 : 1,
              },
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
        </View>

        {/* Notes preview if present */}
        {task.notes ? (
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={1}>
            {task.notes}
          </Text>
        ) : null}

        {/* Meta badges row */}
        <View style={styles.metaRow}>
          {/* Due date & time */}
          {task.dueDate ? (
            <View style={styles.metaItem}>
              <Calendar
                size={12}
                color={isOverdue ? colors.error : isToday ? colors.accent : colors.textTertiary}
                style={{ marginRight: 3 }}
              />
              <Text
                style={[
                  styles.metaText,
                  {
                    color: isOverdue ? colors.error : isToday ? colors.accent : colors.textTertiary,
                    fontWeight: isOverdue || isToday ? '700' : '400',
                  },
                ]}
              >
                {isToday ? 'Today' : task.dueDate}
                {task.dueTime ? ` · ${formatTaskTime(task.dueTime, timeFormat)}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Subtask count */}
          {totalSubtasks > 0 ? (
            <View style={styles.metaItem}>
              <CheckSquare size={12} color={colors.textTertiary} style={{ marginRight: 3 }} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                {completedSubtasks}/{totalSubtasks}
              </Text>
            </View>
          ) : null}

          {/* Reminder indicator */}
          {task.reminder && task.reminder !== 'none' ? (
            <View style={styles.metaItem}>
              <Bell size={12} color={colors.accent} style={{ marginRight: 2 }} />
            </View>
          ) : null}

          {/* Recurrence indicator */}
          {task.recurrence && task.recurrence.frequency !== 'never' ? (
            <View style={styles.metaItem}>
              <Repeat size={12} color={colors.accent} style={{ marginRight: 2 }} />
            </View>
          ) : null}

          {/* Project pill */}
          {project ? (
            <View style={[styles.projectPill, { backgroundColor: project.color + '18' }]}>
              <View style={[styles.projectDot, { backgroundColor: project.color }]} />
              <Text style={[styles.projectText, { color: project.color }]}>{project.name}</Text>
            </View>
          ) : null}

          {/* Priority */}
          <PriorityBadge priority={task.priority} showText={false} />

          {/* Tags */}
          {tags.map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
  },
  leftColumn: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  contentColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  pinIcon: {
    marginRight: 5,
    marginTop: 1,
  },
  starIcon: {
    marginRight: 5,
    marginTop: 1,
  },
  titleText: {
    ...TypographyScale.body,
    fontWeight: '500',
    flexShrink: 1,
  },
  notesText: {
    ...TypographyScale.footnote,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs + 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...TypographyScale.caption1,
  },
  projectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  projectText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
});
