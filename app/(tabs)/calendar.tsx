import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { SwipeableTaskRow } from '../../components/tasks/SwipeableTaskRow';
import { TaskActionSheet } from '../../components/tasks/TaskActionSheet';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { AnimatedDateSelection, DateCellLayout } from '../../components/calendar/AnimatedDateSelection';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task } from '../../models/task';
import { useResponsive, MAX_CONTENT_WIDTH, MAX_CALENDAR_WIDTH, MAX_SEGMENTED_CONTROL_WIDTH } from '../../theme/responsive';
import { getTodayDateString } from '../../services/storage/repository';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';
import { MotionDurations } from '../../theme/animations';

type ViewMode = 'month' | 'week' | 'agenda';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_CELL_HEIGHT = 44;
const WEEK_CELL_HEIGHT = 60;

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useResponsive();
  const {
    tasks,
    projects,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    updateTask,
  } = useTaskora();

  const [actionSheetTask, setActionSheetTask] = useState<Task | null>(null);
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentYearMonth, setCurrentYearMonth] = useState<Date>(new Date());
  const [sameDateTapCount, setSameDateTapCount] = useState<number>(0);

  // Container widths for responsive grid calculations
  const [monthContainerWidth, setMonthContainerWidth] = useState<number>(0);
  const [weekContainerWidth, setWeekContainerWidth] = useState<number>(0);

  // Measured cell layouts for smooth continuous flowing pill
  const [monthCellLayouts, setMonthCellLayouts] = useState<Record<string, DateCellLayout>>({});
  const [weekCellLayouts, setWeekCellLayouts] = useState<Record<string, DateCellLayout>>({});

  // View switch and month slide animated shared values
  const viewModeOpacity = useSharedValue(1);
  const monthSlideX = useSharedValue(0);
  const monthOpacity = useSharedValue(1);

  const handleModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    viewModeOpacity.value = 0.5;
    setViewMode(mode);
    viewModeOpacity.value = withTiming(1, { duration: MotionDurations.spatial / 2 });
  };

  const animatedViewStyle = useAnimatedStyle(() => ({
    opacity: viewModeOpacity.value,
  }));

  const animatedMonthGridStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: monthSlideX.value }],
    opacity: monthOpacity.value,
  }));

  // Generate days for Month grid
  const getDaysInMonth = () => {
    const year = currentYearMonth.getFullYear();
    const month = currentYearMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = [];
    // 1. Leading empty days for starting weekday column
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // 2. Actual month days
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      days.push(`${year}-${monthStr}-${dayStr}`);
    }
    // 3. Trailing empty days to complete the 7-column grid rows
    const remainder = days.length % 7;
    if (remainder !== 0) {
      const trailingCount = 7 - remainder;
      for (let i = 0; i < trailingCount; i++) {
        days.push(null);
      }
    }
    return days;
  };

  // Generate days for Week strip
  const getWeekDays = () => {
    const parts = selectedDate.split('-').map(Number);
    const targetDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    const dayOfWeek = targetDate.getDay();
    const startOfWeek = new Date(targetDate);
    startOfWeek.setDate(targetDate.getDate() - dayOfWeek);

    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      weekDays.push(`${y}-${m}-${dayStr}`);
    }
    return weekDays;
  };

  const daysGrid = getDaysInMonth();
  const weekDays = getWeekDays();

  // Chunk daysGrid into structured 7-column rows
  const chunkedDaysGrid: (string | null)[][] = [];
  for (let i = 0; i < daysGrid.length; i += 7) {
    chunkedDaysGrid.push(daysGrid.slice(i, i + 7));
  }

  // Recalculate month cell coordinates whenever container width or month changes
  useEffect(() => {
    if (monthContainerWidth > 0) {
      const colWidth = monthContainerWidth / 7;
      const newLayouts: Record<string, DateCellLayout> = {};
      daysGrid.forEach((dateStr, index) => {
        if (!dateStr) return;
        const col = index % 7;
        const row = Math.floor(index / 7);
        newLayouts[dateStr] = {
          x: col * colWidth,
          y: row * MONTH_CELL_HEIGHT,
          width: colWidth,
          height: MONTH_CELL_HEIGHT,
        };
      });
      setMonthCellLayouts(newLayouts);
    }
  }, [currentYearMonth, monthContainerWidth]);

  // Recalculate week cell coordinates whenever container width or week days change
  useEffect(() => {
    if (weekContainerWidth > 0) {
      const colWidth = weekContainerWidth / 7;
      const newLayouts: Record<string, DateCellLayout> = {};
      weekDays.forEach((dateStr, index) => {
        newLayouts[dateStr] = {
          x: index * colWidth,
          y: 0,
          width: colWidth,
          height: WEEK_CELL_HEIGHT,
        };
      });
      setWeekCellLayouts(newLayouts);
    }
  }, [selectedDate, weekContainerWidth]);

  // Tasks mapped by date for dot indicators
  const tasksByDateMap: Record<string, number> = {};
  tasks.forEach((t) => {
    if (t.dueDate) {
      tasksByDateMap[t.dueDate] = (tasksByDateMap[t.dueDate] || 0) + 1;
    }
  });

  const selectedDateTasks = tasks.filter((t) => t.dueDate === selectedDate);

  // Month navigation with directional spatial slide
  const prevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    monthSlideX.value = -35;
    monthOpacity.value = 0.5;
    setCurrentYearMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    monthSlideX.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.8 });
    monthOpacity.value = withTiming(1, { duration: 250 });
  };

  const nextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    monthSlideX.value = 35;
    monthOpacity.value = 0.5;
    setCurrentYearMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    monthSlideX.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.8 });
    monthOpacity.value = withTiming(1, { duration: 250 });
  };

  // Week navigation
  const prevWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] - 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const newDateStr = `${y}-${m}-${dayStr}`;
    setCurrentYearMonth(new Date(y, d.getMonth(), 1));
    setSelectedDate(newDateStr);
  };

  const nextWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const newDateStr = `${y}-${m}-${dayStr}`;
    setCurrentYearMonth(new Date(y, d.getMonth(), 1));
    setSelectedDate(newDateStr);
  };

  const jumpToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const today = new Date();
    if (today.getFullYear() !== currentYearMonth.getFullYear() || today.getMonth() !== currentYearMonth.getMonth()) {
      setCurrentYearMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
    if (selectedDate === todayStr) {
      setSameDateTapCount((c) => c + 1);
    } else {
      setSelectedDate(todayStr);
    }
  };

  const selectDate = (dateStr: string) => {
    if (dateStr === selectedDate) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSameDateTapCount((c) => c + 1);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(dateStr);
  };

  const getProjectForTask = (projId?: string) => {
    if (!projId) return undefined;
    return projects.find((p) => p.id === projId);
  };

  const monthYearLabel = currentYearMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const bottomInset = getBottomContentInset(insets);

  // Month View Card
  const renderMonthView = () => (
    <View
      style={[
        styles.calendarCard,
        {
          backgroundColor: colors.elevatedCard,
          borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
        },
      ]}
    >
      {/* Month Nav Controls */}
      <View style={styles.monthNavRow}>
        <AnimatedPressable profile="smallControl" onPress={prevMonth} style={styles.navBtn}>
          <ChevronLeft size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text style={[styles.monthLabelText, { color: colors.textPrimary }]}>{monthYearLabel}</Text>
        <AnimatedPressable profile="smallControl" onPress={nextMonth} style={styles.navBtn}>
          <ChevronRight size={20} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      {/* Weekday headers aligned with the 7 columns */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((day, idx) => (
          <View key={idx} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textTertiary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Date Grid with Shared Flowing Selection Pill */}
      <Animated.View
        style={[styles.daysGridContainer, animatedMonthGridStyle]}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width > 0 && Math.abs(width - monthContainerWidth) > 1) {
            setMonthContainerWidth(width);
          }
        }}
      >
        <AnimatedDateSelection
          selectedDate={selectedDate}
          cellLayouts={monthCellLayouts}
          sameDateTapCount={sameDateTapCount}
          color={colors.accent}
          borderRadius={Radii.md}
        />

        <View style={styles.daysGridWrapper}>
          {chunkedDaysGrid.map((row, rowIndex) => (
            <View key={`month-row-${rowIndex}`} style={styles.gridRow}>
              {row.map((dateStr, colIndex) => {
                if (!dateStr) {
                  return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.dayCellWrapper} />;
                }

                const dayNum = parseInt(dateStr.split('-')[2], 10);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const taskCount = tasksByDateMap[dateStr] || 0;

                const parts = dateStr.split('-').map(Number);
                const fullDate = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <View key={dateStr} style={styles.dayCellWrapper}>
                    <Pressable
                      onPress={() => selectDate(dateStr)}
                      accessibilityRole="button"
                      accessibilityLabel={fullDate}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.dayCell,
                        isToday && !isSelected && {
                          borderWidth: 1,
                          borderColor: colors.accent + '70',
                          borderRadius: Radii.md,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumberText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : isToday
                              ? colors.accent
                              : colors.textPrimary,
                            fontWeight: isSelected || isToday ? '700' : '500',
                          },
                        ]}
                      >
                        {dayNum}
                      </Text>
                      {taskCount > 0 && (
                        <View
                          style={[
                            styles.dotIndicator,
                            { backgroundColor: isSelected ? '#FFFFFF' : colors.accent },
                          ]}
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );

  // Week View Card
  const renderWeekView = () => (
    <View
      style={[
        styles.calendarCard,
        {
          backgroundColor: colors.elevatedCard,
          borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
        },
      ]}
    >
      <View style={styles.monthNavRow}>
        <AnimatedPressable profile="smallControl" onPress={prevWeek} style={styles.navBtn}>
          <ChevronLeft size={20} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text style={[styles.monthLabelText, { color: colors.textPrimary }]}>Week View</Text>
        <AnimatedPressable profile="smallControl" onPress={nextWeek} style={styles.navBtn}>
          <ChevronRight size={20} color={colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <View
        style={styles.weekStripContainer}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width > 0 && Math.abs(width - weekContainerWidth) > 1) {
            setWeekContainerWidth(width);
          }
        }}
      >
        <AnimatedDateSelection
          selectedDate={selectedDate}
          cellLayouts={weekCellLayouts}
          sameDateTapCount={sameDateTapCount}
          color={colors.accent}
          borderRadius={Radii.md}
        />

        <View style={styles.weekStripWrapper}>
          <View style={styles.weekStripRow}>
            {weekDays.map((dateStr, idx) => {
              const parts = dateStr.split('-').map(Number);
              const dayNum = parts[2];
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const taskCount = tasksByDateMap[dateStr] || 0;
              const dayName = WEEKDAY_NAMES[idx];

              return (
                <View key={dateStr} style={styles.weekCellWrapper}>
                  <Pressable
                    onPress={() => selectDate(dateStr)}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayName}, ${dateStr}`}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.weekCell,
                      isToday && !isSelected && {
                        borderWidth: 1,
                        borderColor: colors.accent + '70',
                        borderRadius: Radii.md,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDayName,
                        { color: isSelected ? '#FFFFFFCC' : colors.textTertiary },
                      ]}
                    >
                      {dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumberText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isToday
                            ? colors.accent
                            : colors.textPrimary,
                          fontWeight: isSelected || isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {taskCount > 0 && (
                      <View
                        style={[
                          styles.dotIndicator,
                          { backgroundColor: isSelected ? '#FFFFFF' : colors.accent },
                        ]}
                      />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );

  // Agenda View
  const renderAgendaView = () => {
    const datesWithTasks = Object.keys(tasksByDateMap).sort();

    return (
      <View style={styles.agendaContainer}>
        {datesWithTasks.map((dateKey) => {
          const dateTasks = tasks.filter((t) => t.dueDate === dateKey);
          const isSelected = dateKey === selectedDate;

          const parts = dateKey.split('-').map(Number);
          const headerLabel =
            dateKey === todayStr
              ? 'Today'
              : new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

          return (
            <Animated.View
              key={dateKey}
              entering={FadeInDown.duration(220)}
              style={[
                styles.agendaSection,
                {
                  backgroundColor: isSelected ? colors.accent + '10' : colors.elevatedCard,
                  borderColor: isSelected ? colors.accent : colors.secondaryBackground,
                },
              ]}
            >
              <Pressable onPress={() => selectDate(dateKey)} style={styles.agendaHeaderRow}>
                <Text
                  style={[
                    styles.agendaHeaderText,
                    { color: isSelected ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {headerLabel}
                </Text>
                <Text style={[styles.agendaCountText, { color: colors.textSecondary }]}>
                  {dateTasks.length} {dateTasks.length === 1 ? 'task' : 'tasks'}
                </Text>
              </Pressable>

              {dateTasks.map((task) => (
                <SwipeableTaskRow
                  key={task.id}
                  task={task}
                  project={getProjectForTask(task.projectId)}
                  onPress={() => router.push(`/task/${task.id}`)}
                  onLongPress={() => setActionSheetTask(task)}
                  onToggleComplete={() => toggleTaskCompletion(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
                />
              ))}
            </Animated.View>
          );
        })}

        {datesWithTasks.length === 0 && (
          <EmptyState
            icon="calendar"
            title="No scheduled tasks"
            subtitle="Add due dates to your tasks to see them in your agenda."
          />
        )}
      </View>
    );
  };

  // Task List Section for Selected Date with Apple-style fluid entry
  const renderTaskListSection = () => {
    const parts = selectedDate.split('-').map(Number);
    const formattedTitle =
      selectedDate === todayStr
        ? 'Today'
        : parts.length === 3
        ? new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        : selectedDate;

    return (
      <View style={styles.taskListContainer}>
        {/* Timeline Header */}
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineTitle, { color: colors.textPrimary }]}>{formattedTitle}</Text>
          <Text style={[styles.timelineSubtitle, { color: colors.textSecondary }]}>
            {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task' : 'tasks'} scheduled
          </Text>
        </View>

        {/* Tasks List with subtle stagger */}
        {selectedDateTasks.map((task, idx) => (
          <Animated.View
            key={`${task.id}-${selectedDate}`}
            entering={FadeInDown.duration(200).delay(Math.min(idx * 25, 150))}
          >
            <SwipeableTaskRow
              task={task}
              project={getProjectForTask(task.projectId)}
              onPress={() => router.push(`/task/${task.id}`)}
              onLongPress={() => setActionSheetTask(task)}
              onToggleComplete={() => toggleTaskCompletion(task.id)}
              onDelete={() => deleteTask(task.id)}
              onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
            />
          </Animated.View>
        ))}

        {selectedDateTasks.length === 0 && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <EmptyState
              icon="calendar"
              title="No tasks for this day"
              subtitle={`Nothing is scheduled for ${selectedDate === todayStr ? 'today' : selectedDate}.`}
            />
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Top Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Calendar</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{monthYearLabel}</Text>
            </View>

            <AnimatedPressable
              profile="smallControl"
              onPress={jumpToToday}
              style={[styles.todayBtn, { backgroundColor: colors.accent + '18' }]}
            >
              <CalendarIcon size={14} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.todayBtnText, { color: colors.accent }]}>Today</Text>
            </AnimatedPressable>
          </View>

          {/* Segmented View Switcher */}
          <View style={[styles.segmentedControl, { backgroundColor: colors.secondaryBackground }]}>
            {(['month', 'week', 'agenda'] as ViewMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => handleModeChange(mode)}
                style={[
                  styles.segmentItem,
                  viewMode === mode && { backgroundColor: colors.elevatedCard },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: viewMode === mode ? colors.accent : colors.textTertiary, textTransform: 'capitalize' },
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={animatedViewStyle}>
              {isDesktopOrLaptop ? (
                /* Desktop/Laptop Side-by-Side Two-Panel Composition */
                <View style={styles.desktopTwoPanelRow}>
                  <View style={styles.desktopLeftPanel}>
                    {viewMode === 'month' && renderMonthView()}
                    {viewMode === 'week' && renderWeekView()}
                  </View>
                  <View style={styles.desktopRightPanel}>
                    {viewMode === 'agenda' ? renderAgendaView() : renderTaskListSection()}
                  </View>
                </View>
              ) : (
                /* Mobile Stacked Composition */
                <View>
                  {viewMode === 'month' && renderMonthView()}
                  {viewMode === 'week' && renderWeekView()}
                  {viewMode === 'agenda' ? renderAgendaView() : renderTaskListSection()}
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </View>
      </View>

      {/* Task Quick Action Sheet */}
      <TaskActionSheet
        visible={!!actionSheetTask}
        task={actionSheetTask}
        onClose={() => setActionSheetTask(null)}
        onToggleComplete={() => actionSheetTask && toggleTaskCompletion(actionSheetTask.id)}
        onTogglePin={() => actionSheetTask && toggleTaskPin(actionSheetTask.id)}
        onToggleFavorite={() => actionSheetTask && toggleTaskFavorite(actionSheetTask.id)}
        onEdit={() => actionSheetTask && router.push(`/task/${actionSheetTask.id}`)}
        onReschedule={() => actionSheetTask && updateTask(actionSheetTask.id, { dueDate: getTodayDateString() })}
        onDelete={() => actionSheetTask && deleteTask(actionSheetTask.id)}
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
  title: {
    ...TypographyScale.largeTitle,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  todayBtnText: {
    ...TypographyScale.callout,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MAX_SEGMENTED_CONTROL_WIDTH,
    marginVertical: Spacing.sm,
    padding: 3,
    borderRadius: Radii.lg,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  segmentText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  calendarCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    maxWidth: MAX_CALENDAR_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  monthLabelText: {
    ...TypographyScale.headline,
  },
  weekdayRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: Spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    textAlign: 'center',
  },
  daysGridContainer: {
    position: 'relative',
    width: '100%',
  },
  daysGridWrapper: {
    width: '100%',
    zIndex: 2,
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
    height: MONTH_CELL_HEIGHT,
  },
  dayCellWrapper: {
    flex: 1,
    height: MONTH_CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    ...TypographyScale.callout,
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  weekStripContainer: {
    position: 'relative',
    width: '100%',
    marginTop: Spacing.xs,
  },
  weekStripWrapper: {
    width: '100%',
    zIndex: 2,
  },
  weekStripRow: {
    flexDirection: 'row',
    width: '100%',
    height: WEEK_CELL_HEIGHT,
  },
  weekCellWrapper: {
    flex: 1,
    height: WEEK_CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekDayName: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    marginBottom: 2,
  },
  agendaContainer: {
    flex: 1,
  },
  agendaSection: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  agendaHeaderText: {
    ...TypographyScale.headline,
  },
  agendaCountText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  taskListContainer: {
    flex: 1,
  },
  timelineHeader: {
    marginBottom: Spacing.md,
  },
  timelineTitle: {
    ...TypographyScale.title2,
  },
  timelineSubtitle: {
    ...TypographyScale.footnote,
  },
  desktopTwoPanelRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'flex-start',
  },
  desktopLeftPanel: {
    width: 440,
  },
  desktopRightPanel: {
    flex: 1,
  },
});
