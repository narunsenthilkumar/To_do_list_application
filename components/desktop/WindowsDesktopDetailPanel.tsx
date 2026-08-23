import React, { useState, useEffect } from 'react';
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
  X,
  Calendar,
  Clock,
  Flag,
  Folder,
  Tag as TagIcon,
  Bell,
  Repeat,
  Plus,
  Trash2,
  Check,
  Play,
  Copy,
  CheckCircle2,
  History,
  AlignLeft,
  CalendarDays,
  Pin,
  Star,
  Inbox,
} from 'lucide-react-native';
import { Task, PriorityLevel, ReminderOption, RecurrenceFrequency } from '../../models/task';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { formatTaskTime, formatShortTime } from '../../utils/timeFormatter';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';

interface WindowsDesktopDetailPanelProps {
  task: Task | null;
  onClose: () => void;
  onStartFocus: (task: Task) => void;
}

export const WindowsDesktopDetailPanel: React.FC<WindowsDesktopDetailPanelProps> = ({
  task,
  onClose,
  onStartFocus,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const {
    tasks,
    projects,
    tags,
    updateTask,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    addTask,
  } = useTaskora();

  // Local state for instant and safe editing
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [dueDate, setDueDate] = useState<string | undefined>(task?.dueDate);
  const [dueTime, setDueTime] = useState<string | undefined>(task?.dueTime);
  const [priority, setPriority] = useState<PriorityLevel>(task?.priority || 'none');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    Array.isArray(task?.projectIds) ? task!.projectIds : (task?.projectId ? [task.projectId] : [])
  );
  const [inboxSelected, setInboxSelected] = useState<boolean>(
    typeof task?.inbox === 'boolean'
      ? task.inbox
      : (!task?.projectId && (!task?.projectIds || task.projectIds.length === 0))
  );
  const [reminder, setReminder] = useState<ReminderOption>(task?.reminder || 'none');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(
    (task?.recurrence?.frequency as RecurrenceFrequency) || 'never'
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Sync state if external task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      setDueDate(task.dueDate);
      setDueTime(task.dueTime);
      setPriority(task.priority || 'none');
      const pIds = Array.isArray(task.projectIds) ? task.projectIds : (task.projectId ? [task.projectId] : []);
      setSelectedProjectIds(pIds);
      setInboxSelected(
        typeof task.inbox === 'boolean' ? task.inbox : (!task.projectId && pIds.length === 0)
      );
      setReminder(task.reminder || 'none');
      setRecurrence((task.recurrence?.frequency as RecurrenceFrequency) || 'never');
    }
  }, [task?.id, task?.updatedAt]);

  if (!task) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: isDark ? '#121216' : '#FAFAFC' }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
          <CheckCircle2 size={32} color={colors.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Task Selected</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
          Click on any task in the list to view and edit its details.
        </Text>
      </View>
    );
  }

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== task.notes) {
      updateTask(task.id, { notes });
    }
  };

  const handlePriorityChange = (newPriority: PriorityLevel) => {
    setPriority(newPriority);
    updateTask(task.id, { priority: newPriority });
  };

  const handleToggleInbox = () => {
    const nextInbox = !inboxSelected;
    setInboxSelected(nextInbox);
    updateTask(task.id, { inbox: nextInbox });
  };

  const handleToggleProject = (projId: string) => {
    const nextProjectIds = selectedProjectIds.includes(projId)
      ? selectedProjectIds.filter((id) => id !== projId)
      : [...selectedProjectIds, projId];
    setSelectedProjectIds(nextProjectIds);
    updateTask(task.id, {
      projectIds: nextProjectIds,
      projectId: nextProjectIds[0],
    });
  };

  const handleDateChange = (newDate?: string) => {
    setDueDate(newDate);
    updateTask(task.id, { dueDate: newDate });
  };

  const handleTimeChange = (newTime?: string) => {
    setDueTime(newTime);
    updateTask(task.id, { dueTime: newTime });
  };

  const handleReminderChange = (newReminder: ReminderOption) => {
    setReminder(newReminder);
    updateTask(task.id, { reminder: newReminder });
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    await addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const currentTags = task.tags || [];
    const formatted = newTagInput.trim().replace(/^#/, '');
    if (!currentTags.includes(formatted)) {
      await updateTask(task.id, { tags: [...currentTags, formatted] });
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const currentTags = task.tags || [];
    await updateTask(task.id, { tags: currentTags.filter((t) => t !== tagToRemove) });
  };

  const handleDuplicate = async () => {
    await addTask({
      title: `${task.title} (Copy)`,
      notes: task.notes,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      priority: task.priority,
      projectId: task.projectId,
      tags: task.tags,
      subtasks: task.subtasks?.map((s) => ({ ...s, id: `subtask-${Date.now()}-${Math.random()}` })),
    });
  };

  const currentProject = projects.find((p) => p.id === selectedProjectIds[0]);

  return (
    <View
      style={[
        styles.panelContainer,
        {
          backgroundColor: isDark ? 'rgba(20, 20, 26, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      {/* Top Header with Quick Actions */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.headerLeft}>
          <Pressable
            style={[
              styles.checkboxBtn,
              {
                borderColor: task.completed ? colors.success : colors.textTertiary,
                backgroundColor: task.completed ? colors.success : 'transparent',
              },
            ]}
            onPress={() => toggleTaskCompletion(task.id)}
          >
            {task.completed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </Pressable>
          <Text style={[styles.headerStatusText, { color: task.completed ? colors.success : colors.textTertiary }]}>
            {task.completed ? 'Completed' : 'Active Task'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={({ hovered }: any) => [
              styles.iconBtn,
              task.isPinned && { backgroundColor: colors.accent + '20' },
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={() => toggleTaskPin(task.id)}
          >
            <Pin size={16} color={task.isPinned ? colors.accent : colors.textTertiary} />
          </Pressable>

          <Pressable
            style={({ hovered }: any) => [
              styles.iconBtn,
              task.isFavorite && { backgroundColor: '#FF950020' },
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={() => toggleTaskFavorite(task.id)}
          >
            <Star size={16} color={task.isFavorite ? '#FF9500' : colors.textTertiary} />
          </Pressable>

          <Pressable
            style={({ hovered }: any) => [
              styles.iconBtn,
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={onClose}
          >
            <X size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      {/* Main Scrollable Inspector */}
      <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Title Input */}
        <TextInput
          style={[
            styles.titleInput,
            { color: colors.textPrimary },
            task.completed && styles.completedTitle,
          ]}
          value={title}
          onChangeText={setTitle}
          onBlur={handleTitleBlur}
          multiline
          placeholder="Task title"
          placeholderTextColor={colors.textTertiary}
        />

        {/* Priority Selector Pills */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>Priority</Text>
          <View style={styles.priorityGrid}>
            {(['none', 'low', 'medium', 'high', 'urgent'] as PriorityLevel[]).map((p) => {
              const isSelected = priority === p;
              const pColor =
                p === 'urgent'
                  ? colors.priorityUrgent
                  : p === 'high'
                  ? colors.priorityHigh
                  : p === 'medium'
                  ? colors.priorityMedium
                  : p === 'low'
                  ? colors.priorityLow
                  : colors.textTertiary;
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityPill,
                    isSelected && { backgroundColor: pColor + '20', borderColor: pColor },
                    { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                  ]}
                  onPress={() => handlePriorityChange(p)}
                >
                  <Flag size={12} color={pColor} style={{ marginRight: 4 }} />
                  <Text style={[styles.priorityPillText, { color: isSelected ? pColor : colors.textSecondary }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Due Date & Time Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>Schedule</Text>
          <View style={styles.datePresetsRow}>
            <Pressable
              style={[
                styles.dateChip,
                dueDate === getTodayDateString() && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
              onPress={() => handleDateChange(getTodayDateString())}
            >
              <Calendar size={13} color={dueDate === getTodayDateString() ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
              <Text style={[styles.dateChipText, { color: dueDate === getTodayDateString() ? colors.accent : colors.textSecondary }]}>
                Today
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.dateChip,
                dueDate === getTomorrowDateString() && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
              onPress={() => handleDateChange(getTomorrowDateString())}
            >
              <CalendarDays size={13} color={dueDate === getTomorrowDateString() ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
              <Text style={[styles.dateChipText, { color: dueDate === getTomorrowDateString() ? colors.accent : colors.textSecondary }]}>
                Tomorrow
              </Text>
            </Pressable>

            {dueDate && (
              <Pressable
                style={[styles.dateChip, { borderColor: colors.error + '40' }]}
                onPress={() => {
                  handleDateChange(undefined);
                  handleTimeChange(undefined);
                }}
              >
                <X size={12} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={[styles.dateChipText, { color: colors.error }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          {/* Time Picker presets */}
          <View style={styles.timePresetsRow}>
            <Clock size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
              {dueTime ? formatTaskTime(dueTime, timeFormat) : 'No time set'}
            </Text>
            <View style={styles.timeQuickButtons}>
              {['09:00', '13:00', '17:00', '20:00'].map((tm) => (
                <Pressable
                  key={tm}
                  style={[
                    styles.timeQuickBtn,
                    dueTime === tm && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                    { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                  ]}
                  onPress={() => handleTimeChange(tm)}
                >
                  <Text style={[styles.timeQuickText, { color: dueTime === tm ? colors.accent : colors.textTertiary }]}>
                    {formatShortTime(tm)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Project & Destination Assignment */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>Destinations (Inbox & Projects)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectScroll}>
            <Pressable
              style={[
                styles.projectChip,
                inboxSelected && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
              onPress={handleToggleInbox}
            >
              <Inbox size={13} color={inboxSelected ? colors.accent : colors.textTertiary} style={{ marginRight: 6 }} />
              <Text style={[styles.projectChipText, { color: inboxSelected ? colors.accent : colors.textSecondary }]}>
                {inboxSelected ? '✓ Inbox' : '+ Inbox'}
              </Text>
            </Pressable>

            {projects.map((proj) => {
              const isSelected = selectedProjectIds.includes(proj.id);
              const projColor = proj.color || colors.accent;
              return (
                <Pressable
                  key={proj.id}
                  style={[
                    styles.projectChip,
                    isSelected && { backgroundColor: projColor + '20', borderColor: projColor },
                    { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                  ]}
                  onPress={() => handleToggleProject(proj.id)}
                >
                  <View style={[styles.projColorDot, { backgroundColor: projColor }]} />
                  <Text style={[styles.projectChipText, { color: isSelected ? projColor : colors.textSecondary }]}>
                    {isSelected ? `✓ ${proj.name}` : proj.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Subtasks Checklist */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>
            Subtasks ({task.subtasks?.filter((s) => s.completed).length || 0}/{(task.subtasks || []).length})
          </Text>

          {task.subtasks && task.subtasks.length > 0 && (
            <View style={styles.subtasksList}>
              {task.subtasks.map((sub) => (
                <View key={sub.id} style={styles.subtaskRow}>
                  <Pressable
                    style={[
                      styles.subtaskCheckbox,
                      {
                        borderColor: sub.completed ? colors.success : colors.textTertiary,
                        backgroundColor: sub.completed ? colors.success : 'transparent',
                      },
                    ]}
                    onPress={() => toggleSubtask(task.id, sub.id)}
                  >
                    {sub.completed && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                  </Pressable>

                  <Text
                    style={[
                      styles.subtaskTitle,
                      { color: colors.textPrimary },
                      sub.completed && styles.completedSubtask,
                    ]}
                  >
                    {sub.title}
                  </Text>

                  <Pressable
                    style={styles.subtaskDeleteBtn}
                    onPress={() => deleteSubtask(task.id, sub.id)}
                  >
                    <Trash2 size={12} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Add Subtask Input */}
          <View style={[styles.addSubtaskRow, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
            <Plus size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.subtaskInput, { color: colors.textPrimary }]}
              placeholder="Add a step..."
              placeholderTextColor={colors.textTertiary}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              onSubmitEditing={handleAddSubtask}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Notes / Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>Notes & Description</Text>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: colors.textPrimary,
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            multiline
            numberOfLines={4}
            placeholder="Add detailed notes, links, or context..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.textTertiary }]}>Tags</Text>
          <View style={styles.tagsWrap}>
            {(task.tags || []).map((t) => (
              <View key={t} style={[styles.tagBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.tagBadgeText, { color: colors.textSecondary }]}>#{t}</Text>
                <Pressable onPress={() => handleRemoveTag(t)}>
                  <X size={12} color={colors.textTertiary} style={{ marginLeft: 4 }} />
                </Pressable>
              </View>
            ))}

            {showTagInput ? (
              <View style={[styles.tagInputBox, { borderColor: colors.accent }]}>
                <TextInput
                  style={[styles.tagInputField, { color: colors.textPrimary }]}
                  placeholder="tag"
                  placeholderTextColor={colors.textTertiary}
                  value={newTagInput}
                  onChangeText={setNewTagInput}
                  onSubmitEditing={handleAddTag}
                  autoFocus
                />
              </View>
            ) : (
              <Pressable
                style={[styles.addTagBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }]}
                onPress={() => setShowTagInput(true)}
              >
                <Plus size={12} color={colors.accent} style={{ marginRight: 2 }} />
                <Text style={[styles.addTagText, { color: colors.accent }]}>Tag</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Timestamps & Activity Meta */}
        <View style={[styles.metaSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            Created: {new Date(task.createdAt).toLocaleDateString()}
          </Text>
          {task.completedAt && (
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Completed: {new Date(task.completedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions Bar */}
      <View style={[styles.bottomActionBar, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <Pressable
          style={({ hovered }: any) => [
            styles.actionBtn,
            styles.focusBtn,
            hovered && { backgroundColor: '#FF950025' },
          ]}
          onPress={() => onStartFocus(task)}
        >
          <Play size={14} color="#FF9500" style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: '#FF9500' }]}>Focus</Text>
        </Pressable>

        <Pressable
          style={({ hovered }: any) => [
            styles.actionBtn,
            hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={handleDuplicate}
        >
          <Copy size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Duplicate</Text>
        </Pressable>

        <Pressable
          style={({ hovered }: any) => [
            styles.actionBtn,
            hovered && { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
          ]}
          onPress={() => {
            deleteTask(task.id);
            onClose();
          }}
        >
          <Trash2 size={14} color={colors.error} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  emptySubtitle: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  panelContainer: {
    flex: 1,
    borderLeftWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBtn: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    cursor: 'pointer' as any,
  },
  headerStatusText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  scrollBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  titleInput: {
    ...TypographyScale.title3,
    fontWeight: '700',
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
    outlineStyle: 'none',
  } as any,
  completedTitle: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeading: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs + 2,
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  priorityPillText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  datePresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  dateChipText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  timePresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeLabel: {
    ...TypographyScale.caption1,
    marginRight: Spacing.md,
  },
  timeQuickButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  timeQuickBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  timeQuickText: {
    fontSize: 11,
    fontWeight: '600',
  },
  projectScroll: {
    flexDirection: 'row',
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.xs,
    borderWidth: 1,
    marginRight: 6,
    cursor: 'pointer' as any,
  },
  projColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  projectChipText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  subtasksList: {
    gap: 6,
    marginBottom: Spacing.sm,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  subtaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    cursor: 'pointer' as any,
  },
  subtaskTitle: {
    flex: 1,
    ...TypographyScale.footnote,
  },
  completedSubtask: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  subtaskDeleteBtn: {
    padding: 4,
    cursor: 'pointer' as any,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  subtaskInput: {
    flex: 1,
    ...TypographyScale.footnote,
    outlineStyle: 'none',
  } as any,
  notesInput: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    ...TypographyScale.footnote,
    minHeight: 80,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  } as any,
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  tagInputBox: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagInputField: {
    ...TypographyScale.caption2,
    outlineStyle: 'none',
    width: 60,
  } as any,
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    cursor: 'pointer' as any,
  },
  addTagText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  metaSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.xl,
    gap: 4,
  },
  metaText: {
    ...TypographyScale.caption2,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radii.xs,
    cursor: 'pointer' as any,
  },
  focusBtn: {
    backgroundColor: '#FF950015',
  },
  actionBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
});
