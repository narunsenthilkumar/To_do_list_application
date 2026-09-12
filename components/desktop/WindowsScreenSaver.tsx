import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { X, Sparkles, Clock, Target, Maximize2, Minimize2 } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { useFocusTimer } from '../../store/useTaskora';
import { AnalogClock } from '../clock/AnalogClock';
import { DigitalClock } from '../clock/DigitalClock';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';

export type ScreenSaverMode = 'minimal' | 'productivity' | 'focus' | 'ambient';
export type DesktopClockStyle = 'minimal' | 'digital' | 'analog';

interface WindowsScreenSaverProps {
  visible: boolean;
  onClose: () => void;
  mode?: ScreenSaverMode;
  clockStyle?: DesktopClockStyle;
}

export const WindowsScreenSaver: React.FC<WindowsScreenSaverProps> = ({
  visible,
  onClose,
  mode: initialMode = 'ambient',
  clockStyle: propClockStyle,
}) => {
  const { colors, isDark, timeFormat, setTimeFormat, clockStyle: themeClockStyle, setClockStyle } = useTheme();
  const { secondsRemaining, mode: focusMode, isActive: isFocusActive, selectedTaskId } = useFocusTimer();

  const [currentMode, setCurrentMode] = useState<ScreenSaverMode>(initialMode);
  const [currentClockStyle, setCurrentClockStyle] = useState<DesktopClockStyle>(propClockStyle || themeClockStyle);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (propClockStyle) {
      setCurrentClockStyle(propClockStyle);
    } else {
      setCurrentClockStyle(themeClockStyle);
    }
  }, [propClockStyle, themeClockStyle, visible]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  // Keyboard and mouse listener to dismiss screen saver
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleInteraction = () => {
      onClose();
    };

    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const formatFocusTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <Pressable style={styles.fullscreenBackdrop} onPress={onClose}>
        {/* Floating top bar with controls */}
        <Pressable style={styles.topControlBar} onPress={(e: any) => e.stopPropagation()}>
          <View style={styles.modeTabs}>
            {(['ambient', 'focus', 'productivity', 'minimal'] as ScreenSaverMode[]).map((m) => (
              <Pressable
                key={m}
                style={[
                  styles.modeTab,
                  currentMode === m && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}
                onPress={() => setCurrentMode(m)}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    { color: currentMode === m ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)' },
                  ]}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.topActions}>
            <Pressable
              style={styles.timeFormatBtn}
              onPress={() => setTimeFormat(timeFormat === '12h' ? '24h' : '12h')}
            >
              <Text style={styles.timeFormatBtnText}>{timeFormat.toUpperCase()}</Text>
            </Pressable>

            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="rgba(255, 255, 255, 0.7)" />
            </Pressable>
          </View>
        </Pressable>

        {/* Center Clock/Focus Experience */}
        <View style={styles.centerStage}>
          {currentMode === 'focus' && isFocusActive ? (
            <View style={styles.focusDisplay}>
              <Target size={32} color="#FF9500" style={{ marginBottom: 12 }} />
              <Text style={styles.focusTaskLabel}>
                {selectedTaskId ? 'Current Focus Session' : 'Active Pomodoro Session'}
              </Text>
              <Text style={styles.focusLargeTime}>{formatFocusTime(secondsRemaining)}</Text>
            </View>
          ) : currentClockStyle === 'analog' ? (
            <View style={styles.analogWrapper}>
              <AnalogClock />
            </View>
          ) : (
            <View style={styles.digitalWrapper}>
              <DigitalClock showSeconds={currentClockStyle !== 'minimal'} />
              <Text style={styles.dateLabel}>
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {currentMode === 'productivity' && (
            <View style={styles.quoteBox}>
              <Sparkles size={16} color="#FFD60A" style={{ marginRight: 8 }} />
              <Text style={styles.quoteText}>“Focus is a muscle. Practice uninterrupted presence.”</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintText}>Press any key or click to resume KIVENTA</Text>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070709',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 99999,
  },
  topControlBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    zIndex: 100000,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Radii.pill,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  modeTabText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeFormatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    cursor: 'pointer' as any,
  },
  timeFormatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitalWrapper: {
    alignItems: 'center',
  },
  dateLabel: {
    ...TypographyScale.title3,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
    marginTop: Spacing.md,
    letterSpacing: 0.5,
  },
  analogWrapper: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusDisplay: {
    alignItems: 'center',
  },
  focusTaskLabel: {
    ...TypographyScale.footnote,
    color: '#FF9500',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  focusLargeTime: {
    fontSize: 92,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    marginTop: Spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quoteText: {
    ...TypographyScale.footnote,
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
  },
  bottomHint: {
    paddingBottom: Spacing.xl,
  },
  bottomHintText: {
    ...TypographyScale.caption1,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
  },
});
