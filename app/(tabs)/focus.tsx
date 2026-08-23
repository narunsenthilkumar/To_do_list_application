import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Target,
  Sparkles,
  Edit3,
  Trash2,
  X,
  Clock,
  Globe,
  Calendar,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { ClockScreensaver } from '../../components/clock/ClockScreensaver';
import { useTaskora, useTheme, useFocusTimer, useSmartProductivity } from '../../store/useTaskora';
import { useResponsive, MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { haptics } from '../../services/haptics';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';

export default function FocusScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, toggleTaskCompletion, deleteTask, updateTask } = useTaskora();
  const { recommendedFocusTask } = useSmartProductivity();
  const {
    mode,
    isActive,
    secondsRemaining,
    selectedTaskId,
    completedSessionsToday,
    setSelectedTaskId,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
  } = useFocusTimer();

  const [taskPickerVisible, setTaskPickerVisible] = useState(false);
  const [screensaverVisible, setScreensaverVisible] = useState(false);
  const [deferModalVisible, setDeferModalVisible] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const activeTasks = tasks.filter((t) => !t.completed);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1.0, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1.0, { duration: 300 });
    }
  }, [isActive]);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'work':
        return 'Deep Focus';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work':
        return colors.accent;
      case 'shortBreak':
        return colors.success;
      case 'longBreak':
        return colors.warning;
    }
  };

  const handleDeleteFocusedTask = () => {
    if (!selectedTask) return;
    haptics.warning();
    Alert.alert('Delete Task', `Are you sure you want to delete "${selectedTask.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(selectedTask.id);
          setSelectedTaskId(null);
        },
      },
    ]);
  };

  const handleDeferSelect = (type: 'later_today' | 'tomorrow' | 'later_this_week' | 'next_week') => {
    if (!selectedTask) return;
    haptics.medium();
    const today = getTodayDateString();
    if (type === 'later_today') {
      const now = new Date();
      now.setHours(now.getHours() + 3);
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      updateTask(selectedTask.id, { dueDate: today, dueTime: `${h}:${m}` });
    } else if (type === 'tomorrow') {
      updateTask(selectedTask.id, { dueDate: getTomorrowDateString() });
    } else if (type === 'later_this_week') {
      const later = new Date();
      later.setDate(later.getDate() + 3);
      const y = later.getFullYear();
      const mo = String(later.getMonth() + 1).padStart(2, '0');
      const d = String(later.getDate()).padStart(2, '0');
      updateTask(selectedTask.id, { dueDate: `${y}-${mo}-${d}` });
    } else if (type === 'next_week') {
      const nextW = new Date();
      nextW.setDate(nextW.getDate() + 7);
      const y = nextW.getFullYear();
      const mo = String(nextW.getMonth() + 1).padStart(2, '0');
      const d = String(nextW.getDate()).padStart(2, '0');
      updateTask(selectedTask.id, { dueDate: `${y}-${mo}-${d}` });
    }
    setDeferModalVisible(false);
  };

  const modeColor = getModeColor();
  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface style={{ flex: 1 }} useAmbientBg>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Focus Mode</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {completedSessionsToday} Pomodoro sessions today
              </Text>
            </View>

            <View style={styles.headerRightRow}>
              {/* Screensaver / Ambient Clock CTA */}
              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  haptics.light();
                  setScreensaverVisible(true);
                }}
                style={[styles.screensaverBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Clock size={16} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.screensaverBtnText, { color: colors.textPrimary }]}>Clock</Text>
              </AnimatedPressable>

              <View style={[styles.modeBadge, { backgroundColor: modeColor + '18' }]}>
                <Target size={14} color={modeColor} style={{ marginRight: 4 }} />
                <Text style={[styles.modeBadgeText, { color: modeColor }]}>{getModeTitle()}</Text>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Task Linking Card (Requirement 12) */}
            <ElevatedCard style={styles.taskCard}>
              <View style={styles.taskCardHeader}>
                <Text style={[styles.taskCardLabel, { color: colors.textTertiary }]}>Focusing On:</Text>
                {selectedTask && (
                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => {
                      haptics.light();
                      setSelectedTaskId(null);
                    }}
                  >
                    <X size={16} color={colors.textTertiary} />
                  </AnimatedPressable>
                )}
              </View>

              <AnimatedPressable
                profile="card"
                onPress={() => setTaskPickerVisible(true)}
                style={styles.taskCardRow}
              >
                <Text style={[styles.taskCardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {selectedTask ? selectedTask.title : 'Tap to select a task for this session...'}
                </Text>
              </AnimatedPressable>

              {/* Requirement 12 & 2: In-focus Task Actions: Edit, Complete, Defer, Delete */}
              {selectedTask && (
                <View style={styles.taskActionsRow}>
                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => router.push(`/task/${selectedTask.id}`)}
                    style={[styles.taskActionBtn, { backgroundColor: colors.secondaryBackground }]}
                  >
                    <Edit3 size={15} color={colors.textPrimary} style={{ marginRight: 5 }} />
                    <Text style={[styles.taskActionBtnText, { color: colors.textPrimary }]}>Edit</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => toggleTaskCompletion(selectedTask.id)}
                    style={[
                      styles.taskActionBtn,
                      { backgroundColor: selectedTask.completed ? colors.success + '20' : colors.accent + '20' },
                    ]}
                  >
                    <CheckCircle2
                      size={15}
                      color={selectedTask.completed ? colors.success : colors.accent}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.taskActionBtnText,
                        { color: selectedTask.completed ? colors.success : colors.accent },
                      ]}
                    >
                      {selectedTask.completed ? 'Done' : 'Complete'}
                    </Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => {
                      haptics.selection();
                      setDeferModalVisible(true);
                    }}
                    style={[styles.taskActionBtn, { backgroundColor: colors.warning + '18' }]}
                  >
                    <Calendar size={15} color={colors.warning} style={{ marginRight: 5 }} />
                    <Text style={[styles.taskActionBtnText, { color: colors.warning }]}>Defer</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    profile="destructiveAction"
                    onPress={handleDeleteFocusedTask}
                    style={[styles.taskActionBtn, { backgroundColor: colors.error + '15' }]}
                  >
                    <Trash2 size={15} color={colors.error} style={{ marginRight: 5 }} />
                    <Text style={[styles.taskActionBtnText, { color: colors.error }]}>Delete</Text>
                  </AnimatedPressable>
                </View>
              )}
            </ElevatedCard>

            {/* Smart Recommended Focus Banner */}
            {!selectedTaskId && recommendedFocusTask && (
              <ElevatedCard style={styles.recommendCard}>
                <View style={styles.recommendHeader}>
                  <Sparkles size={14} color={colors.accent} style={{ marginRight: 5 }} />
                  <Text style={[styles.recommendLabel, { color: colors.accent }]}>Smart Recommendation</Text>
                </View>
                <Text style={[styles.recommendTitle, { color: colors.textPrimary }]}>
                  {recommendedFocusTask.title}
                </Text>
                <Text style={[styles.recommendSub, { color: colors.textSecondary }]}>
                  {recommendedFocusTask.priority !== 'none' ? `Priority: ${recommendedFocusTask.priority} · ` : ''}
                  Estimated: {recommendedFocusTask.estimatedDuration || 30}m
                </Text>
                <View style={styles.recommendBtnRow}>
                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => {
                      haptics.medium();
                      setSelectedTaskId(recommendedFocusTask.id);
                    }}
                    style={[styles.recommendBtn, { backgroundColor: colors.accent }]}
                  >
                    <Text style={styles.recommendBtnText}>Focus This Task</Text>
                  </AnimatedPressable>
                </View>
              </ElevatedCard>
            )}

            {/* Large Timer Visual Circle with Pulsing Ambient Ring */}
            <View style={styles.timerCircleContainer}>
              <Animated.View
                style={[
                  styles.timerRingOuter,
                  {
                    borderColor: modeColor + '30',
                    backgroundColor: colors.elevatedCard,
                  },
                  Shadows.card,
                  animatedPulseStyle,
                ]}
              >
                <View style={[styles.timerRingInner, { borderColor: modeColor }]}>
                  <Text style={[styles.timerTimeText, { color: colors.textPrimary }]}>
                    {formatTime(secondsRemaining)}
                  </Text>
                  <Text style={[styles.timerStatusText, { color: modeColor }]}>
                    {isActive ? 'Session Active' : 'Paused'}
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* Controls Row */}
            <View style={styles.controlsRow}>
              <AnimatedPressable
                onPress={resetTimer}
                profile="smallControl"
                style={[styles.controlBtnSecondary, { backgroundColor: colors.secondaryBackground }]}
              >
                <RotateCcw size={22} color={colors.textPrimary} />
              </AnimatedPressable>

              <AnimatedPressable
                onPress={() => (isActive ? pauseTimer(selectedTask?.title) : startTimer(selectedTask?.title))}
                profile="floatingButton"
                style={[
                  styles.playBtn,
                  { backgroundColor: modeColor },
                  Shadows.floating,
                ]}
              >
                {isActive ? (
                  <Pause size={32} color="#FFFFFF" />
                ) : (
                  <Play size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
                )}
              </AnimatedPressable>


              <AnimatedPressable
                onPress={skipSession}
                profile="smallControl"
                style={[styles.controlBtnSecondary, { backgroundColor: colors.secondaryBackground }]}
              >
                <SkipForward size={22} color={colors.textPrimary} />
              </AnimatedPressable>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Task Selection Modal */}
      <Modal visible={taskPickerVisible} animationType="slide" transparent onRequestClose={() => setTaskPickerVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.elevatedCard }, Shadows.floating]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Task for Focus</Text>
              <AnimatedPressable profile="smallControl" onPress={() => setTaskPickerVisible(false)}>
                <X size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {activeTasks.map((t) => (
                <AnimatedPressable
                  key={t.id}
                  profile="card"
                  onPress={() => {
                    haptics.selection();
                    setSelectedTaskId(t.id);
                    setTaskPickerVisible(false);
                  }}
                  style={[
                    styles.pickerTaskRow,
                    {
                      backgroundColor: selectedTaskId === t.id ? colors.accent + '15' : colors.secondaryBackground,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerTaskTitle,
                      { color: selectedTaskId === t.id ? colors.accent : colors.textPrimary },
                    ]}
                  >
                    {t.title}
                  </Text>
                </AnimatedPressable>
              ))}
              {activeTasks.length === 0 && (
                <Text style={[styles.noTasksPrompt, { color: colors.textTertiary }]}>
                  No active tasks available to select.
                </Text>
              )}
            </ScrollView>
            <AnimatedPressable
              profile="primaryButton"
              onPress={() => setTaskPickerVisible(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <Text style={[styles.closeModalText, { color: colors.textPrimary }]}>Close</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Compact Apple-style Defer Modal */}
      <Modal visible={deferModalVisible} animationType="fade" transparent onRequestClose={() => setDeferModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.elevatedCard }, Shadows.floating]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Defer Focus Task</Text>
              <AnimatedPressable profile="smallControl" onPress={() => setDeferModalVisible(false)}>
                <X size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
            <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
              <AnimatedPressable
                profile="card"
                onPress={() => handleDeferSelect('later_today')}
                style={[styles.pickerTaskRow, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.pickerTaskTitle, { color: colors.textPrimary }]}>Later Today (+3 Hours)</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="card"
                onPress={() => handleDeferSelect('tomorrow')}
                style={[styles.pickerTaskRow, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.pickerTaskTitle, { color: colors.textPrimary }]}>Tomorrow</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="card"
                onPress={() => handleDeferSelect('later_this_week')}
                style={[styles.pickerTaskRow, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.pickerTaskTitle, { color: colors.textPrimary }]}>Later This Week (+3 Days)</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="card"
                onPress={() => handleDeferSelect('next_week')}
                style={[styles.pickerTaskRow, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.pickerTaskTitle, { color: colors.textPrimary }]}>Next Week (+7 Days)</Text>
              </AnimatedPressable>
              <AnimatedPressable
                profile="card"
                onPress={() => {
                  setDeferModalVisible(false);
                  if (selectedTask) router.push(`/task/${selectedTask.id}`);
                }}
                style={[styles.pickerTaskRow, { backgroundColor: colors.accent + '15' }]}
              >
                <Text style={[styles.pickerTaskTitle, { color: colors.accent }]}>Custom Date & Time...</Text>
              </AnimatedPressable>
            </View>
            <AnimatedPressable
              profile="primaryButton"
              onPress={() => setDeferModalVisible(false)}
              style={[styles.closeModalBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <Text style={[styles.closeModalText, { color: colors.textPrimary }]}>Cancel</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Clock Screensaver Modal (Requirement 31 & 32) */}
      <ClockScreensaver
        visible={screensaverVisible}
        onClose={() => setScreensaverVisible(false)}
        timerMode={getModeTitle()}
        timeLeftFormatted={formatTime(secondsRemaining)}
        isTimerRunning={isActive}
        onToggleTimer={isActive ? pauseTimer : startTimer}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  screensaverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  screensaverBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  title: {
    ...TypographyScale.largeTitle,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radii.pill,
  },
  modeBadgeText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  taskCard: {
    width: '100%',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  taskCardLabel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCardRow: {
    paddingVertical: Spacing.xs,
  },
  taskCardTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  taskActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  taskActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  taskActionBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  recommendCard: {
    width: '100%',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  recommendLabel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recommendTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendSub: {
    ...TypographyScale.footnote,
    marginBottom: Spacing.sm,
  },
  recommendBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  recommendBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  recommendBtnText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timerCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  timerRingOuter: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRingInner: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTimeText: {
    ...TypographyScale.largeTitle,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
  },
  timerStatusText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  controlBtnSecondary: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  pickerTaskRow: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.xs,
  },
  pickerTaskTitle: {
    ...TypographyScale.body,
    fontWeight: '600',
  },
  noTasksPrompt: {
    ...TypographyScale.footnote,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  closeModalBtn: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  closeModalText: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
});
