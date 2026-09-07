import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { parseTimeString, TimeFormat } from '../../utils/timeFormatter';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';

interface CustomTimePickerProps {
  value?: string; // Canonical 24-hr time string "HH:mm" (e.g., "17:30" or "09:05")
  onChange: (normalized24hTime: string) => void;
  formatOverride?: TimeFormat;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value = '17:00',
  onChange,
  formatOverride,
}) => {
  const { colors, isDark, timeFormat: themeFormat } = useTheme();
  const format = formatOverride || themeFormat;

  const parsed = parseTimeString(value) || { hours: 17, minutes: 0 };

  // Calculate initial display parts
  const initialPeriod: 'AM' | 'PM' = parsed.hours >= 12 ? 'PM' : 'AM';
  const initialDisplayHour = format === '12h'
    ? (parsed.hours % 12 === 0 ? 12 : parsed.hours % 12)
    : parsed.hours;

  const [hourInput, setHourInput] = useState(String(initialDisplayHour));
  const [minuteInput, setMinuteInput] = useState(String(parsed.minutes).padStart(2, '0'));
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialPeriod);

  // Sync internal state when external `value` prop changes
  useEffect(() => {
    const p = parseTimeString(value);
    if (p) {
      const pm = p.hours >= 12 ? 'PM' : 'AM';
      const dh = format === '12h'
        ? (p.hours % 12 === 0 ? 12 : p.hours % 12)
        : p.hours;
      setHourInput(String(dh));
      setMinuteInput(String(p.minutes).padStart(2, '0'));
      setPeriod(pm);
    }
  }, [value, format]);

  // Converts local state back into normalized 24-hr time "HH:mm"
  const emitNormalizedTime = (
    hStr: string,
    mStr: string,
    pVal: 'AM' | 'PM'
  ) => {
    let rawHour = parseInt(hStr, 10);
    let rawMin = parseInt(mStr, 10);

    if (isNaN(rawHour)) rawHour = format === '12h' ? 12 : 12;
    if (isNaN(rawMin)) rawMin = 0;

    rawMin = Math.max(0, Math.min(59, rawMin));

    let final24Hour = rawHour;

    if (format === '12h') {
      let displayH = Math.max(1, Math.min(12, rawHour));
      if (pVal === 'PM') {
        final24Hour = displayH === 12 ? 12 : displayH + 12;
      } else {
        final24Hour = displayH === 12 ? 0 : displayH;
      }
    } else {
      final24Hour = Math.max(0, Math.min(23, rawHour));
    }

    const normH = String(final24Hour).padStart(2, '0');
    const normM = String(rawMin).padStart(2, '0');
    onChange(`${normH}:${normM}`);
  };

  const handleHourChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 2) cleaned = cleaned.slice(0, 2);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num)) {
      if (format === '12h' && num > 12) {
        cleaned = '12';
      } else if (format === '24h' && num > 23) {
        cleaned = '23';
      }
    }
    setHourInput(cleaned);
    emitNormalizedTime(cleaned, minuteInput, period);
  };

  const handleHourBlur = () => {
    if (!hourInput || isNaN(parseInt(hourInput, 10)) || parseInt(hourInput, 10) === 0) {
      const fallback = format === '12h' ? '12' : '00';
      setHourInput(fallback);
      emitNormalizedTime(fallback, minuteInput, period);
    }
  };

  const handleMinuteChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 2) cleaned = cleaned.slice(0, 2);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num > 59) {
      cleaned = '59';
    }
    setMinuteInput(cleaned);
    emitNormalizedTime(hourInput, cleaned, period);
  };

  const handleMinuteBlur = () => {
    if (!minuteInput || isNaN(parseInt(minuteInput, 10))) {
      setMinuteInput('00');
      emitNormalizedTime(hourInput, '00', period);
    } else if (minuteInput.length === 1) {
      const padded = '0' + minuteInput;
      setMinuteInput(padded);
      emitNormalizedTime(hourInput, padded, period);
    }
  };

  const handleTogglePeriod = (newPeriod: 'AM' | 'PM') => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    emitNormalizedTime(hourInput, minuteInput, newPeriod);
  };

  return (
    <View style={styles.container}>
      <View style={styles.timeInputsRow}>
        {/* Hour Input Box */}
        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>
            {format === '12h' ? 'HOUR (1-12)' : 'HOUR (00-23)'}
          </Text>
          <TextInput
            value={hourInput}
            onChangeText={handleHourChange}
            onBlur={handleHourBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel="Hour input"
            style={[
              styles.timeInput,
              {
                backgroundColor: colors.secondaryBackground,
                color: colors.textPrimary,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          />
        </View>

        <Text style={[styles.timeColon, { color: colors.textPrimary }]}>:</Text>

        {/* Minute Input Box */}
        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>MINUTE (00-59)</Text>
          <TextInput
            value={minuteInput}
            onChangeText={handleMinuteChange}
            onBlur={handleMinuteBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel="Minute input"
            style={[
              styles.timeInput,
              {
                backgroundColor: colors.secondaryBackground,
                color: colors.textPrimary,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          />
        </View>

        {/* AM / PM Selector (Only rendered next to time input in 12h mode) */}
        {format === '12h' && (
          <View style={styles.periodCol}>
            <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>PERIOD</Text>
            <View style={styles.periodBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => handleTogglePeriod('AM')}
                accessibilityRole="button"
                accessibilityState={{ selected: period === 'AM' }}
                accessibilityLabel="AM"
                style={[
                  styles.periodBtn,
                  {
                    backgroundColor:
                      period === 'AM' ? colors.accent : colors.secondaryBackground,
                    borderColor:
                      period === 'AM'
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.14)'
                        : 'rgba(0, 0, 0, 0.08)',
                  },
                  period === 'AM' && styles.periodBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodBtnText,
                    { color: period === 'AM' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  AM
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                profile="smallControl"
                onPress={() => handleTogglePeriod('PM')}
                accessibilityRole="button"
                accessibilityState={{ selected: period === 'PM' }}
                accessibilityLabel="PM"
                style={[
                  styles.periodBtn,
                  {
                    backgroundColor:
                      period === 'PM' ? colors.accent : colors.secondaryBackground,
                    borderColor:
                      period === 'PM'
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.14)'
                        : 'rgba(0, 0, 0, 0.08)',
                  },
                  period === 'PM' && styles.periodBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodBtnText,
                    { color: period === 'PM' ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  PM
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.sm,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  inputCol: {
    alignItems: 'center',
    flex: 1,
  },
  periodCol: {
    alignItems: 'center',
    flex: 1.4,
    marginLeft: 2,
  },
  inputLabel: {
    ...TypographyScale.caption2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  timeInput: {
    width: '100%',
    height: 52,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    textAlign: 'center',
    ...TypographyScale.title2,
    fontSize: 22,
    fontWeight: '800',
  },
  timeColon: {
    ...TypographyScale.title1,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
  },
  periodBtnRow: {
    flexDirection: 'row',
    height: 52,
    width: '100%',
    gap: 6,
  },
  periodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    minWidth: 44,
  },
  periodBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  periodBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontSize: 13.5,
  },
});
