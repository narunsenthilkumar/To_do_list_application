import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2, Target, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { useTaskora, useTheme, useFocusTimer, useSmartProductivity } from '../../store/useTaskora';
import { useResponsive, MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';

export default function FocusScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tasks, toggleTaskCompletion } = useTaskora();
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

            <View style={[styles.modeBadge, { backgroundColor: modeColor + '18' }]}>
              <Target size={14} color={modeColor} style={{ marginRight: 4 }} />
              <Text style={[styles.modeBadgeText, { color: modeColor }]}>{getModeTitle()}</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Task Linking Card */}
            <ElevatedCard onPress={() => setTaskPickerVisible(true)} style={styles.taskCard}>
              <Text style={[styles.taskCardLabel, { color: colors.textTertiary }]}>Focusing On:</Text>
              <View style={styles.taskCardRow}>
                <Text style={[styles.taskCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {selectedTask ? selectedTask.title : 'Tap to select a task...'}
                </Text>
                {selectedTask && (
                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => toggleTaskCompletion(selectedTask.id)}
                    style={styles.checkBtn}
                  >
                    <CheckCircle2 size={22} color={selectedTask.completed ? colors.success : colors.textTertiary} />
                  </AnimatedPressable>
                )}
              </View>
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
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                onPress={isActive ? pauseTimer : startTimer}
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
      <Modal visible={taskPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.elevatedCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Task for Focus</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {activeTasks.map((t) => (
                <AnimatedPressable
                  key={t.id}
                  profile="card"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  modeBadgeText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  taskCard: {
    width: '100%',
    marginVertical: Spacing.md,
  },
  recommendCard: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recommendLabel: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  recommendTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  recommendSub: {
    ...TypographyScale.footnote,
    marginTop: 2,
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
    ...TypographyScale.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  taskCardLabel: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  taskCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  taskCardTitle: {
    ...TypographyScale.headline,
    flex: 1,
    marginRight: Spacing.sm,
  },
  checkBtn: {
    padding: Spacing.xs,
  },
  timerCircleContainer: {
    marginVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRingOuter: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRingInner: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTimeText: {
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerStatusText: {
    ...TypographyScale.callout,
    fontWeight: '600',
    marginTop: 4,
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
    gap: Spacing.md,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    ...TypographyScale.title3,
  },
  pickerTaskRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.xs,
  },
  pickerTaskTitle: {
    ...TypographyScale.body,
    fontWeight: '500',
  },
  closeModalBtn: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  closeModalText: {
    ...TypographyScale.headline,
  },
});


