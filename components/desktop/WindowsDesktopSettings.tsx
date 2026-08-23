import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import {
  Sliders,
  Sun,
  Moon,
  Monitor,
  Bell,
  Target,
  Sparkles,
  Calendar,
  RefreshCw,
  LayoutGrid,
  Command,
  ShieldCheck,
  Info,
  Clock,
  Mic,
  Trash2,
  Check,
  Play,
  Download,
  Upload,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { ThemeMode } from '../../store/ThemeContext';
import { TimeFormat } from '../../utils/timeFormatter';
import { BackgroundEditor } from '../settings/BackgroundEditor';
import { WindowsWidgetsView } from './WindowsWidgetsView';
import { NotificationCapability } from '../../services/notifications/NotificationCapability';
import { NotificationService } from '../../services/notifications/notificationService';
import { Repository, IncompleteTaskIndicationType, DesktopClockStyle } from '../../services/storage/repository';
import { DigitalClock } from '../clock/DigitalClock';
import { AnalogClock } from '../clock/AnalogClock';
import { VoiceService } from '../../services/voice';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';

export type SettingsCategory =
  | 'general'
  | 'appearance'
  | 'notifications'
  | 'focus'
  | 'tasks'
  | 'calendar'
  | 'sync'
  | 'widgets'
  | 'screensaver'
  | 'shortcuts'
  | 'privacy'
  | 'about';

interface WindowsDesktopSettingsProps {
  onOpenScreenSaver: () => void;
  onNavigateSync: () => void;
  onNavigateCalendar?: () => void;
}

export const WindowsDesktopSettings: React.FC<WindowsDesktopSettingsProps> = ({
  onOpenScreenSaver,
  onNavigateSync,
  onNavigateCalendar,
}) => {
  const {
    mode,
    setThemeMode,
    timeFormat,
    setTimeFormat,
    clockStyle,
    setClockStyle,
    colors,
    isDark,
  } = useTheme();

  const {
    smartSettings,
    updateSmartSettings,
    resetSmartPreferences,
    clearAllData,
    settings: pomodoroSettings,
    updateSettings: updatePomodoroSettings,
  } = useTaskora();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [screensaverTimeout, setScreensaverTimeout] = useState<string>('5m');

  // Notification settings state
  const [notificationPermission, setNotificationPermission] = useState<string>('granted');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [taskRemindersEnabled, setTaskRemindersEnabled] = useState(true);
  const [focusNotificationsEnabled, setFocusNotificationsEnabled] = useState(true);
  const [upcomingAlertsEnabled, setUpcomingAlertsEnabled] = useState(true);
  const [overdueAlertsEnabled, setOverdueAlertsEnabled] = useState(true);
  const [incompleteIndication, setIncompleteIndication] = useState<IncompleteTaskIndicationType>('both');

  // Calendar settings state
  const [weekStart, setWeekStart] = useState<'sun' | 'mon'>('sun');
  const [defaultCalendarView, setDefaultCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [showCompletedOnCalendar, setShowCompletedOnCalendar] = useState(true);
  const [showTimeIndicators, setShowTimeIndicators] = useState(true);

  React.useEffect(() => {
    NotificationCapability.checkPermission().then((status) => {
      setNotificationPermission(status);
    });
    Repository.loadIncompleteTaskIndication().then((saved) => {
      if (saved) setIncompleteIndication(saved);
    });
  }, []);

  const handleRequestPermission = async () => {
    const granted = await NotificationService.requestPermissions();
    setNotificationPermission(granted ? 'granted' : 'denied');
  };

  const handleUpdateIndication = (mode: IncompleteTaskIndicationType) => {
    setIncompleteIndication(mode);
    Repository.saveIncompleteTaskIndication(mode);
  };

  const categories: { id: SettingsCategory; label: string; icon: any }[] = [
    { id: 'general', label: 'General', icon: <Sliders size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Sun size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'focus', label: 'Focus & Pomodoro', icon: <Target size={16} /> },
    { id: 'tasks', label: 'Tasks & Smart NLP', icon: <Sparkles size={16} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
    { id: 'sync', label: 'Sync & Devices', icon: <RefreshCw size={16} /> },
    { id: 'widgets', label: 'Widgets', icon: <LayoutGrid size={16} /> },
    { id: 'screensaver', label: 'Screen Saver', icon: <Clock size={16} /> },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: <Command size={16} /> },
    { id: 'privacy', label: 'Privacy & Diagnostics', icon: <ShieldCheck size={16} /> },
    { id: 'about', label: 'About Taskora', icon: <Info size={16} /> },
  ];

  return (
    <View style={styles.container}>
      {/* Left Settings Sidebar Tabs */}
      <View
        style={[
          styles.settingsSidebar,
          {
            borderRightColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
            backgroundColor: isDark ? 'rgba(20, 20, 26, 0.95)' : 'rgba(245, 245, 250, 0.95)',
          },
        ]}
      >
        <Text style={[styles.settingsNavTitle, { color: colors.textTertiary }]}>SETTINGS</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={({ hovered }: any) => [
                  styles.navItem,
                  isSelected && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                  },
                  hovered && !isSelected && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  },
                ]}
                onPress={() => setActiveCategory(cat.id)}
              >
                <View style={styles.navIconBox}>
                  {React.cloneElement(cat.icon, {
                    color: isSelected ? colors.accent : colors.textSecondary,
                  })}
                </View>
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isSelected ? colors.accent : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Right Settings Content Area */}
      <ScrollView
        style={styles.settingsContent}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Tab */}
        {activeCategory === 'appearance' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Appearance</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Customize themes, glassmorphism layers, and dynamic ambient backgrounds.
            </Text>

            {/* Theme Mode Selector */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Theme Mode</Text>
              <View style={styles.themeOptions}>
                {[
                  { id: 'light', label: 'Light', icon: <Sun size={20} color="#FF9500" /> },
                  { id: 'dark', label: 'Dark', icon: <Moon size={20} color="#5856D6" /> },
                  { id: 'system', label: 'System', icon: <Monitor size={20} color={colors.accent} /> },
                ].map((th) => (
                  <Pressable
                    key={th.id}
                    style={[
                      styles.themeCard,
                      mode === th.id && {
                        borderColor: colors.accent,
                        backgroundColor: colors.accent + '15',
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => setThemeMode(th.id as ThemeMode)}
                  >
                    {th.icon}
                    <Text style={[styles.themeCardText, { color: colors.textPrimary }]}>{th.label}</Text>
                    {mode === th.id && <Check size={14} color={colors.accent} style={{ marginTop: 4 }} />}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Clock Style Selector in Appearance */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Clock Style</Text>
              <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
                Choose presentation style for desktop headers and screen saver standby mode.
              </Text>
              <View style={styles.themeOptions}>
                {[
                  { id: 'minimal', label: 'Minimal Digital' },
                  { id: 'digital', label: 'Large Digital' },
                  { id: 'analog', label: 'Analog Clock' },
                ].map((cs) => (
                  <Pressable
                    key={cs.id}
                    style={[
                      styles.themeCard,
                      clockStyle === cs.id && {
                        borderColor: colors.accent,
                        backgroundColor: colors.accent + '15',
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => setClockStyle(cs.id as DesktopClockStyle)}
                  >
                    <Clock size={20} color={clockStyle === cs.id ? colors.accent : colors.textTertiary} />
                    <Text style={[styles.themeCardText, { color: colors.textPrimary }]}>{cs.label}</Text>
                    {clockStyle === cs.id && <Check size={14} color={colors.accent} style={{ marginTop: 4 }} />}
                  </Pressable>
                ))}
              </View>

              {/* Live Clock Preview */}
              <View style={[styles.clockLivePreview, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>LIVE PREVIEW</Text>
                {clockStyle === 'analog' ? (
                  <AnalogClock size={160} />
                ) : (
                  <DigitalClock showSeconds={clockStyle === 'digital'} showDate={true} />
                )}
              </View>
            </View>

            {/* Ambient Background Editor */}
            <BackgroundEditor />
          </View>
        )}

        {/* Notifications Tab */}
        {activeCategory === 'notifications' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Notifications & Reminders</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Configure desktop alerts, task reminders, and sound indications.
            </Text>

            {/* System Permission Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <View style={styles.permissionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>System Notifications</Text>
                  <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
                    Status:{' '}
                    <Text
                      style={{
                        color: notificationPermission === 'granted' ? colors.success : colors.warning,
                        fontWeight: '700',
                      }}
                    >
                      {notificationPermission === 'granted' ? 'ENABLED & GRANTED' : 'PERMISSION NEEDED'}
                    </Text>
                  </Text>
                </View>

                {notificationPermission !== 'granted' && (
                  <Pressable
                    style={[styles.smallActionBtn, { backgroundColor: colors.accent }]}
                    onPress={handleRequestPermission}
                  >
                    <Text style={styles.smallActionBtnText}>Grant Permission</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Notification Toggles */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Alert Preferences</Text>

              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Task Reminders</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: taskRemindersEnabled ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() => setTaskRemindersEnabled(!taskRemindersEnabled)}
                >
                  <Text style={styles.toggleBtnText}>{taskRemindersEnabled ? 'ON' : 'OFF'}</Text>
                </Pressable>
              </View>

              <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Focus & Pomodoro Alerts</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: focusNotificationsEnabled ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() => setFocusNotificationsEnabled(!focusNotificationsEnabled)}
                >
                  <Text style={styles.toggleBtnText}>{focusNotificationsEnabled ? 'ON' : 'OFF'}</Text>
                </Pressable>
              </View>

              <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Upcoming Task Alerts</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: upcomingAlertsEnabled ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() => setUpcomingAlertsEnabled(!upcomingAlertsEnabled)}
                >
                  <Text style={styles.toggleBtnText}>{upcomingAlertsEnabled ? 'ON' : 'OFF'}</Text>
                </Pressable>
              </View>

              <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Overdue Task Alerts</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: overdueAlertsEnabled ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() => setOverdueAlertsEnabled(!overdueAlertsEnabled)}
                >
                  <Text style={styles.toggleBtnText}>{overdueAlertsEnabled ? 'ON' : 'OFF'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Incomplete Task Sound & Notification Mode */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Incomplete Task Indication Mode</Text>
              <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
                Sound and visual alert style for overdue and uncompleted tasks.
              </Text>
              <View style={styles.themeOptions}>
                {[
                  { id: 'notification', label: 'Notification Only' },
                  { id: 'alarm', label: 'Sound / Alarm' },
                  { id: 'both', label: 'Both' },
                  { id: 'off', label: 'Off' },
                ].map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={[
                      styles.themeCard,
                      incompleteIndication === opt.id && {
                        borderColor: colors.accent,
                        backgroundColor: colors.accent + '15',
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => handleUpdateIndication(opt.id as IncompleteTaskIndicationType)}
                  >
                    <Bell size={18} color={incompleteIndication === opt.id ? colors.accent : colors.textTertiary} />
                    <Text style={[styles.themeCardText, { color: colors.textPrimary }]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Calendar Tab */}
        {activeCategory === 'calendar' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Calendar Preferences</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Customize monthly calendar layout, week start, and task badge display.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Start of Week</Text>
              <View style={styles.timeFormatRow}>
                {[
                  { id: 'sun', label: 'Sunday' },
                  { id: 'mon', label: 'Monday' },
                ].map((ws) => (
                  <Pressable
                    key={ws.id}
                    style={[
                      styles.timeFormatBtn,
                      weekStart === ws.id && {
                        backgroundColor: colors.accent + '20',
                        borderColor: colors.accent,
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => setWeekStart(ws.id as any)}
                  >
                    <Text
                      style={[
                        styles.timeFormatBtnText,
                        { color: weekStart === ws.id ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {ws.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginTop: Spacing.lg }]}>
                Default Calendar View
              </Text>
              <View style={styles.timeFormatRow}>
                {[
                  { id: 'month', label: 'Month Grid' },
                  { id: 'week', label: 'Week Columns' },
                  { id: 'day', label: 'Day Schedule' },
                ].map((cv) => (
                  <Pressable
                    key={cv.id}
                    style={[
                      styles.timeFormatBtn,
                      defaultCalendarView === cv.id && {
                        backgroundColor: colors.accent + '20',
                        borderColor: colors.accent,
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => setDefaultCalendarView(cv.id as any)}
                  >
                    <Text
                      style={[
                        styles.timeFormatBtnText,
                        { color: defaultCalendarView === cv.id ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {cv.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.toggleRow, { marginTop: Spacing.lg }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Show Completed Tasks</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: showCompletedOnCalendar ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() => setShowCompletedOnCalendar(!showCompletedOnCalendar)}
                >
                  <Text style={styles.toggleBtnText}>{showCompletedOnCalendar ? 'ENABLED' : 'DISABLED'}</Text>
                </Pressable>
              </View>

              <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Show Task Due Times</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: showTimeIndicators ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() => setShowTimeIndicators(!showTimeIndicators)}
                >
                  <Text style={styles.toggleBtnText}>{showTimeIndicators ? 'ENABLED' : 'DISABLED'}</Text>
                </Pressable>
              </View>

              {onNavigateCalendar && (
                <Pressable
                  style={[styles.previewScreensaverBtn, { backgroundColor: colors.accent, marginTop: Spacing.xl }]}
                  onPress={onNavigateCalendar}
                >
                  <Calendar size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.previewScreensaverBtnText}>Open Interactive Calendar</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* General Tab */}
        {activeCategory === 'general' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>General Preferences</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Time formats and basic task organization.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Time Display Format</Text>
              <View style={styles.timeFormatRow}>
                {(['12h', '24h'] as TimeFormat[]).map((tf) => (
                  <Pressable
                    key={tf}
                    style={[
                      styles.timeFormatBtn,
                      timeFormat === tf && {
                        backgroundColor: colors.accent + '20',
                        borderColor: colors.accent,
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => setTimeFormat(tf)}
                  >
                    <Text
                      style={[
                        styles.timeFormatBtnText,
                        { color: timeFormat === tf ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {tf === '12h' ? '12-Hour (e.g. 4:30 PM)' : '24-Hour (e.g. 16:30)'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Focus & Pomodoro Tab */}
        {activeCategory === 'focus' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Focus & Pomodoro Timer</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Configure focus cycle durations and break sessions.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Cycle Durations (Minutes)</Text>
              <View style={styles.durationsGrid}>
                <View style={styles.durationCol}>
                  <Text style={[styles.durationLabel, { color: colors.textTertiary }]}>Focus Work</Text>
                  <Text style={[styles.durationValue, { color: colors.accent }]}>
                    {pomodoroSettings.focusDuration} min
                  </Text>
                </View>
                <View style={styles.durationCol}>
                  <Text style={[styles.durationLabel, { color: colors.textTertiary }]}>Short Break</Text>
                  <Text style={[styles.durationValue, { color: '#34C759' }]}>
                    {pomodoroSettings.shortBreakDuration} min
                  </Text>
                </View>
                <View style={styles.durationCol}>
                  <Text style={[styles.durationLabel, { color: colors.textTertiary }]}>Long Break</Text>
                  <Text style={[styles.durationValue, { color: '#5856D6' }]}>
                    {pomodoroSettings.longBreakDuration} min
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tasks & Smart NLP Tab */}
        {activeCategory === 'tasks' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Smart NLP & Productivity</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Natural language parsing engine, smart scheduling, and category classification.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Smart Engine Preferences</Text>
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Productivity Tips & Suggestions</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: smartSettings.productivityTipsEnabled ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() =>
                    updateSmartSettings({ productivityTipsEnabled: !smartSettings.productivityTipsEnabled })
                  }
                >
                  <Text style={styles.toggleBtnText}>
                    {smartSettings.productivityTipsEnabled ? 'ENABLED' : 'DISABLED'}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.toggleRow, { marginTop: Spacing.md }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Smart Scheduling Recommendations</Text>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: smartSettings.smartSchedulingEnabled ? colors.accent : colors.textQuaternary },
                  ]}
                  onPress={() =>
                    updateSmartSettings({ smartSchedulingEnabled: !smartSettings.smartSchedulingEnabled })
                  }
                >
                  <Text style={styles.toggleBtnText}>
                    {smartSettings.smartSchedulingEnabled ? 'ENABLED' : 'DISABLED'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Screen Saver Tab */}
        {activeCategory === 'screensaver' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Screen Saver / Idle Mode</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Ambient desktop idle clock and productivity standby screens.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Clock Style</Text>
              <View style={styles.themeOptions}>
                {[
                  { id: 'minimal', label: 'Minimal Digital' },
                  { id: 'digital', label: 'Large Digital' },
                  { id: 'analog', label: 'Analog Clock' },
                ].map((cs) => (
                  <Pressable
                    key={cs.id}
                    style={[
                      styles.themeCard,
                      clockStyle === cs.id && {
                        borderColor: colors.accent,
                        backgroundColor: colors.accent + '15',
                      },
                      { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    onPress={() => setClockStyle(cs.id as DesktopClockStyle)}
                  >
                    <Clock size={20} color={clockStyle === cs.id ? colors.accent : colors.textTertiary} />
                    <Text style={[styles.themeCardText, { color: colors.textPrimary }]}>{cs.label}</Text>
                    {clockStyle === cs.id && <Check size={14} color={colors.accent} style={{ marginTop: 4 }} />}
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.previewScreensaverBtn, { backgroundColor: colors.accent }]}
                onPress={onOpenScreenSaver}
              >
                <Play size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.previewScreensaverBtnText}>Preview Screen Saver</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Widgets Tab */}
        {activeCategory === 'widgets' && <WindowsWidgetsView />}

        {/* Sync Tab */}
        {activeCategory === 'sync' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Sync & Pairing</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Manage paired devices, Lamport timestamps, and CRDT synchronization.
            </Text>

            <Pressable
              style={[styles.openSyncViewBtn, { backgroundColor: colors.accent }]}
              onPress={onNavigateSync}
            >
              <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.openSyncViewBtnText}>Open Sync & Devices Center</Text>
            </Pressable>
          </View>
        )}

        {/* Keyboard Shortcuts Tab */}
        {activeCategory === 'shortcuts' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Keyboard Shortcuts</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Fast productivity shortcuts for Windows desktop.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              {[
                { key: 'Ctrl + N', label: 'Create New Task (Quick Add with NLP)' },
                { key: 'Ctrl + K', label: 'Command Palette & Global Search' },
                { key: 'Ctrl + F', label: 'Search Tasks & Projects' },
                { key: 'Ctrl + 1', label: 'Switch to Today view' },
                { key: 'Ctrl + 2', label: 'Switch to Inbox view' },
                { key: 'Ctrl + 3', label: 'Switch to Projects view' },
                { key: 'Ctrl + 4', label: 'Switch to Calendar view' },
                { key: 'Ctrl + 5', label: 'Switch to Focus Timer view' },
                { key: 'Ctrl + ,', label: 'Open Settings' },
                { key: 'Esc', label: 'Close active modal / detail panel / screen saver' },
                { key: 'Space', label: 'Toggle completion of selected task' },
                { key: 'Delete', label: 'Delete selected task' },
              ].map((s) => (
                <View
                  key={s.key}
                  style={[
                    styles.shortcutRow,
                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                  ]}
                >
                  <Text style={[styles.shortcutAction, { color: colors.textPrimary }]}>{s.label}</Text>
                  <View style={[styles.shortcutKeyBadge, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }]}>
                    <Text style={[styles.shortcutKeyText, { color: colors.accent }]}>{s.key}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Privacy & Diagnostics */}
        {activeCategory === 'privacy' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Privacy & Local Storage</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Taskora is 100% offline-first. Your tasks never leave your device without explicit pairing.
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Data Management</Text>

              <Pressable
                style={[styles.dangerBtn, { borderColor: colors.error + '40' }]}
                onPress={() => {
                  Alert.alert('Reset All Data', 'Are you sure? This will delete all local tasks and projects.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reset', style: 'destructive', onPress: clearAllData },
                  ]);
                }}
              >
                <Trash2 size={14} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={[styles.dangerBtnText, { color: colors.error }]}>Reset All Local Data</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* About Tab */}
        {activeCategory === 'about' && (
          <View style={styles.tabContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>About Taskora</Text>
            <Text style={[styles.subheading, { color: colors.textTertiary }]}>
              Taskora for Windows Desktop — v1.0.0
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
                Shadows.subtle,
              ]}
            >
              <Text style={[styles.aboutText, { color: colors.textPrimary }]}>
                Taskora is an Apple-inspired, privacy-first, local-first personal productivity and task management suite.
              </Text>
              <Text style={[styles.aboutMeta, { color: colors.textTertiary }]}>
                Engineered with React Native Web, Electron Windows Runtime, and Local-First CRDT Synchronization.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  settingsSidebar: {
    width: 220,
    borderRightWidth: 1,
    padding: Spacing.md,
  },
  settingsNavTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 8,
    borderRadius: Radii.xs,
    marginBottom: 2,
    cursor: 'pointer' as any,
  },
  navIconBox: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  navLabel: {
    ...TypographyScale.footnote,
  },
  settingsContent: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
    maxWidth: 720,
  },
  tabContent: {
    gap: Spacing.md,
  },
  heading: {
    ...TypographyScale.title2,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subheading: {
    ...TypographyScale.footnote,
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  themeCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
    gap: 6,
  },
  themeCardText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  timeFormatRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeFormatBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    cursor: 'pointer' as any,
  },
  timeFormatBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  durationsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  durationCol: {
    alignItems: 'center',
  },
  durationLabel: {
    ...TypographyScale.caption2,
    marginBottom: 4,
  },
  durationValue: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    ...TypographyScale.footnote,
    fontWeight: '500',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  previewScreensaverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.xs,
    marginTop: Spacing.md,
    cursor: 'pointer' as any,
  },
  previewScreensaverBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  openSyncViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  openSyncViewBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  shortcutAction: {
    ...TypographyScale.footnote,
  },
  shortcutKeyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  shortcutKeyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  dangerBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  aboutText: {
    ...TypographyScale.body,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  aboutMeta: {
    ...TypographyScale.caption1,
  },
  cardSubtext: {
    ...TypographyScale.caption1,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  clockLivePreview: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  smallActionBtnText: {
    ...TypographyScale.caption1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
