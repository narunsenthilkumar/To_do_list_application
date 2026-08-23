import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Clock,
  Flag,
  Folder,
  Bell,
  Repeat,
  Plus,
  Check,
  History,
  Pin,
  Star,
  CheckCircle2,
  CalendarDays,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { TaskCheckbox } from '../../components/tasks/TaskCheckbox';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { PriorityLevel, ReminderOption, RecurrenceFrequency, Task } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { safeGoBack } from '../../utils/navigation';
import { WindowsDesktopShell } from '../../components/desktop/WindowsDesktopShell';
import { formatShortTime, formatTaskTime, formatClockTime } from '../../utils/timeFormatter';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';
import { calculateTaskProgress } from '../../utils/progress';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';
import { haptics } from '../../services/haptics';

import { TaskDestinationSelector } from '../../components/tasks/TaskDestinationSelector';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark, timeFormat } = useTheme();
  const insets = useSafeAreaInsets();

  const isDesktop =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.innerWidth >= 900 || Boolean((window as any).electronAPI?.isElectron));

  if (isDesktop) {
    return <WindowsDesktopShell initialTaskId={id} />;
  }

  const {
    tasks,
    projects,
    updateTask,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useTaskora();

  const task = tasks.find((t) => t.id === id);

  // Local draft state for safe editing
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Time picker modal
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState(task?.dueTime || '17:00');

  // Date picker modal
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [customDateInput, setCustomDateInput] = useState(task?.dueDate || getTodayDateString());

  // Keep local state synced if task updates externally
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
    }
  }, [task?.id, task?.updatedAt]);

  if (!task) {
    return (
      <PrimarySurface>
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>Task not found</Text>
          <AnimatedPressable
            profile="primaryButton"
            onPress={() => safeGoBack(router)}
            style={[styles.backBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go Back</Text>
          </AnimatedPressable>
        </View>
      </PrimarySurface>
    );
  }

  const subtasks = task.subtasks || [];
  const activityLogs = task.activityLogs || [];
  const progressPercent = calculateTaskProgress(task);

  // Save all changes and return smoothly
  const handleSaveAndDone = async () => {
    if (isSaving) return;
    setIsSaving(true);
    haptics.success();

    const cleanTitle = title.trim() || task.title;

    await updateTask(task.id, {
      title: cleanTitle,
      notes: notes.trim(),
      dueDate,
      dueTime,
      priority,
      projectId: selectedProjectIds[0],
      projectIds: selectedProjectIds,
      inbox: inboxSelected,
      reminder,
    });

    setIsSaving(false);
    safeGoBack(router);
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    await addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleDeleteTask = () => {
    haptics.warning();
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          safeGoBack(router);
        },
      },
    ]);
  };

  // Defer quick actions
  const handleDefer = (type: 'later_today' | 'tomorrow' | 'next_week') => {
    haptics.medium();
    const today = getTodayDateString();
    if (type === 'later_today') {
      const now = new Date();
      now.setHours(now.getHours() + 3);
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setDueDate(today);
      setDueTime(`${h}:${m}`);
    } else if (type === 'tomorrow') {
      setDueDate(getTomorrowDateString());
    } else if (type === 'next_week') {
      const nextW = new Date();
      nextW.setDate(nextW.getDate() + 7);
      const y = nextW.getFullYear();
      const mo = String(nextW.getMonth() + 1).padStart(2, '0');
      const d = String(nextW.getDate()).padStart(2, '0');
      setDueDate(`${y}-${mo}-${d}`);
    }
  };

  const bottomInset = Math.max(insets.bottom, 24) + 70;

  return (
    <PrimarySurface>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <AnimatedPressable
          profile="smallControl"
          onPress={() => safeGoBack(router)}
          style={styles.iconBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>

        <View style={styles.headerRightActions}>
          {/* Pin Quick Toggle */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => toggleTaskPin(task.id)}
            style={[styles.iconBtn, task.isPinned && { backgroundColor: colors.accent + '20' }]}
          >
            <Pin
              size={20}
              color={task.isPinned ? colors.accent : colors.textTertiary}
              fill={task.isPinned ? colors.accent : 'transparent'}
            />
          </AnimatedPressable>

          {/* Favorite Quick Toggle */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => toggleTaskFavorite(task.id)}
            style={[styles.iconBtn, task.isFavorite && { backgroundColor: '#FFCC0025' }]}
          >
            <Star
              size={20}
              color={task.isFavorite ? '#FFCC00' : colors.textTertiary}
              fill={task.isFavorite ? '#FFCC00' : 'transparent'}
            />
          </AnimatedPressable>

          {/* Delete */}
          <AnimatedPressable profile="destructiveAction" onPress={handleDeleteTask} style={styles.iconBtn}>
            <Trash2 size={20} color={colors.error} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title & Checkbox */}
        <View style={styles.titleSection}>
          <TaskCheckbox
            completed={task.completed}
            onToggle={() => toggleTaskCompletion(task.id)}
            priority={priority}
            size={28}
          />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Task title..."
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.titleInput,
              {
                color: task.completed ? colors.textTertiary : colors.textPrimary,
                textDecorationLine: task.completed ? 'line-through' : 'none',
              },
            ]}
            multiline
          />
        </View>

        {/* Progress Bar for Subtasks / Task completion */}
        <ElevatedCard style={styles.cardSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              Task Progress ({subtasks.filter((s) => s.completed).length}/{subtasks.length} subtasks)
            </Text>
            <Text style={[styles.progressValue, { color: colors.accent }]}>{progressPercent}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondaryBackground }]}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.accent }]} />
          </View>
        </ElevatedCard>

        {/* Date & Time Selector Card */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Due Date & Time</Text>
          
          <View style={styles.chipRow}>
            {/* Today */}
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                haptics.selection();
                setDueDate(getTodayDateString());
              }}
              style={[
                styles.selectorChip,
                { backgroundColor: dueDate === getTodayDateString() ? colors.accent : colors.secondaryBackground },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: dueDate === getTodayDateString() ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Today
              </Text>
            </AnimatedPressable>

            {/* Tomorrow */}
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                haptics.selection();
                setDueDate(getTomorrowDateString());
              }}
              style={[
                styles.selectorChip,
                { backgroundColor: dueDate === getTomorrowDateString() ? colors.accent : colors.secondaryBackground },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: dueDate === getTomorrowDateString() ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Tomorrow
              </Text>
            </AnimatedPressable>

            {/* Custom Date */}
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                haptics.selection();
                setDatePickerVisible(true);
              }}
              style={[
                styles.selectorChip,
                {
                  backgroundColor:
                    dueDate && dueDate !== getTodayDateString() && dueDate !== getTomorrowDateString()
                      ? colors.accent
                      : colors.secondaryBackground,
                },
              ]}
            >
              <Calendar size={14} color={dueDate && dueDate !== getTodayDateString() && dueDate !== getTomorrowDateString() ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      dueDate && dueDate !== getTodayDateString() && dueDate !== getTomorrowDateString()
                        ? '#FFFFFF'
                        : colors.textSecondary,
                  },
                ]}
              >
                {dueDate && dueDate !== getTodayDateString() && dueDate !== getTomorrowDateString()
                  ? dueDate
                  : 'Pick Date'}
              </Text>
            </AnimatedPressable>

            {/* No Date */}
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                haptics.selection();
                setDueDate(undefined);
                setDueTime(undefined);
              }}
              style={[
                styles.selectorChip,
                { backgroundColor: !dueDate ? colors.accent : colors.secondaryBackground },
              ]}
            >
              <Text style={[styles.chipText, { color: !dueDate ? '#FFFFFF' : colors.textSecondary }]}>
                No Date
              </Text>
            </AnimatedPressable>
          </View>

          {/* Time Picker Row */}
          {dueDate && (
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={[styles.subSectionTitle, { color: colors.textTertiary }]}>Time</Text>
              <View style={styles.chipRow}>
                {['09:00', '12:00', '15:00', '17:00', '21:00'].map((presetTime) => (
                  <AnimatedPressable
                    key={presetTime}
                    profile="smallControl"
                    onPress={() => {
                      haptics.selection();
                      setDueTime(presetTime);
                    }}
                    style={[
                      styles.selectorChip,
                      { backgroundColor: dueTime === presetTime ? colors.accent : colors.secondaryBackground },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: dueTime === presetTime ? '#FFFFFF' : colors.textSecondary }]}>
                      {formatShortTime(presetTime, timeFormat)}
                    </Text>
                  </AnimatedPressable>
                ))}

                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => {
                    haptics.selection();
                    setTimePickerVisible(true);
                  }}
                  style={[
                    styles.selectorChip,
                    {
                      backgroundColor:
                        dueTime && !['09:00', '12:00', '15:00', '17:00', '21:00'].includes(dueTime)
                          ? colors.accent
                          : colors.secondaryBackground,
                    },
                  ]}
                >
                  <Clock size={13} color={dueTime && !['09:00', '12:00', '15:00', '17:00', '21:00'].includes(dueTime) ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          dueTime && !['09:00', '12:00', '15:00', '17:00', '21:00'].includes(dueTime)
                            ? '#FFFFFF'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {dueTime ? formatTaskTime(dueTime, timeFormat) : 'Custom'}
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Defer Quick Actions */}
          <View style={styles.deferRow}>
            <Text style={[styles.subSectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>Quick Defer:</Text>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => handleDefer('later_today')}
              style={[styles.deferBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <Text style={[styles.deferBtnText, { color: colors.textSecondary }]}>Later Today</Text>
            </AnimatedPressable>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => handleDefer('tomorrow')}
              style={[styles.deferBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <Text style={[styles.deferBtnText, { color: colors.textSecondary }]}>Tomorrow</Text>
            </AnimatedPressable>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => handleDefer('next_week')}
              style={[styles.deferBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <Text style={[styles.deferBtnText, { color: colors.textSecondary }]}>Next Week</Text>
            </AnimatedPressable>
          </View>
        </ElevatedCard>

        {/* Reminders Card */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Reminder</Text>
          <View style={styles.chipRow}>
            {(['none', 'at_time', '5m_before', '15m_before', '30m_before', '1h_before', '1d_before'] as ReminderOption[]).map((r) => (
              <AnimatedPressable
                key={r}
                profile="smallControl"
                onPress={() => {
                  haptics.selection();
                  setReminder(r);
                }}
                style={[
                  styles.selectorChip,
                  { backgroundColor: reminder === r ? colors.accent : colors.secondaryBackground },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: reminder === r ? '#FFFFFF' : colors.textSecondary,
                      textTransform: 'capitalize',
                    },
                  ]}
                >
                  {r.replace('_', ' ')}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </ElevatedCard>

        {/* Priority Selector */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Priority</Text>
          <View style={styles.chipRow}>
            {(['none', 'low', 'medium', 'high', 'urgent'] as PriorityLevel[]).map((p) => (
              <AnimatedPressable
                key={p}
                profile="smallControl"
                onPress={() => {
                  haptics.selection();
                  setPriority(p);
                }}
                style={[
                  styles.selectorChip,
                  {
                    backgroundColor: priority === p ? colors.accent : colors.secondaryBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: priority === p ? '#FFFFFF' : colors.textSecondary, textTransform: 'capitalize' },
                  ]}
                >
                  {p}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </ElevatedCard>

        {/* Destination Selector: Inbox & Projects */}
        <ElevatedCard style={styles.cardSection}>
          <TaskDestinationSelector
            selectedProjectIds={selectedProjectIds}
            inbox={inboxSelected}
            projects={projects}
            onToggleInbox={(val) => setInboxSelected(val)}
            onSelectProject={(pId) => {
              if (!selectedProjectIds.includes(pId)) {
                setSelectedProjectIds([...selectedProjectIds, pId]);
              }
            }}
            onRemoveProject={(pId) => {
              setSelectedProjectIds(selectedProjectIds.filter((id) => id !== pId));
            }}
          />
        </ElevatedCard>

        {/* Subtasks Section */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Subtasks</Text>
          {subtasks.map((sub) => (
            <View key={sub.id} style={styles.subtaskRow}>
              <AnimatedPressable profile="smallControl" onPress={() => toggleSubtask(task.id, sub.id)}>
                <Check
                  size={18}
                  color={sub.completed ? colors.success : colors.textTertiary}
                  style={{ marginRight: 8 }}
                />
              </AnimatedPressable>
              <Text
                style={[
                  styles.subtaskText,
                  {
                    color: sub.completed ? colors.textTertiary : colors.textPrimary,
                    textDecorationLine: sub.completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {sub.title}
              </Text>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => deleteSubtask(task.id, sub.id)}
                style={{ padding: 4 }}
              >
                <Trash2 size={14} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          ))}

          <View style={styles.addSubtaskRow}>
            <TextInput
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add a subtask..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.subtaskInput, { color: colors.textPrimary, backgroundColor: colors.secondaryBackground }]}
              onSubmitEditing={handleAddSubtask}
            />
            <AnimatedPressable
              profile="smallControl"
              onPress={handleAddSubtask}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={16} color="#FFFFFF" />
            </AnimatedPressable>
          </View>
        </ElevatedCard>

        {/* Notes Area */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add detailed notes..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.notesInput, { color: colors.textPrimary }]}
            multiline
          />
        </ElevatedCard>

        {/* Activity Audit Log */}
        {activityLogs.length > 0 && (
          <ElevatedCard style={styles.cardSection}>
            <View style={styles.activityHeader}>
              <History size={16} color={colors.textTertiary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>
                Activity History
              </Text>
            </View>

            {activityLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <Text style={[styles.logText, { color: colors.textSecondary }]}>
                  {log.action} · {formatClockTime(new Date(log.timestamp), timeFormat).formatted}
                </Text>
              </View>
            ))}
          </ElevatedCard>
        )}
      </ScrollView>

      {/* Floating Apple-Style DONE Save Button (Requirement 33) */}
      <View
        style={[
          styles.floatingBottomBar,
          {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <AnimatedPressable
          profile="primaryButton"
          onPress={handleSaveAndDone}
          style={[styles.doneBtn, { backgroundColor: colors.accent }, Shadows.floating]}
        >
          <CheckCircle2 size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.doneBtnText}>Done</Text>
        </AnimatedPressable>
      </View>

      {/* Custom Time Picker Modal */}
      <Modal visible={timePickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ElevatedCard style={styles.pickerModalCard}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Enter Due Time (HH:mm)</Text>
            <TextInput
              value={customTimeInput}
              onChangeText={setCustomTimeInput}
              placeholder="17:00"
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalTextInput, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
            />
            <View style={styles.modalBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setTimePickerVisible(false)}
                style={[styles.modalActionBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  setDueTime(customTimeInput.trim());
                  setTimePickerVisible(false);
                }}
                style={[styles.modalActionBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Set Time</Text>
              </AnimatedPressable>
            </View>
          </ElevatedCard>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ElevatedCard style={styles.pickerModalCard}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Enter Due Date (YYYY-MM-DD)</Text>
            <TextInput
              value={customDateInput}
              onChangeText={setCustomDateInput}
              placeholder="2026-08-20"
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalTextInput, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
            />
            <View style={styles.modalBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setDatePickerVisible(false)}
                style={[styles.modalActionBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  setDueDate(customDateInput.trim());
                  setDatePickerVisible(false);
                }}
                style={[styles.modalActionBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Set Date</Text>
              </AnimatedPressable>
            </View>
          </ElevatedCard>
        </View>
      </Modal>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    padding: Spacing.xs,
    borderRadius: Radii.pill,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...TypographyScale.title2,
    marginBottom: Spacing.md,
  },
  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  titleInput: {
    ...TypographyScale.title2,
    flex: 1,
    marginLeft: Spacing.md,
    paddingTop: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  cardSection: {
    marginBottom: Spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  progressValue: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  subSectionTitle: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  selectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radii.pill,
  },
  chipText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  deferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  deferBtn: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  deferBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    justifyContent: 'space-between',
  },
  subtaskText: {
    ...TypographyScale.body,
    flex: 1,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    ...TypographyScale.body,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    ...TypographyScale.body,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
          boxShadow: 'none',
        } as any)
      : {}),
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logItem: {
    paddingVertical: 2,
  },
  logText: {
    ...TypographyScale.caption1,
    textTransform: 'capitalize',
  },
  floatingBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radii.pill,
  },
  doneBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 360,
    padding: Spacing.lg,
    borderRadius: Radii.xl,
  },
  modalHeading: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  modalTextInput: {
    ...TypographyScale.body,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalActionBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
});
