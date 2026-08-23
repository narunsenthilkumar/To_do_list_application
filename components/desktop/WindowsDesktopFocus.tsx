import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Target,
  Flame,
  CheckCircle2,
  Sparkles,
  Clock,
  Settings,
  ChevronDown,
} from 'lucide-react-native';
import { useTaskora, useTheme, useFocusTimer } from '../../store/useTaskora';
import { FocusModeType } from '../../models/focus';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';

interface WindowsDesktopFocusProps {
  onOpenScreenSaver: () => void;
}

export const WindowsDesktopFocus: React.FC<WindowsDesktopFocusProps> = ({
  onOpenScreenSaver,
}) => {
  const { colors, isDark } = useTheme();
  const { tasks } = useTaskora();
  const {
    mode,
    isActive,
    secondsRemaining,
    selectedTaskId,
    completedSessionsToday,
    streakStats,
    setSelectedTaskId,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
  } = useFocusTimer();

  const [taskPickerOpen, setTaskPickerOpen] = useState(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const activeTasks = tasks.filter((t) => !t.completed);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'work':
        return 'Deep Focus Session';
      case 'shortBreak':
        return 'Short Rest Break';
      case 'longBreak':
        return 'Long Rest Break';
      default:
        return 'Focus Session';
    }
  };

  const modeColor = mode === 'work' ? colors.accent : '#34C759';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Top Banner Stats */}
      <View
        style={[
          styles.statsCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <View style={styles.statCol}>
          <View style={styles.statIconVal}>
            <Target size={18} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{completedSessionsToday}</Text>
          </View>
          <Text style={[styles.statLbl, { color: colors.textTertiary }]}>Completed Today</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.statCol}>
          <View style={styles.statIconVal}>
            <Flame size={18} color="#FF9500" style={{ marginRight: 6 }} />
            <Text style={[styles.statVal, { color: '#FF9500' }]}>{streakStats.currentStreak}</Text>
          </View>
          <Text style={[styles.statLbl, { color: colors.textTertiary }]}>Day Streak</Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

        <View style={styles.statCol}>
          <View style={styles.statIconVal}>
            <Clock size={18} color="#5856D6" style={{ marginRight: 6 }} />
            <Text style={[styles.statVal, { color: '#5856D6' }]}>{completedSessionsToday * 25}m</Text>
          </View>
          <Text style={[styles.statLbl, { color: colors.textTertiary }]}>Total Focus Time</Text>
        </View>
      </View>

      {/* Main Focus Center Card */}
      <View
        style={[
          styles.focusCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.card,
        ]}
      >
        {/* Mode Title Pill */}
        <View style={[styles.modePill, { backgroundColor: modeColor + '15', borderColor: modeColor + '35' }]}>
          <Text style={[styles.modePillText, { color: modeColor }]}>{getModeTitle().toUpperCase()}</Text>
        </View>

        {/* Big Countdown Display with Glass Glow */}
        <View style={styles.timerCircleWrapper}>
          <View
            style={[
              styles.timerRingGlow,
              {
                borderColor: modeColor + (isActive ? '50' : '20'),
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.02)',
              },
            ]}
          >
            <Text style={[styles.timerDigits, { color: colors.textPrimary }]}>
              {formatTime(secondsRemaining)}
            </Text>
          </View>
        </View>

        {/* Task Selector Dropdown */}
        <View style={styles.taskPickerContainer}>
          <Text style={[styles.taskPickerLabel, { color: colors.textTertiary }]}>FOCUSING ON</Text>
          <Pressable
            style={[
              styles.taskPickerBtn,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              },
            ]}
            onPress={() => setTaskPickerOpen(!taskPickerOpen)}
          >
            <Text style={[styles.taskPickerBtnText, { color: selectedTask ? colors.textPrimary : colors.textTertiary }]} numberOfLines={1}>
              {selectedTask ? selectedTask.title : 'Select a task to focus on...'}
            </Text>
            <ChevronDown size={16} color={colors.textTertiary} />
          </Pressable>

          {taskPickerOpen && (
            <View
              style={[
                styles.taskDropdown,
                {
                  backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                },
                Shadows.floating,
              ]}
            >
              <Pressable
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedTaskId(null);
                  setTaskPickerOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: colors.textTertiary }]}>No specific task (General focus)</Text>
              </Pressable>
              {activeTasks.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedTaskId(t.id);
                    setTaskPickerOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Timer Action Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            style={({ hovered }: any) => [
              styles.secondaryControlBtn,
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            ]}
            onPress={resetTimer}
          >
            <RotateCcw size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={({ hovered }: any) => [
              styles.primaryPlayBtn,
              { backgroundColor: modeColor },
              hovered && { opacity: 0.9 },
              Shadows.floating,
            ]}
            onPress={() => {
              if (isActive) {
                pauseTimer(selectedTask?.title);
              } else {
                startTimer(selectedTask?.title);
              }
            }}
          >
            {isActive ? (
              <Pause size={24} color="#FFFFFF" />
            ) : (
              <Play size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
            )}
          </Pressable>

          <Pressable
            style={({ hovered }: any) => [
              styles.secondaryControlBtn,
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            ]}
            onPress={skipSession}
          >
            <SkipForward size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Ambient Screen Saver Trigger */}
        <Pressable
          style={({ hovered }: any) => [
            styles.screensaverLink,
            hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
          ]}
          onPress={onOpenScreenSaver}
        >
          <Sparkles size={14} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={[styles.screensaverLinkText, { color: colors.accent }]}>
            Enter Ambient Screen Saver Mode
          </Text>
        </Pressable>
      </View>
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
    alignItems: 'center',
  },
  statsCard: {
    width: '100%',
    maxWidth: 680,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  statCol: {
    alignItems: 'center',
  },
  statIconVal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statVal: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  statLbl: {
    ...TypographyScale.caption2,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  focusCard: {
    width: '100%',
    maxWidth: 680,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  modePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  modePillText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerCircleWrapper: {
    marginBottom: Spacing.xl,
  },
  timerRingGlow: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDigits: {
    fontSize: 64,
    fontWeight: '200',
    letterSpacing: -1,
  },
  taskPickerContainer: {
    width: '100%',
    maxWidth: 420,
    marginBottom: Spacing.xl,
    position: 'relative',
    zIndex: 10,
  },
  taskPickerLabel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  taskPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  taskPickerBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '500',
    flex: 1,
  },
  taskDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxHeight: 180,
    overflow: 'scroll' as any,
    zIndex: 99,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    cursor: 'pointer' as any,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownItemText: {
    ...TypographyScale.footnote,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  secondaryControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  primaryPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  screensaverLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  screensaverLinkText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
});
