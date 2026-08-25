import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  Clock,
  Folder,
  Plus,
  Check,
  Sparkles,
  X,
  Mic,
  MicOff,
  Tag as TagIcon,
  Flag,
  Bell,
  Timer,
  ChevronDown,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeInDown,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { safeHaptics } from '../../utils/haptics';
import { safeGoBack } from '../../utils/navigation';
import { formatTaskTime } from '../../utils/timeFormatter';
import {
  NaturalLanguageParser,
  CategoryEngine,
  SmartReminderEngine,
  VoiceService,
  VoiceResult,
  ParsedTask,
  CATEGORY_DEFINITIONS,
} from '../../smart';
import { PriorityLevel, RecurrenceFrequency, ReminderOption, TaskReminderConfig } from '../../models/task';
import { ReminderScheduler } from '../../services/notifications/ReminderScheduler';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';
import { SpringConfigs } from '../../theme/animations';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';


import { TaskDestinationSelector } from '../../components/tasks/TaskDestinationSelector';

export default function QuickAddModal() {
  const router = useRouter();
  const { initialProjectId, initialInbox } = useLocalSearchParams<{ initialProjectId?: string; initialInbox?: string }>();
  const { colors, isDark, timeFormat } = useTheme();
  const insets = useSafeAreaInsets();
  const { addTask, projects, smartSettings } = useTaskora();

  const [rawText, setRawText] = useState('');
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);

  const [dueDate, setDueDate] = useState<string | undefined>(getTodayDateString());
  const [dueTime, setDueTime] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [category, setCategory] = useState<string>('General');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(
    initialProjectId ? [initialProjectId] : []
  );
  const [inboxSelected, setInboxSelected] = useState<boolean>(
    initialInbox === 'true' || (!initialProjectId && (!initialProjectId || initialProjectId === ''))
  );
  const [selectedTags] = useState<string[]>([]);
  const [reminder, setReminder] = useState<ReminderOption>('none');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('never');
  const [notes, setNotes] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean; createdAt: string }[]>([]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSpokenText, setVoiceSpokenText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reanimated Sheet Entrance Physics
  const sheetTranslateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  // Pulsing voice animation
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    sheetTranslateY.value = withSpring(0, SpringConfigs.modalSheet);
    backdropOpacity.value = withTiming(1, { duration: 250 });

    return () => {
      VoiceService.stopListening();
      VoiceService.setAudioLevelCallback(null);
    };
  }, []);

  useEffect(() => {
    if (!isListening) {
      pulseScale.value = withTiming(1, { duration: 200 });
      VoiceService.setAudioLevelCallback(null);
    }
  }, [isListening]);

  const safeClose = () => {
    try {
      safeGoBack(router);
    } catch {
      router.back();
    }
  };

  const handleClose = () => {
    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
    }
    backdropOpacity.value = withTiming(0, { duration: 180 });
    sheetTranslateY.value = withTiming(400, { duration: 220 }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(safeClose)();
      }
    });
  };


  // Live NLP Parsing effect
  useEffect(() => {
    if (rawText.trim()) {
      const parsed = NaturalLanguageParser.parse(rawText);
      setParsedTask(parsed);

      if (smartSettings.smartParsingEnabled) {
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        if (parsed.dueTime) setDueTime(parsed.dueTime);
        if (parsed.priority !== 'none') setPriority(parsed.priority);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.estimatedDuration) setEstimatedDuration(parsed.estimatedDuration);
        if (parsed.recurrence) setRecurrence(parsed.recurrence.frequency);

        if (smartSettings.smartRemindersEnabled) {
          const rec = SmartReminderEngine.recommendForParsed(parsed);
          setReminder(rec.suggestedOption);
        }
      }
    } else {
      setParsedTask(null);
    }
  }, [rawText, smartSettings.smartParsingEnabled, smartSettings.smartRemindersEnabled]);

  // Voice Recognition Handler with Android Runtime Permission Check
  const startVoiceInput = async () => {
    safeHaptics.impact(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Check microphone permission state
    let permStatus = await VoiceService.checkPermission();

    // 2. Request permission if not yet granted
    if (permStatus !== 'granted') {
      permStatus = await VoiceService.requestPermission();
    }

    // 3. Handle Permission Blocked (Never Ask Again)
    if (permStatus === 'blocked') {
      Alert.alert(
        'Microphone Access Needed',
        'Microphone access is disabled for Taskora. You can enable it in system settings to capture tasks using your voice.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => VoiceService.openSettings() },
        ]
      );
      return;
    }

    // 4. Handle Permission Denied (First time or Cancelled)
    if (permStatus === 'denied') {
      Alert.alert(
        'Microphone Access Needed',
        'Taskora needs microphone access to create tasks using your voice.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Try Again', onPress: () => startVoiceInput() },
        ]
      );
      return;
    }

    // 5. Permission is GRANTED -> Start Voice Input
    setIsListening(true);
    setVoiceSpokenText('');

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600 }),
        withTiming(0.95, { duration: 600 })
      ),
      -1,
      true
    );

    VoiceService.setAudioLevelCallback((level: number) => {
      if (level > 10) {
        const targetScale = 1.0 + Math.min(0.4, (level / 100) * 0.4);
        pulseScale.value = withSpring(targetScale, { damping: 10, stiffness: 200 });
      }
    });

    await VoiceService.startListening(
      (result: VoiceResult) => {
        setVoiceSpokenText(result.text);
        if (result.isFinal && result.text.trim()) {
          setRawText(result.text.trim());
          setIsListening(false);
          VoiceService.stopListening();
          safeHaptics.notification(Haptics.NotificationFeedbackType.Success);
        }
      },
      (error: string) => {
        console.warn('Voice recognition notice:', error);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const finishVoiceInput = () => {
    if (voiceSpokenText.trim()) {
      setRawText(voiceSpokenText.trim());
    }
    VoiceService.stopListening();
    setIsListening(false);
    safeHaptics.notification(Haptics.NotificationFeedbackType.Success);
  };

  const cancelVoiceInput = () => {
    VoiceService.stopListening();
    setIsListening(false);
    safeHaptics.impact(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    const title = (parsedTask && smartSettings.smartParsingEnabled ? parsedTask.title : rawText.trim()) || rawText.trim();
    if (!title) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // If user changed category from default, learn preference
      if (parsedTask && parsedTask.category && category !== parsedTask.category) {
        CategoryEngine.learnCorrection(title, category);
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      let reminderConfig: TaskReminderConfig | undefined = undefined;
      if (reminder && reminder !== 'none') {
        const dummy: any = { dueDate, dueTime, reminder, completed: false };
        const res = ReminderScheduler.resolveReminderTrigger(dummy);
        if (res) {
          reminderConfig = {
            enabled: true,
            type: 'preset',
            presetOption: reminder,
            triggerAt: res.canonicalIso,
            triggerEpochMs: res.triggerEpochMs,
            timezone,
            snoozeEnabled: true,
            alarmMode: 'both',
          };
        }
      }

      await addTask({
        title,
        notes,
        dueDate,
        dueTime,
        priority,
        category,
        estimatedDuration,
        projectId: selectedProjectIds[0],
        projectIds: selectedProjectIds,
        inbox: inboxSelected,
        tags: selectedTags,
        reminder,
        reminderConfig,
        recurrence: recurrence !== 'never' ? { frequency: recurrence } : undefined,
        subtasks,
      });

      handleClose();
    } catch (err) {
      console.error('[QuickAddModal] Error saving task:', err);
      setIsSubmitting(false);
      Alert.alert('Task Creation Error', 'Could not save task. Please try again.');
    }
  };



  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub-${Date.now()}`,
        title: subtaskInput.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setSubtaskInput('');
  };

  // Cycle handlers for interactive smart preview chips
  const cycleDate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = getTodayDateString();
    const tomorrow = getTomorrowDateString();
    if (dueDate === today) setDueDate(tomorrow);
    else if (dueDate === tomorrow) setDueDate(undefined);
    else setDueDate(today);
  };

  const cyclePriority = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const levels: PriorityLevel[] = ['none', 'low', 'medium', 'high', 'urgent'];
    const nextIdx = (levels.indexOf(priority) + 1) % levels.length;
    setPriority(levels[nextIdx]);
  };

  const cycleCategory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const names = CATEGORY_DEFINITIONS.map((c) => c.name);
    const nextIdx = (names.indexOf(category) + 1) % names.length;
    setCategory(names[nextIdx]);
  };

  const cycleDuration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options = [15, 30, 45, 60, 90, 120];
    const nextIdx = (options.indexOf(estimatedDuration) + 1) % options.length;
    setEstimatedDuration(options[nextIdx]);
  };

  const cycleReminder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: ReminderOption[] = ['none', 'at_time', '15m_before', '30m_before', '1h_before', '1d_before'];
    const nextIdx = (options.indexOf(reminder) + 1) % options.length;
    setReminder(options[nextIdx]);
  };

  const bottomInset = Math.max(insets.bottom, 16);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isFormValid = rawText.trim().length > 0;
  const currentCategoryIcon = CategoryEngine.getCategoryIcon(category);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.overlayContainer}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackdropStyle]}>
        <BlurView
          intensity={MaterialLayers.glass.blurHigh}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.25)' },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
            borderColor: isDark ? MaterialLayers.glass.borderDark : MaterialLayers.glass.borderLight,
            paddingBottom: bottomInset,
          },
          Shadows.floating,
          animatedSheetStyle,
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Quick Task</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textTertiary }]}>
              Natural language & voice capture
            </Text>
          </View>
          <AnimatedPressable
            onPress={handleClose}
            profile="smallControl"
            style={[styles.closeButton, { backgroundColor: colors.secondaryBackground }]}
          >
            <X size={18} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main Integrated Title Input Surface + Mic Button */}
          <View
            style={[
              styles.inputSurface,
              {
                backgroundColor: isInputFocused
                  ? isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#FFFFFF'
                  : colors.secondaryBackground,
                borderColor: isInputFocused
                  ? colors.accent
                    ? isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)'
                    : 'transparent'
                  : 'transparent',
              },
            ]}
          >
            <TextInput
              autoFocus
              value={rawText}
              onChangeText={setRawText}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder="What to do? (e.g. Finish Python assignment tomorrow at 7 PM)"
              placeholderTextColor={colors.textTertiary}
              style={[styles.titleInput, { color: colors.textPrimary }]}
              multiline
            />

            {smartSettings.voiceTasksEnabled && (
              <AnimatedPressable
                profile="smallControl"
                onPress={startVoiceInput}
                style={[styles.micBtn, { backgroundColor: colors.accent + '20' }]}
              >
                <Mic size={18} color={colors.accent} />
              </AnimatedPressable>
            )}
          </View>

          {/* Smart Interactive Preview Card */}
          {smartSettings.smartParsingEnabled && parsedTask && rawText.trim().length > 2 && (
            <Animated.View entering={FadeInDown.duration(200)} style={[styles.smartCard, { backgroundColor: colors.secondaryBackground }]}>
              <View style={styles.smartHeaderRow}>
                <Sparkles size={14} color={colors.accent} style={{ marginRight: 5 }} />
                <Text style={[styles.smartHeading, { color: colors.accent }]}>Smart Detection Preview</Text>
                <Text style={[styles.confidenceText, { color: colors.textTertiary }]}>
                  {Math.round(parsedTask.confidence.overall * 100)}% match
                </Text>
              </View>

              <Text style={[styles.smartTitleText, { color: colors.textPrimary }]}>
                {parsedTask.title || rawText}
              </Text>

              <View style={styles.smartChipsWrap}>
                {/* Date Chip */}
                <AnimatedPressable profile="smallControl" onPress={cycleDate} style={[styles.smartChip, { backgroundColor: colors.elevatedCard }]}>
                  <Calendar size={13} color={dueDate ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
                  <Text style={[styles.smartChipText, { color: colors.textPrimary }]}>
                    {dueDate ? dueDate : 'No Date'}
                  </Text>
                </AnimatedPressable>

                {/* Time Chip */}
                {dueTime && (
                  <View style={[styles.smartChip, { backgroundColor: colors.elevatedCard }]}>
                    <Clock size={13} color={colors.accent} style={{ marginRight: 4 }} />
                    <Text style={[styles.smartChipText, { color: colors.textPrimary }]}>
                      {formatTaskTime(dueTime, timeFormat)}
                    </Text>
                  </View>
                )}

                {/* Priority Chip */}
                <AnimatedPressable profile="smallControl" onPress={cyclePriority} style={[styles.smartChip, { backgroundColor: colors.elevatedCard }]}>
                  <Flag size={13} color={priority !== 'none' ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
                  <Text style={[styles.smartChipText, { color: colors.textPrimary, textTransform: 'capitalize' }]}>
                    {priority}
                  </Text>
                </AnimatedPressable>

                {/* Category Chip */}
                <AnimatedPressable profile="smallControl" onPress={cycleCategory} style={[styles.smartChip, { backgroundColor: colors.elevatedCard }]}>
                  <Text style={{ fontSize: 12, marginRight: 4 }}>{currentCategoryIcon}</Text>
                  <Text style={[styles.smartChipText, { color: colors.textPrimary }]}>{category}</Text>
                </AnimatedPressable>

                {/* Estimated Duration Chip */}
                <AnimatedPressable profile="smallControl" onPress={cycleDuration} style={[styles.smartChip, { backgroundColor: colors.elevatedCard }]}>
                  <Timer size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.smartChipText, { color: colors.textPrimary }]}>{estimatedDuration}m</Text>
                </AnimatedPressable>

                {/* Reminder Chip */}
                {reminder !== 'none' && (
                  <AnimatedPressable profile="smallControl" onPress={cycleReminder} style={[styles.smartChip, { backgroundColor: colors.elevatedCard }]}>
                    <Bell size={13} color={colors.warning} style={{ marginRight: 4 }} />
                    <Text style={[styles.smartChipText, { color: colors.textPrimary }]}>
                      {reminder.replace('_', ' ')}
                    </Text>
                  </AnimatedPressable>
                )}
              </View>
            </Animated.View>
          )}

          {/* Date Selector Row */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Due Date</Text>
          <View style={styles.chipsRow}>
            {[
              { label: 'Today', dateStr: getTodayDateString(), icon: Calendar },
              { label: 'Tomorrow', dateStr: getTomorrowDateString(), icon: Calendar },
              { label: 'No Date', dateStr: undefined, icon: Clock },
            ].map((item) => {
              const isSelected = dueDate === item.dateStr;
              const IconComp = item.icon;
              return (
                <AnimatedPressable
                  key={item.label}
                  profile="smallControl"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDueDate(item.dateStr);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.secondaryBackground,
                    },
                  ]}
                >
                  <IconComp
                    size={14}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Priority Row */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Priority</Text>
          <View style={styles.chipsRow}>
            {(['none', 'low', 'medium', 'high', 'urgent'] as PriorityLevel[]).map((p) => {
              const isSelected = priority === p;
              return (
                <AnimatedPressable
                  key={p}
                  profile="smallControl"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPriority(p);
                  }}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.secondaryBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        textTransform: 'capitalize',
                      },
                    ]}
                  >
                    {p}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Task Destination: Inbox & Projects */}
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Destinations</Text>
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

          {/* Toggle Advanced */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => setShowAdvanced(!showAdvanced)}
            style={styles.advancedToggle}
          >
            <Text style={[styles.advancedText, { color: colors.accent }]}>
              {showAdvanced ? 'Hide Notes & Subtasks' : '+ Add Notes & Subtasks'}
            </Text>
          </AnimatedPressable>

          {showAdvanced && (
            <View style={styles.advancedSection}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes..."
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.notesInput,
                  { color: colors.textPrimary, backgroundColor: colors.secondaryBackground },
                ]}
                multiline
              />

              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Subtasks</Text>
              <View style={styles.subtaskInputRow}>
                <TextInput
                  value={subtaskInput}
                  onChangeText={setSubtaskInput}
                  placeholder="Add subtask..."
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.subtaskInput,
                    { color: colors.textPrimary, backgroundColor: colors.secondaryBackground },
                  ]}
                  onSubmitEditing={handleAddSubtask}
                />
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleAddSubtask}
                  style={[styles.addSubtaskBtn, { backgroundColor: colors.accent }]}
                >
                  <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                </AnimatedPressable>
              </View>

              {subtasks.map((sub) => (
                <View key={sub.id} style={styles.subtaskItem}>
                  <Check size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.subtaskTitle, { color: colors.textPrimary }]}>{sub.title}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Create Task Button CTA */}
        <View style={styles.footer}>
          <AnimatedPressable
            profile="primaryButton"
            onPress={handleSave}
            disabled={!isFormValid || isSubmitting}
            style={[
              styles.saveButton,
              { backgroundColor: colors.accent, opacity: isFormValid && !isSubmitting ? 1 : 0.4 },
            ]}
          >
            <Text style={styles.saveText}>{isSubmitting ? 'Creating...' : 'Create Task'}</Text>
          </AnimatedPressable>
        </View>

      </Animated.View>

      {/* Voice Listening Modal */}
      <Modal visible={isListening} transparent animationType="fade">
        <View style={styles.voiceOverlay}>
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.voiceCard, { backgroundColor: colors.elevatedCard }, Shadows.floating]}>
            <Animated.View style={[styles.voiceMicCircle, { backgroundColor: colors.accent }, animatedPulseStyle]}>
              <Mic size={36} color="#FFFFFF" />
            </Animated.View>
            <Text style={[styles.voiceTitle, { color: colors.textPrimary }]}>Listening...</Text>
            <Text style={[styles.voiceSub, { color: colors.textSecondary }]}>
              {voiceSpokenText || 'Say your task (e.g. "Buy groceries tomorrow at 6 PM")'}
            </Text>

            {/* Action buttons */}
            <View style={styles.voiceActionsRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={cancelVoiceInput}
                style={[styles.voiceCancelBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.voiceCancelText, { color: colors.textPrimary }]}>Cancel</Text>
              </AnimatedPressable>

              <AnimatedPressable
                profile="smallControl"
                onPress={finishVoiceInput}
                style={[styles.voiceDoneBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.voiceDoneText}>Done Speaking</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderWidth: 1,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...TypographyScale.caption1,
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  inputSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  titleInput: {
    ...TypographyScale.body,
    flex: 1,
    minHeight: 46,
    paddingVertical: Spacing.sm,
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
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  smartCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  smartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  smartHeading: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    flex: 1,
  },
  confidenceText: {
    ...TypographyScale.caption2,
  },
  smartTitleText: {
    ...TypographyScale.headline,
    marginBottom: Spacing.sm,
  },
  smartChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  smartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  smartChipText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  sectionLabel: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  priorityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  chipText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  horizontalScrollView: {
    marginBottom: Spacing.sm,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.xl,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  advancedToggle: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  advancedText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  advancedSection: {
    marginTop: Spacing.xs,
  },
  notesInput: {
    ...TypographyScale.body,
    padding: Spacing.md,
    borderRadius: Radii.md,
    minHeight: 60,
    marginBottom: Spacing.sm,
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
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
  addSubtaskBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  subtaskTitle: {
    ...TypographyScale.body,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  voiceOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.xl,
  },
  voiceCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  voiceMicCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  voiceTitle: {
    ...TypographyScale.title2,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  voiceSub: {
    ...TypographyScale.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  voiceCancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.pill,
  },
  voiceCancelText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  voiceActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voiceDoneBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.pill,
  },
  voiceDoneText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
