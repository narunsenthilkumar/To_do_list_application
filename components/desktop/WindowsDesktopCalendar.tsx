import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Check,
  Clock,
  Flag,
  CheckCircle2,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { formatTaskTime } from '../../utils/timeFormatter';
import { getTodayDateString } from '../../services/storage/repository';
import { ContextMenuPosition } from './WindowsTaskContextMenu';

interface WindowsDesktopCalendarProps {
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  onContextMenu: (task: Task, pos: ContextMenuPosition) => void;
  onOpenQuickAdd: () => void;
}

type CalendarViewMode = 'week' | 'month' | 'day';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WindowsDesktopCalendar: React.FC<WindowsDesktopCalendarProps> = ({
  selectedTaskId,
  onSelectTask,
  onContextMenu,
  onOpenQuickAdd,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const { tasks, toggleTaskCompletion } = useTaskora();

  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');

  // Format helper for YYYY-MM-DD
  const formatDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Compute 7 days of the current week
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayIndex = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

    const days: { date: Date; dateString: string; dayName: string; dayNumber: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        date: d,
        dateString: formatDateString(d),
        dayName: WEEKDAYS[i],
        dayNumber: d.getDate(),
      });
    }
    return days;
  }, [currentDate]);

  // Compute month days grid
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: ({ dateString: string; dayNumber: number; isCurrentMonth: boolean } | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dDate = new Date(year, month, d);
      days.push({
        dateString: formatDateString(dDate),
        dayNumber: d,
        isCurrentMonth: true,
      });
    }
    return days;
  }, [currentDate]);

  const handlePrev = () => {
    if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 7);
      setCurrentDate(next);
    } else if (viewMode === 'month') {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() - 1);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 1);
      setCurrentDate(next);
      setSelectedDate(formatDateString(next));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else if (viewMode === 'month') {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() + 1);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 1);
      setCurrentDate(next);
      setSelectedDate(formatDateString(next));
    }
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(formatDateString(now));
  };

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  const getHeaderTitle = () => {
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (viewMode === 'week') {
      const start = weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${start} – ${end}, ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    return monthName;
  };

  return (
    <View style={styles.container}>
      {/* Top Header Controls */}
      <View style={[styles.headerBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{getHeaderTitle()}</Text>

          <View style={styles.navButtons}>
            <Pressable
              style={({ hovered }: any) => [
                styles.navArrow,
                hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
              onPress={handlePrev}
            >
              <ChevronLeft size={16} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              style={({ hovered }: any) => [
                styles.todayBtn,
                hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
              ]}
              onPress={handleTodayJump}
            >
              <Text style={[styles.todayBtnText, { color: colors.textPrimary }]}>Today</Text>
            </Pressable>

            <Pressable
              style={({ hovered }: any) => [
                styles.navArrow,
                hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
              onPress={handleNext}
            >
              <ChevronRight size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* View Mode Segmented Switcher */}
        <View style={[styles.viewModeSwitcher, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          {(['week', 'month', 'day'] as CalendarViewMode[]).map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.viewModeTab,
                viewMode === mode && {
                  backgroundColor: isDark ? '#2C2C36' : '#FFFFFF',
                  ...Shadows.subtle,
                },
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Text
                style={[
                  styles.viewModeText,
                  { color: viewMode === mode ? colors.textPrimary : colors.textTertiary },
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Calendar Body View */}
      <View style={styles.calendarBody}>
        {viewMode === 'week' && (
          <View style={styles.weekViewContainer}>
            {weekDays.map((wd) => {
              const isToday = wd.dateString === todayStr;
              const isSelected = wd.dateString === selectedDate;
              const dayTasks = getTasksForDate(wd.dateString);

              return (
                <View
                  key={wd.dateString}
                  style={[
                    styles.weekColumn,
                    {
                      borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(255,255,255,0.02)'
                          : 'rgba(0,122,255,0.02)'
                        : 'transparent',
                    },
                  ]}
                >
                  {/* Column Day Header */}
                  <Pressable
                    style={[
                      styles.weekColumnHeader,
                      isToday && { backgroundColor: colors.accent + '15', borderRadius: 8 },
                    ]}
                    onPress={() => setSelectedDate(wd.dateString)}
                  >
                    <Text style={[styles.weekDayName, { color: isToday ? colors.accent : colors.textTertiary }]}>
                      {wd.dayName}
                    </Text>
                    <Text style={[styles.weekDayNumber, { color: isToday ? colors.accent : colors.textPrimary }]}>
                      {wd.dayNumber}
                    </Text>
                  </Pressable>

                  {/* Tasks in this Day Column */}
                  <ScrollView style={styles.columnTasksScroll} showsVerticalScrollIndicator={false}>
                    {dayTasks.map((t) => {
                      const isTaskSelected = selectedTaskId === t.id;
                      const pColor =
                        t.priority === 'urgent'
                          ? colors.priorityUrgent
                          : t.priority === 'high'
                          ? colors.priorityHigh
                          : t.priority === 'medium'
                          ? colors.priorityMedium
                          : colors.accent;

                      return (
                        <Pressable
                          key={t.id}
                          style={({ hovered }: any) => [
                            styles.weekTaskCard,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                              borderLeftColor: pColor,
                            },
                            isTaskSelected && { borderColor: colors.accent, borderWidth: 1 },
                            hovered && {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                            },
                            Shadows.subtle,
                          ]}
                          onPress={() => {
                            setSelectedDate(wd.dateString);
                            onSelectTask(t);
                          }}
                          {...({
                            onContextMenu: (e: any) => {
                              if (Platform.OS === 'web') {
                                e.preventDefault();
                                onContextMenu(t, { x: e.clientX, y: e.clientY });
                              }
                            },
                          } as any)}
                        >
                          <Text
                            style={[
                              styles.weekTaskTitle,
                              { color: colors.textPrimary },
                              t.completed && styles.completedTaskText,
                            ]}
                            numberOfLines={2}
                          >
                            {t.title}
                          </Text>

                          {t.dueTime && (
                            <View style={styles.weekTaskTimeRow}>
                              <Clock size={10} color={colors.textTertiary} style={{ marginRight: 3 }} />
                              <Text style={[styles.weekTaskTimeText, { color: colors.textTertiary }]}>
                                {formatTaskTime(t.dueTime, timeFormat)}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })}
          </View>
        )}

        {viewMode === 'month' && (
          <ScrollView style={styles.monthScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.monthViewContainer}>
              {/* Weekday header row */}
              <View style={styles.monthWeekdayHeader}>
                {WEEKDAYS.map((wd) => (
                  <Text key={wd} style={[styles.monthWeekdayText, { color: colors.textTertiary }]}>
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Month grid */}
              <View style={styles.monthGrid}>
                {monthDays.map((item, idx) => {
                  if (!item) {
                    return (
                      <View
                        key={`empty-${idx}`}
                        style={[
                          styles.monthCell,
                          styles.monthCellEmpty,
                          { borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                        ]}
                      />
                    );
                  }

                  const isToday = item.dateString === todayStr;
                  const isSelected = item.dateString === selectedDate;
                  const cellTasks = getTasksForDate(item.dateString);
                  const displayTasks = cellTasks.slice(0, 2);
                  const overflowCount = cellTasks.length - 2;

                  return (
                    <Pressable
                      key={item.dateString}
                      style={({ hovered }: any) => [
                        styles.monthCell,
                        {
                          borderColor: isSelected
                            ? colors.accent
                            : isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.06)',
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(0,122,255,0.1)'
                              : 'rgba(0,122,255,0.05)'
                            : hovered
                            ? isDark
                              ? 'rgba(255,255,255,0.03)'
                              : 'rgba(0,0,0,0.02)'
                            : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedDate(item.dateString)}
                    >
                      {/* Cell Header with Day Number */}
                      <View style={styles.monthCellHeader}>
                        <View
                          style={[
                            styles.monthDayBadge,
                            isToday && { backgroundColor: colors.accent },
                            isSelected && !isToday && { borderColor: colors.accent, borderWidth: 1.5 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.monthDayText,
                              {
                                color: isToday ? '#FFFFFF' : isSelected ? colors.accent : colors.textPrimary,
                                fontWeight: isToday || isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {item.dayNumber}
                          </Text>
                        </View>
                      </View>

                      {/* Compact Task List within Date Cell */}
                      <View style={styles.monthCellTasks}>
                        {displayTasks.map((t) => {
                          const isTaskSelected = selectedTaskId === t.id;
                          const pColor =
                            t.priority === 'urgent'
                              ? colors.priorityUrgent
                              : t.priority === 'high'
                              ? colors.priorityHigh
                              : t.priority === 'medium'
                              ? colors.priorityMedium
                              : colors.accent;

                          return (
                            <Pressable
                              key={t.id}
                              style={({ hovered }: any) => [
                                styles.monthTaskItem,
                                {
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                                  borderLeftColor: t.completed ? colors.success : pColor,
                                },
                                isTaskSelected && { borderColor: colors.accent, borderWidth: 1 },
                                hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' },
                                Shadows.subtle,
                              ]}
                              onPress={(e: any) => {
                                e?.stopPropagation?.();
                                setSelectedDate(item.dateString);
                                onSelectTask(t);
                              }}
                              {...({
                                onContextMenu: (e: any) => {
                                  if (Platform.OS === 'web') {
                                    e.preventDefault();
                                    onContextMenu(t, { x: e.clientX, y: e.clientY });
                                  }
                                },
                              } as any)}
                            >
                              <View
                                style={[
                                  styles.monthTaskDot,
                                  { backgroundColor: t.completed ? colors.success : pColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.monthTaskTitle,
                                  { color: colors.textPrimary },
                                  t.completed && styles.completedTaskText,
                                ]}
                                numberOfLines={1}
                              >
                                {t.title}
                              </Text>
                            </Pressable>
                          );
                        })}

                        {overflowCount > 0 && (
                          <Pressable
                            style={[
                              styles.monthOverflowBadge,
                              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                            ]}
                            onPress={() => setSelectedDate(item.dateString)}
                          >
                            <Text style={[styles.monthMoreText, { color: colors.accent }]}>
                              +{overflowCount} more
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Selected Date Schedule Summary Footer in Month View */}
              <View
                style={[
                  styles.monthDateDetailsCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                  Shadows.subtle,
                ]}
              >
                <View style={styles.monthDateDetailsHeader}>
                  <View>
                    <Text style={[styles.monthDateDetailsTitle, { color: colors.textPrimary }]}>
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={[styles.monthDateDetailsSubtitle, { color: colors.textTertiary }]}>
                      {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'task scheduled' : 'tasks scheduled'}
                    </Text>
                  </View>

                  <Pressable
                    style={[styles.smallActionBtn, { backgroundColor: colors.accent }]}
                    onPress={onOpenQuickAdd}
                  >
                    <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.smallActionBtnText}>New Task</Text>
                  </Pressable>
                </View>

                {selectedDateTasks.length === 0 ? (
                  <Text style={[styles.noTasksDateText, { color: colors.textTertiary }]}>
                    No tasks scheduled for this day. Click "+ New Task" to plan something.
                  </Text>
                ) : (
                  <View style={styles.selectedDateTasksList}>
                    {selectedDateTasks.map((t) => (
                      <Pressable
                        key={t.id}
                        style={({ hovered }: any) => [
                          styles.dayTaskRow,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          },
                          hovered && {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          },
                        ]}
                        onPress={() => onSelectTask(t)}
                      >
                        <Pressable
                          style={[
                            styles.taskCheckbox,
                            {
                              borderColor: t.completed ? colors.success : colors.textTertiary,
                              backgroundColor: t.completed ? colors.success : 'transparent',
                            },
                          ]}
                          onPress={() => toggleTaskCompletion(t.id)}
                        >
                          {t.completed && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                        </Pressable>

                        <Text
                          style={[
                            styles.dayTaskTitle,
                            { color: colors.textPrimary },
                            t.completed && styles.completedTaskText,
                          ]}
                        >
                          {t.title}
                        </Text>

                        {t.dueTime && (
                          <View style={styles.taskTimeBadge}>
                            <Clock size={11} color={colors.textTertiary} style={{ marginRight: 4 }} />
                            <Text style={[styles.dayTaskTime, { color: colors.textTertiary }]}>
                              {formatTaskTime(t.dueTime, timeFormat)}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}

        {viewMode === 'day' && (
          <ScrollView style={styles.dayViewContainer} contentContainerStyle={{ padding: Spacing.xl }}>
            <Text style={[styles.dayHeaderTitle, { color: colors.textPrimary }]}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            <View style={styles.dayTasksList}>
              {selectedDateTasks.length === 0 ? (
                <View style={styles.emptyState}>
                  <CalendarIcon size={36} color={colors.textTertiary} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Tasks Scheduled</Text>
                  <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                    No tasks planned for this day. Click "+ New Task" to schedule one.
                  </Text>
                </View>
              ) : (
                selectedDateTasks.map((t) => (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.dayTaskRow,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                      },
                      Shadows.subtle,
                    ]}
                    onPress={() => onSelectTask(t)}
                  >
                    <Pressable
                      style={[
                        styles.taskCheckbox,
                        {
                          borderColor: t.completed ? colors.success : colors.textTertiary,
                          backgroundColor: t.completed ? colors.success : 'transparent',
                        },
                      ]}
                      onPress={() => toggleTaskCompletion(t.id)}
                    >
                      {t.completed && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                    </Pressable>

                    <Text style={[styles.dayTaskTitle, { color: colors.textPrimary }]}>{t.title}</Text>
                    {t.dueTime && (
                      <Text style={[styles.dayTaskTime, { color: colors.textTertiary }]}>
                        {formatTaskTime(t.dueTime, timeFormat)}
                      </Text>
                    )}
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  headerTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navArrow: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  todayBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    borderRadius: Radii.pill,
    padding: 3,
    gap: 2,
  },
  viewModeTab: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  viewModeText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  calendarBody: {
    flex: 1,
  },
  weekViewContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  weekColumn: {
    flex: 1,
    borderRightWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: Spacing.xs,
  },
  weekColumnHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    cursor: 'pointer' as any,
  },
  weekDayName: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weekDayNumber: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginTop: 2,
  },
  columnTasksScroll: {
    flex: 1,
    gap: 6,
  },
  weekTaskCard: {
    padding: Spacing.sm,
    borderRadius: 6,
    borderLeftWidth: 3,
    marginBottom: 6,
    cursor: 'pointer' as any,
  },
  weekTaskTitle: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  weekTaskTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  weekTaskTimeText: {
    fontSize: 9,
    fontWeight: '500',
  },
  monthScrollView: {
    flex: 1,
  },
  monthViewContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  monthWeekdayHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  monthWeekdayText: {
    flex: 1,
    textAlign: 'center',
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  monthCell: {
    width: '14.28%',
    minHeight: 90,
    borderWidth: 0.5,
    padding: 6,
    cursor: 'pointer' as any,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  monthCellEmpty: {
    minHeight: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  monthCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  monthDayBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  monthCellTasks: {
    flex: 1,
    gap: 3,
  },
  monthTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    borderLeftWidth: 2.5,
    cursor: 'pointer' as any,
  },
  monthTaskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  monthTaskTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '500',
  },
  monthOverflowBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    cursor: 'pointer' as any,
  },
  monthMoreText: {
    fontSize: 9,
    fontWeight: '700',
  },
  monthDateDetailsCard: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  monthDateDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthDateDetailsTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  monthDateDetailsSubtitle: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  smallActionBtnText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noTasksDateText: {
    ...TypographyScale.caption1,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
  },
  selectedDateTasksList: {
    gap: 8,
  },
  dayViewContainer: {
    flex: 1,
  },
  dayHeaderTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  dayTasksList: {
    gap: 8,
  },
  dayTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
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
  dayTaskTitle: {
    flex: 1,
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  taskTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTaskTime: {
    ...TypographyScale.caption1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  emptySub: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 4,
  },
});
