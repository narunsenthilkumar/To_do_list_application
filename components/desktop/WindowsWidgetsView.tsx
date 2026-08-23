import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import {
  LayoutGrid,
  CheckCircle2,
  Clock,
  Plus,
  Calendar,
  Flame,
  Target,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { calculateTasksProgress } from '../../utils/progress';

export const WindowsWidgetsView: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { todayTasks, todayAllTasks, upcomingTasks, streakStats, completedSessionsToday } = useTaskora();

  const todayStats = calculateTasksProgress(todayAllTasks);
  const [activeWidgetTab, setActiveWidgetTab] = useState<'today' | 'focus' | 'quickadd' | 'upcoming'>('today');

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Desktop Widgets & Glanceables</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>
        Configure compact glanceable widgets powered by Taskora's local persistence engine.
      </Text>

      {/* Widget Tabs */}
      <View style={[styles.widgetTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        {[
          { id: 'today', label: "Today's Tasks", icon: <CheckCircle2 size={14} color={colors.accent} /> },
          { id: 'focus', label: 'Focus Timer', icon: <Target size={14} color="#FF9500" /> },
          { id: 'quickadd', label: 'Quick Add', icon: <Plus size={14} color="#5856D6" /> },
          { id: 'upcoming', label: 'Upcoming', icon: <Calendar size={14} color="#34C759" /> },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            style={[
              styles.widgetTab,
              activeWidgetTab === tab.id && {
                backgroundColor: isDark ? '#2C2C36' : '#FFFFFF',
                ...Shadows.subtle,
              },
            ]}
            onPress={() => setActiveWidgetTab(tab.id as any)}
          >
            {tab.icon}
            <Text
              style={[
                styles.widgetTabText,
                { color: activeWidgetTab === tab.id ? colors.textPrimary : colors.textTertiary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Live Preview Canvas */}
      <View
        style={[
          styles.previewCanvas,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.02)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <Text style={[styles.previewBadge, { color: colors.textTertiary }]}>LIVE WIDGET PREVIEW</Text>

        {activeWidgetTab === 'today' && (
          <View
            style={[
              styles.widgetBox,
              {
                backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
              Shadows.card,
            ]}
          >
            <View style={styles.widgetHeader}>
              <Text style={[styles.wTitle, { color: colors.textPrimary }]}>Today's Agenda</Text>
              <Text style={[styles.wBadge, { color: colors.accent }]}>
                {todayStats.completedCount}/{todayStats.totalCount}
              </Text>
            </View>

            <View style={styles.wProgressTrack}>
              <View
                style={[
                  styles.wProgressFill,
                  { width: `${todayStats.progressPercent}%`, backgroundColor: colors.accent },
                ]}
              />
            </View>

            <View style={styles.wTaskList}>
              {todayTasks.slice(0, 3).map((t) => (
                <View key={t.id} style={styles.wTaskItem}>
                  <View style={[styles.wDot, { backgroundColor: t.completed ? colors.success : colors.accent }]} />
                  <Text style={[styles.wTaskTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeWidgetTab === 'focus' && (
          <View
            style={[
              styles.widgetBox,
              {
                backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
              Shadows.card,
            ]}
          >
            <View style={styles.widgetHeader}>
              <Text style={[styles.wTitle, { color: colors.textPrimary }]}>Focus Engine</Text>
              <View style={styles.flameRow}>
                <Flame size={14} color="#FF9500" style={{ marginRight: 4 }} />
                <Text style={[styles.wBadge, { color: '#FF9500' }]}>{streakStats.currentStreak} days</Text>
              </View>
            </View>

            <View style={styles.focusWidgetCenter}>
              <Text style={[styles.focusTimeDigits, { color: colors.accent }]}>25:00</Text>
              <Text style={[styles.focusTimeSub, { color: colors.textTertiary }]}>Pomodoro Cycle</Text>
            </View>
          </View>
        )}

        {activeWidgetTab === 'quickadd' && (
          <View
            style={[
              styles.widgetBox,
              {
                backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
              Shadows.card,
            ]}
          >
            <Text style={[styles.wTitle, { color: colors.textPrimary }]}>Quick Capture</Text>
            <View style={[styles.quickAddBar, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Plus size={14} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.quickAddPlaceholder, { color: colors.textTertiary }]}>
                Type task with smart date parsing...
              </Text>
            </View>
          </View>
        )}

        {activeWidgetTab === 'upcoming' && (
          <View
            style={[
              styles.widgetBox,
              {
                backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              },
              Shadows.card,
            ]}
          >
            <Text style={[styles.wTitle, { color: colors.textPrimary }]}>Upcoming Deadlines</Text>
            <View style={styles.wTaskList}>
              {upcomingTasks.slice(0, 3).map((t) => (
                <View key={t.id} style={styles.wTaskItem}>
                  <Clock size={12} color={colors.textTertiary} style={{ marginRight: 6 }} />
                  <Text style={[styles.wTaskTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={[styles.wTaskDue, { color: colors.accent }]}>{t.dueDate}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  widgetTabs: {
    flexDirection: 'row',
    borderRadius: Radii.pill,
    padding: 3,
    gap: 4,
    marginBottom: Spacing.lg,
  },
  widgetTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
    gap: 6,
  },
  widgetTabText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  previewCanvas: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  widgetBox: {
    width: 280,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  wTitle: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  wBadge: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  wProgressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  wProgressFill: {
    height: '100%',
  },
  wTaskList: {
    gap: 6,
  },
  wTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  wTaskTitle: {
    flex: 1,
    ...TypographyScale.caption2,
    fontWeight: '500',
  },
  wTaskDue: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 6,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusWidgetCenter: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  focusTimeDigits: {
    fontSize: 36,
    fontWeight: '200',
  },
  focusTimeSub: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  quickAddBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  quickAddPlaceholder: {
    ...TypographyScale.caption2,
  },
});
