import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';

export interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  minDate?: string; // Optional YYYY-MM-DD
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Formats a Date object to local YYYY-MM-DD without UTC offset skew
 */
export const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses YYYY-MM-DD into local Date object
 */
export const parseISODate = (str?: string): Date => {
  if (!str) return new Date();
  const parts = str.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
};

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  minDate,
}) => {
  const { colors, isDark } = useTheme();

  const todayISO = useMemo(() => formatDateToISO(new Date()), []);
  const initialDate = useMemo(() => parseISODate(value || todayISO), [value, todayISO]);

  const [selectedDateISO, setSelectedDateISO] = useState<string>(value || todayISO);
  const [viewYearMonth, setViewYearMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  // Synchronize when external value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDateISO(value);
      const parsed = parseISODate(value);
      setViewYearMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [value]);

  const currentYear = viewYearMonth.getFullYear();
  const currentMonth = viewYearMonth.getMonth();

  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewYearMonth(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewYearMonth(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = new Date();
    setSelectedDateISO(todayISO);
    setViewYearMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onChange(todayISO);
  };

  const handleSelectDate = (dateISO: string) => {
    Haptics.selectionAsync();
    setSelectedDateISO(dateISO);
    onChange(dateISO);

    // If tapped a date from adjacent month, shift the view
    const parsed = parseISODate(dateISO);
    if (parsed.getMonth() !== currentMonth || parsed.getFullYear() !== currentYear) {
      setViewYearMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dateISO: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }[] = [];

    // 1. Prev month filler days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const iso = formatDateToISO(new Date(currentYear, currentMonth - 1, d));
      days.push({
        dateISO: iso,
        dayNum: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        isSelected: iso === selectedDateISO,
        isDisabled: Boolean(minDate && iso < minDate),
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = formatDateToISO(new Date(currentYear, currentMonth, d));
      days.push({
        dateISO: iso,
        dayNum: d,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        isSelected: iso === selectedDateISO,
        isDisabled: Boolean(minDate && iso < minDate),
      });
    }

    // 3. Next month filler days to complete grid rows
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const iso = formatDateToISO(new Date(currentYear, currentMonth + 1, d));
        days.push({
          dateISO: iso,
          dayNum: d,
          isCurrentMonth: false,
          isToday: iso === todayISO,
          isSelected: iso === selectedDateISO,
          isDisabled: Boolean(minDate && iso < minDate),
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, todayISO, selectedDateISO, minDate]);

  // Selected date human readable display
  const formattedSelectedLabel = useMemo(() => {
    const parsed = parseISODate(selectedDateISO);
    return parsed.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }, [selectedDateISO]);

  // Quick Preset Handlers
  const quickPresets = useMemo(() => {
    const now = new Date();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    const in1Week = new Date(now);
    in1Week.setDate(in1Week.getDate() + 7);

    return [
      { label: 'Today', iso: todayISO },
      { label: 'Tomorrow', iso: formatDateToISO(tomorrow) },
      { label: '+3 Days', iso: formatDateToISO(in3Days) },
      { label: '+1 Week', iso: formatDateToISO(in1Week) },
    ];
  }, [todayISO]);

  return (
    <View style={styles.container}>
      {/* Quick Presets Row */}
      <View style={styles.presetsRow}>
        {quickPresets.map((preset) => {
          const isPresetActive = selectedDateISO === preset.iso;
          return (
            <Pressable
              key={preset.label}
              onPress={() => handleSelectDate(preset.iso)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isPresetActive
                    ? colors.accent
                    : isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isPresetActive
                    ? colors.accent
                    : isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Text
                style={[
                  styles.presetChipText,
                  {
                    color: isPresetActive ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isPresetActive ? '700' : '500',
                  },
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Month & Year Navigation Header */}
      <View style={styles.headerRow}>
        <AnimatedPressable
          profile="smallControl"
          onPress={handlePrevMonth}
          style={[
            styles.navBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
          accessibilityLabel="Previous month"
        >
          <ChevronLeft size={18} color={colors.textPrimary} />
        </AnimatedPressable>

        <View style={styles.monthTitleWrapper}>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
        </View>

        <View style={styles.navRightGroup}>
          <AnimatedPressable
            profile="smallControl"
            onPress={handleJumpToToday}
            style={[
              styles.todayJumpBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
            accessibilityLabel="Jump to today"
          >
            <RotateCcw size={14} color={colors.accent} />
          </AnimatedPressable>

          <AnimatedPressable
            profile="smallControl"
            onPress={handleNextMonth}
            style={[
              styles.navBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color={colors.textPrimary} />
          </AnimatedPressable>
        </View>
      </View>

      {/* Weekday Names Header */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_NAMES.map((name, idx) => (
          <View key={idx} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textTertiary }]}>
              {name.charAt(0)}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Days Grid */}
      <View style={styles.daysGrid}>
        {calendarDays.map((item, idx) => {
          return (
            <View key={idx} style={styles.dayCellWrapper}>
              <Pressable
                onPress={() => !item.isDisabled && handleSelectDate(item.dateISO)}
                disabled={item.isDisabled}
                style={[
                  styles.dayCell,
                  item.isSelected && {
                    backgroundColor: colors.accent,
                  },
                  item.isToday && !item.isSelected && {
                    borderWidth: 1.5,
                    borderColor: colors.accent,
                  },
                  item.isDisabled && { opacity: 0.3 },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    {
                      color: item.isSelected
                        ? '#FFFFFF'
                        : item.isCurrentMonth
                        ? colors.textPrimary
                        : colors.textTertiary,
                      fontWeight: item.isSelected ? '700' : item.isToday ? '700' : '400',
                      opacity: !item.isCurrentMonth && !item.isSelected ? 0.45 : 1,
                    },
                  ]}
                >
                  {item.dayNum}
                </Text>

                {/* Today Indicator Dot */}
                {item.isToday && !item.isSelected && (
                  <View style={[styles.todayDot, { backgroundColor: colors.accent }]} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Selected Date Summary Banner */}
      <View
        style={[
          styles.summaryBanner,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <CalendarIcon size={14} color={colors.accent} style={{ marginRight: 6 }} />
        <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
          Selected: <Text style={{ fontWeight: '700', color: colors.accent }}>{formattedSelectedLabel}</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  presetChipText: {
    ...TypographyScale.caption1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  monthTitleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayJumpBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  weekdayText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dayCellWrapper: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNumberText: {
    ...TypographyScale.subhead,
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  summaryText: {
    ...TypographyScale.footnote,
  },
});
