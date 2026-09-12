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
import { PriorityLevel, ReminderOption, RecurrenceFrequency, Task, TaskReminderConfig } from '../../models/task';
import { ReminderScheduler } from '../../services/notifications/ReminderScheduler';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { safeGoBack } from '../../utils/navigation';
import { WindowsDesktopShell } from '../../components/desktop/WindowsDesktopShell';
import { formatShortTime, formatTaskTime, formatClockTime } from '../../utils/timeFormatter';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';
import { calculateTaskProgress } from '../../utils/progress';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';
import { haptics } from '../../services/haptics';

import { TaskDestinationSelector } from '../../components/tasks/TaskDestinationSelector';
import { CustomTimePicker } from '../../components/common/CustomTimePicker';
import { CustomDatePicker } from '../../components/common/CustomDatePicker';

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
  const [reminderConfig, setReminderConfig] = useState<TaskReminderConfig | undefined>(task?.reminderConfig);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Time picker modal
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState(task?.dueTime || '17:00');

  // Date picker modal
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [customDateInput, setCustomDateInput] = useState(task?.dueDate || getTodayDateString());

  // Custom Reminder Date/Time Modal
  const [customReminderModalVisible, setCustomReminderModalVisible] = useState(false);
  const [customRemDateInput, setCustomRemDateInput] = useState(
    task?.reminderConfig?.customDate || task?.dueDate || getTodayDateString()
  );
  const [customRemTimeInput, setCustomRemTimeInput] = useState(
    task?.reminderConfig?.customTime || task?.dueTime || '17:30'
  );

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
      setReminderConfig(task.reminderConfig);
      if (task.reminderConfig?.customDate) {
        setCustomRemDateInput(task.reminderConfig.customDate);
      }
      if (task.reminderConfig?.customTime) {
        setCustomRemTimeInput(task.reminderConfig.customTime);
      }
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

    const timezone =
      reminderConfig?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC';

    let finalConfig: TaskReminderConfig | undefined = undefined;
    if (reminder === 'custom') {
      const customRes = ReminderScheduler.calculateCustomTrigger(customRemDateInput, customRemTimeInput, timezone);
      if (customRes) {
        finalConfig = {
          enabled: true,
          type: 'custom',
          customDate: customRemDateInput,
          customTime: customRemTimeInput,
          triggerAt: customRes.canonicalIso,
          triggerEpochMs: customRes.triggerEpochMs,
          timezone,
          snoozeEnabled: true,
          alarmMode: 'both',
        };
      }
    } else if (reminder !== 'none') {
      const dummyTask: any = { dueDate, dueTime, reminder, completed: false };
      const resolved = ReminderScheduler.resolveReminderTrigger(dummyTask);
      if (resolved) {
        finalConfig = {
          enabled: true,
          type: 'preset',
          presetOption: reminder,
          triggerAt: resolved.canonicalIso,
          triggerEpochMs: resolved.triggerEpochMs,
          timezone,
          snoozeEnabled: true,
          alarmMode: 'both',
        };
      }
    }

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
      reminderConfig: finalConfig,
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

  const bottomInset = Math.max(insets.bottom, 24) + 84;

  return (
    <PrimarySurface>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <AnimatedPressable
          profile="smallControl"
          onPress={() => safeGoBack(router)}
          style={[
            styles.headerIconBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </AnimatedPressable>

        <View style={styles.headerRightActions}>
          {/* Pin Quick Toggle */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => toggleTaskPin(task.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: task.isPinned }}
            accessibilityLabel="Pin task"
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: task.isPinned
                  ? colors.accent + '25'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.04)',
                borderColor: task.isPinned
                  ? colors.accent
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <Pin
              size={18}
              color={task.isPinned ? colors.accent : colors.textTertiary}
              fill={task.isPinned ? colors.accent : 'transparent'}
            />
          </AnimatedPressable>

          {/* Favorite Quick Toggle */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => toggleTaskFavorite(task.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: task.isFavorite }}
            accessibilityLabel="Favorite task"
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: task.isFavorite
                  ? '#FFCC0025'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : 'rgba(0, 0, 0, 0.04)',
                borderColor: task.isFavorite
                  ? '#FFCC00'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <Star
              size={18}
              color={task.isFavorite ? '#FFCC00' : colors.textTertiary}
              fill={task.isFavorite ? '#FFCC00' : 'transparent'}
            />
          </AnimatedPressable>

          {/* Delete */}
          <AnimatedPressable
            profile="destructiveAction"
            onPress={handleDeleteTask}
            accessibilityRole="button"
            accessibilityLabel="Delete task"
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.18)',
              },
            ]}
          >
            <Trash2 size={18} color={colors.error} />
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

          {/* Primary Date Options: Today | Tomorrow | Pick Date */}
          <View style={styles.dateSegmentedRow}>
            {/* Today */}
            <AnimatedPressable
              profile="smallControl"
              accessibilityRole="button"
              accessibilityState={{ selected: dueDate === getTodayDateString() }}
              accessibilityLabel="Due today"
              onPress={() => {
                haptics.selection();
                setDueDate(getTodayDateString());
              }}
              style={[
                styles.dateSegmentBtn,
                {
                  backgroundColor:
                    dueDate === getTodayDateString() ? colors.accent : colors.secondaryBackground,
                  borderColor:
                    dueDate === getTodayDateString()
                      ? colors.accent
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.dateSegmentText,
                  {
                    color:
                      dueDate === getTodayDateString() ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: dueDate === getTodayDateString() ? '800' : '600',
                  },
                ]}
              >
                Today
              </Text>
            </AnimatedPressable>

            {/* Tomorrow */}
            <AnimatedPressable
              profile="smallControl"
              accessibilityRole="button"
              accessibilityState={{ selected: dueDate === getTomorrowDateString() }}
              accessibilityLabel="Due tomorrow"
              onPress={() => {
                haptics.selection();
                setDueDate(getTomorrowDateString());
              }}
              style={[
                styles.dateSegmentBtn,
                {
                  backgroundColor:
                    dueDate === getTomorrowDateString() ? colors.accent : colors.secondaryBackground,
                  borderColor:
                    dueDate === getTomorrowDateString()
                      ? colors.accent
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.dateSegmentText,
                  {
                    color:
                      dueDate === getTomorrowDateString() ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: dueDate === getTomorrowDateString() ? '800' : '600',
                  },
                ]}
              >
                Tomorrow
              </Text>
            </AnimatedPressable>

            {/* Pick Date */}
            <AnimatedPressable
              profile="smallControl"
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  Boolean(dueDate) &&
                  dueDate !== getTodayDateString() &&
                  dueDate !== getTomorrowDateString(),
              }}
              accessibilityLabel="Pick custom due date"
              onPress={() => {
                haptics.selection();
                setDatePickerVisible(true);
              }}
              style={[
                styles.dateSegmentBtn,
                {
                  backgroundColor:
                    dueDate &&
                    dueDate !== getTodayDateString() &&
                    dueDate !== getTomorrowDateString()
                      ? colors.accent
                      : colors.secondaryBackground,
                  borderColor:
                    dueDate &&
                    dueDate !== getTodayDateString() &&
                    dueDate !== getTomorrowDateString()
                      ? colors.accent
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Calendar
                size={14}
                color={
                  dueDate &&
                  dueDate !== getTodayDateString() &&
                  dueDate !== getTomorrowDateString()
                    ? '#FFFFFF'
                    : colors.textSecondary
                }
                style={{ marginRight: 5 }}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.dateSegmentText,
                  {
                    color:
                      dueDate &&
                      dueDate !== getTodayDateString() &&
                      dueDate !== getTomorrowDateString()
                        ? '#FFFFFF'
                        : colors.textSecondary,
                    fontWeight:
                      dueDate &&
                      dueDate !== getTodayDateString() &&
                      dueDate !== getTomorrowDateString()
                        ? '800'
                        : '600',
                  },
                ]}
              >
                {dueDate &&
                dueDate !== getTodayDateString() &&
                dueDate !== getTomorrowDateString()
                  ? dueDate
                  : 'Pick Date'}
              </Text>
            </AnimatedPressable>
          </View>

          {/* No Date as separate clean control */}
          <View style={styles.noDateRow}>
            <AnimatedPressable
              profile="smallControl"
              accessibilityRole="button"
              accessibilityState={{ selected: !dueDate }}
              accessibilityLabel="No due date"
              onPress={() => {
                haptics.selection();
                setDueDate(undefined);
                setDueTime(undefined);
              }}
              style={[
                styles.noDateBtn,
                {
                  backgroundColor: !dueDate
                    ? isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(0, 0, 0, 0.08)'
                    : 'transparent',
                  borderColor: !dueDate
                    ? colors.accent
                    : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <X size={13} color={!dueDate ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
              <Text
                style={[
                  styles.noDateText,
                  {
                    color: !dueDate ? colors.textPrimary : colors.textTertiary,
                    fontWeight: !dueDate ? '700' : '500',
                  },
                ]}
              >
                No Due Date
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>Reminder</Text>
            {reminder === 'custom' && (
              <AnimatedPressable
                profile="smallControl"
                accessibilityRole="button"
                accessibilityLabel="Edit custom reminder time"
                onPress={() => {
                  haptics.selection();
                  setCustomReminderModalVisible(true);
                }}
                style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radii.pill, backgroundColor: colors.accent + '20', borderWidth: 1, borderColor: colors.accent }}
              >
                <Text style={{ ...TypographyScale.caption2, color: colors.accent, fontWeight: '800' }}>Edit Time</Text>
              </AnimatedPressable>
            )}
          </View>

          <View style={styles.reminderGrid}>
            {[
              { id: 'none', label: 'None' },
              { id: 'at_time', label: 'At Time' },
              { id: '5m_before', label: '5m Before' },
              { id: '15m_before', label: '15m Before' },
              { id: '30m_before', label: '30m Before' },
              { id: '1h_before', label: '1h Before' },
              { id: '1d_before', label: '1d Before' },
              { id: 'custom', label: 'Custom...' },
            ].map(({ id: rId, label }) => {
              const isSelected = reminder === rId;
              return (
                <AnimatedPressable
                  key={rId}
                  profile="smallControl"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Reminder ${label}`}
                  onPress={() => {
                    haptics.selection();
                    setReminder(rId as ReminderOption);
                    if (rId === 'custom') {
                      setCustomReminderModalVisible(true);
                    }
                  }}
                  style={[
                    styles.reminderGridBtn,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.secondaryBackground,
                      borderColor: isSelected
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    },
                    isSelected && Shadows.subtle,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.reminderGridText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Canonical Trigger Summary */}
          {reminder !== 'none' && (
            <View style={{ marginTop: Spacing.sm, padding: Spacing.md, borderRadius: Radii.lg, backgroundColor: colors.secondaryBackground, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}>
              <Bell size={16} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={{ ...TypographyScale.caption1, color: colors.textSecondary, flex: 1, lineHeight: 18 }}>
                {reminder === 'custom'
                  ? `Custom Alert: ${customRemDateInput} at ${customRemTimeInput} (${reminderConfig?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'})`
                  : `Preset Alert: ${reminder.replace('_', ' ')} (${reminderConfig?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'})`}
              </Text>
            </View>
          )}
        </ElevatedCard>

        {/* Priority Selector */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Priority</Text>
          <View
            style={[
              styles.prioritySegmentedTrack,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {[
              { id: 'none', label: 'None', color: colors.accent },
              { id: 'low', label: 'Low', color: '#38BDF8' },
              { id: 'medium', label: 'Medium', color: '#FBBF24' },
              { id: 'high', label: 'High', color: '#FB923C' },
              { id: 'urgent', label: 'Urgent', color: '#F87171' },
            ].map(({ id: pId, label, color: pColor }) => {
              const isSelected = priority === pId;
              return (
                <AnimatedPressable
                  key={pId}
                  profile="smallControl"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Priority ${label}`}
                  onPress={() => {
                    haptics.selection();
                    setPriority(pId as PriorityLevel);
                  }}
                  style={[
                    styles.prioritySegmentBtn,
                    {
                      backgroundColor: isSelected
                        ? pColor
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                      borderColor: isSelected
                        ? 'transparent'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    },
                    isSelected && styles.prioritySegmentBtnActive,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.prioritySegmentText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </AnimatedPressable>
              );
            })}
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
                  color={sub.completed ? colors.accent : colors.textTertiary}
                  style={{ marginRight: Spacing.sm }}
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
              <AnimatedPressable profile="destructiveAction" onPress={() => deleteSubtask(task.id, sub.id)}>
                <Trash2 size={16} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          ))}

          <View style={styles.addSubtaskRow}>
            <TextInput
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add subtask..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={handleAddSubtask}
              style={[styles.subtaskInput, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
            />
            <AnimatedPressable
              profile="smallControl"
              onPress={handleAddSubtask}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={18} color="#FFFFFF" />
            </AnimatedPressable>
          </View>
        </ElevatedCard>

        {/* Notes Section */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add detailed notes here..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            style={[styles.notesInput, { color: colors.textPrimary }]}
          />
        </ElevatedCard>

        {/* Audit Log / History Details (Requirement 47) */}
        {activityLogs.length > 0 && (
          <ElevatedCard style={styles.cardSection}>
            <View style={styles.activityHeader}>
              <History size={16} color={colors.textTertiary} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>Activity</Text>
            </View>
            {activityLogs.map((log, idx) => (
              <View key={idx} style={styles.logItem}>
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
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.94)',
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <AnimatedPressable
          profile="primaryButton"
          onPress={handleSaveAndDone}
          accessibilityRole="button"
          accessibilityLabel="Save and Done"
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
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Select Due Time</Text>
            <CustomTimePicker
              value={customTimeInput}
              onChange={setCustomTimeInput}
            />
            <View style={styles.modalBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setTimePickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel time selection"
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="primaryButton"
                onPress={() => {
                  setDueTime(customTimeInput.trim());
                  setTimePickerVisible(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Set time"
                style={[styles.modalConfirmBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.modalConfirmBtnText}>Set Time</Text>
              </AnimatedPressable>
            </View>
          </ElevatedCard>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal visible={datePickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ElevatedCard style={[styles.pickerModalCard, Shadows.floating]}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Select Due Date</Text>
            <CustomDatePicker
              value={customDateInput}
              onChange={setCustomDateInput}
            />
            <View style={styles.modalBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setDatePickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel date selection"
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="primaryButton"
                onPress={() => {
                  setDueDate(customDateInput.trim());
                  setDatePickerVisible(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Set date"
                style={[styles.modalConfirmBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.modalConfirmBtnText}>Set Date</Text>
              </AnimatedPressable>
            </View>
          </ElevatedCard>
        </View>
      </Modal>

      {/* Custom Reminder Date/Time Picker Modal */}
      <Modal visible={customReminderModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <ElevatedCard style={styles.pickerModalCard}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Set Custom Reminder</Text>
            <Text style={{ ...TypographyScale.caption1, color: colors.textSecondary, marginBottom: Spacing.sm }}>
              Remind you at an exact date & time in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'})
            </Text>

            <Text style={{ ...TypographyScale.caption2, color: colors.textTertiary, marginBottom: 2 }}>Reminder Date (YYYY-MM-DD)</Text>
            <TextInput
              value={customRemDateInput}
              onChangeText={setCustomRemDateInput}
              placeholder={getTodayDateString()}
              placeholderTextColor={colors.textTertiary}
              style={[styles.modalTextInput, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary, marginBottom: Spacing.sm }]}
            />

            <Text style={{ ...TypographyScale.caption2, color: colors.textTertiary, marginBottom: 2 }}>Reminder Time</Text>
            <CustomTimePicker
              value={customRemTimeInput}
              onChange={setCustomRemTimeInput}
            />

            <View style={styles.modalBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setCustomReminderModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel custom reminder"
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="primaryButton"
                onPress={() => {
                  const tz = reminderConfig?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                  const res = ReminderScheduler.calculateCustomTrigger(customRemDateInput.trim(), customRemTimeInput.trim(), tz);
                  if (res) {
                    setReminder('custom');
                    setReminderConfig({
                      enabled: true,
                      type: 'custom',
                      customDate: customRemDateInput.trim(),
                      customTime: customRemTimeInput.trim(),
                      triggerAt: res.canonicalIso,
                      triggerEpochMs: res.triggerEpochMs,
                      timezone: tz,
                      snoozeEnabled: true,
                      alarmMode: 'both',
                    });
                    setCustomReminderModalVisible(false);
                    haptics.selection();
                  } else {
                    Alert.alert('Invalid Time', 'Please enter a valid future date (YYYY-MM-DD) and time (HH:mm).');
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Confirm alert"
                style={[styles.modalConfirmBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.modalConfirmBtnText}>Confirm Alert</Text>
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
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  dateSegmentedRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginTop: 2,
  },
  dateSegmentBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
  },
  dateSegmentText: {
    ...TypographyScale.footnote,
    fontSize: 13,
  },
  noDateRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Spacing.xs + 2,
  },
  noDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 36,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  noDateText: {
    ...TypographyScale.caption1,
    fontSize: 12,
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
  reminderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  reminderGridBtn: {
    width: '23%',
    minWidth: 70,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  reminderGridText: {
    ...TypographyScale.caption2,
    fontSize: 11,
    textAlign: 'center',
  },
  prioritySegmentedTrack: {
    flexDirection: 'row',
    height: 48,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    alignItems: 'center',
  },
  prioritySegmentBtn: {
    flex: 1,
    height: '100%',
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  prioritySegmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  prioritySegmentText: {
    ...TypographyScale.caption1,
    fontSize: 12.5,
    textAlign: 'center',
    letterSpacing: 0.2,
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
    height: 54,
    minHeight: 54,
    borderRadius: Radii.pill,
  },
  doneBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 380,
    padding: Spacing.xl,
    borderRadius: Radii.xl,
  },
  modalHeading: {
    ...TypographyScale.title3,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  modalTextInput: {
    ...TypographyScale.body,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    paddingHorizontal: Spacing.xl,
    height: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    ...TypographyScale.body,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    paddingHorizontal: Spacing.xl,
    height: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.lg,
  },
  modalConfirmBtnText: {
    ...TypographyScale.body,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalActionBtn: {
    paddingHorizontal: Spacing.xl,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
});
