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
  Calendar,
  Inbox,
  Folder,
  Target,
  Plus,
  Star,
  Flag,
  CheckCircle2,
  Clock,
  RefreshCw,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Project } from '../../models/project';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';

export type DesktopView =
  | 'today'
  | 'inbox'
  | 'projects'
  | 'calendar'
  | 'focus'
  | 'sync'
  | 'settings'
  | 'upcoming'
  | 'important'
  | 'completed'
  | 'favorites'
  | 'search';

interface WindowsDesktopSidebarProps {
  activeView: DesktopView;
  selectedProjectId?: string | null;
  onNavigate: (view: DesktopView) => void;
  onSelectProject?: (projectId: string) => void;
  onOpenQuickAdd: () => void;
  onOpenScreenSaver: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const WindowsDesktopSidebar: React.FC<WindowsDesktopSidebarProps> = ({
  activeView,
  selectedProjectId,
  onNavigate,
  onSelectProject,
  onOpenQuickAdd,
  onOpenScreenSaver,
  collapsed,
  onToggleCollapse,
}) => {
  const { colors, isDark } = useTheme();
  const {
    todayTasks,
    inboxTasks,
    upcomingTasks,
    highPriorityTasks,
    completedTasks,
    favoriteTasks,
    projects,
    tasks,
  } = useTaskora();

  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const navItems: { id: DesktopView; label: string; icon: any; count?: number; color?: string }[] = [
    { id: 'today', label: 'Today', icon: <Calendar size={16} />, count: todayTasks.length, color: colors.accent },
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={16} />, count: inboxTasks.length, color: '#5856D6' },
    { id: 'projects', label: 'Projects', icon: <Folder size={16} />, count: projects.length, color: '#FF9500' },
    { id: 'calendar', label: 'Calendar', icon: <Clock size={16} />, color: '#34C759' },
    { id: 'focus', label: 'Focus Timer', icon: <Target size={16} />, color: '#FF2D55' },
  ];

  const filterItems: { id: DesktopView; label: string; icon: any; count: number; color?: string }[] = [
    { id: 'upcoming', label: 'Upcoming', icon: <Clock size={15} />, count: upcomingTasks.length, color: '#34C759' },
    { id: 'important', label: 'Important', icon: <Flag size={15} />, count: highPriorityTasks.length, color: colors.priorityHigh },
    { id: 'favorites', label: 'Favorites', icon: <Star size={15} />, count: favoriteTasks.length, color: '#FF9500' },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 size={15} />, count: completedTasks.length, color: colors.textTertiary },
  ];

  return (
    <View
      style={[
        styles.sidebarContainer,
        {
          width: collapsed ? 64 : 240,
          backgroundColor: isDark ? 'rgba(18, 18, 24, 0.95)' : 'rgba(246, 246, 250, 0.95)',
          borderRightColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      {/* Quick Add Button */}
      <View style={styles.topActionSection}>
        <Pressable
          style={({ hovered }: any) => [
            styles.quickAddBtn,
            { backgroundColor: colors.accent },
            hovered && { opacity: 0.9 },
          ]}
          onPress={onOpenQuickAdd}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          {!collapsed && <Text style={styles.quickAddBtnText}>New Task (Ctrl+N)</Text>}
        </Pressable>
      </View>

      {/* Main Navigation Items */}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.navGroup}>
          {navItems.map((item) => {
            const isSelected = activeView === item.id;
            return (
              <Pressable
                key={item.id}
                style={({ hovered }: any) => [
                  styles.navRow,
                  isSelected && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                  },
                  hovered && !isSelected && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  },
                ]}
                onPress={() => onNavigate(item.id)}
              >
                <View style={styles.navIconBox}>
                  {React.cloneElement(item.icon, {
                    color: isSelected ? item.color || colors.accent : colors.textSecondary,
                  })}
                </View>

                {!collapsed && (
                  <>
                    <Text
                      style={[
                        styles.navRowLabel,
                        {
                          color: isSelected ? item.color || colors.accent : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>

                    {typeof item.count === 'number' && item.count > 0 && (
                      <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                          {item.count}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>

        {!collapsed && (
          <>
            {/* Smart Filters Header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>SMART FILTERS</Text>
            </View>

            <View style={styles.navGroup}>
              {filterItems.map((item) => {
                const isSelected = activeView === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={({ hovered }: any) => [
                      styles.navRow,
                      isSelected && {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                      },
                      hovered && !isSelected && {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                      },
                    ]}
                    onPress={() => onNavigate(item.id)}
                  >
                    <View style={styles.navIconBox}>
                      {React.cloneElement(item.icon, {
                        color: isSelected ? item.color || colors.accent : colors.textTertiary,
                      })}
                    </View>

                    <Text
                      style={[
                        styles.navRowLabel,
                        {
                          color: isSelected ? colors.accent : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>

                    {item.count > 0 && (
                      <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.countBadgeText, { color: colors.textTertiary }]}>
                          {item.count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Projects Sublist */}
            <View style={styles.sectionHeader}>
              <Pressable
                style={styles.expandHeader}
                onPress={() => setProjectsExpanded(!projectsExpanded)}
              >
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PROJECTS</Text>
                {projectsExpanded ? (
                  <ChevronDown size={12} color={colors.textTertiary} />
                ) : (
                  <ChevronRight size={12} color={colors.textTertiary} />
                )}
              </Pressable>
            </View>

            {projectsExpanded && (
              <View style={styles.navGroup}>
                {projects.map((proj) => {
                  const projTasksCount = tasks.filter(
                    (t) => !t.completed && (t.projectIds ? t.projectIds.includes(proj.id) : t.projectId === proj.id)
                  ).length;
                  const projColor = proj.color || colors.accent;
                  const isSelected = activeView === 'projects' && selectedProjectId === proj.id;

                  return (
                    <Pressable
                      key={proj.id}
                      style={({ hovered }: any) => [
                        styles.navRow,
                        isSelected && {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                        },
                        hovered && !isSelected && {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        },
                      ]}
                      onPress={() => (onSelectProject ? onSelectProject(proj.id) : onNavigate('projects'))}
                    >
                      <View style={[styles.projDot, { backgroundColor: projColor }]} />
                      <Text
                        style={[
                          styles.navRowLabel,
                          {
                            color: isSelected ? projColor : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {proj.name}
                      </Text>
                      {projTasksCount > 0 && (
                        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.countBadgeText, { color: colors.textTertiary }]}>
                            {projTasksCount}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
        <Pressable
          style={({ hovered }: any) => [
            styles.bottomRow,
            activeView === 'sync' && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.08)' },
            hovered && activeView !== 'sync' && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
          ]}
          onPress={() => onNavigate('sync')}
        >
          <RefreshCw size={15} color={colors.textSecondary} />
          {!collapsed && <Text style={[styles.bottomRowLabel, { color: colors.textPrimary }]}>Sync & Devices</Text>}
        </Pressable>

        <Pressable
          style={({ hovered }: any) => [
            styles.bottomRow,
            activeView === 'settings' && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.08)' },
            hovered && activeView !== 'settings' && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
          ]}
          onPress={() => onNavigate('settings')}
        >
          <Settings size={15} color={colors.textSecondary} />
          {!collapsed && <Text style={[styles.bottomRowLabel, { color: colors.textPrimary }]}>Settings</Text>}
        </Pressable>

        {/* Collapse Sidebar Button */}
        <Pressable
          style={({ hovered }: any) => [
            styles.collapseToggle,
            hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={onToggleCollapse}
        >
          {collapsed ? <PanelLeft size={16} color={colors.textTertiary} /> : <PanelLeftClose size={16} color={colors.textTertiary} />}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    borderRightWidth: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  topActionSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
    gap: 8,
  },
  quickAddBtnText: {
    ...TypographyScale.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navScroll: {
    flex: 1,
    paddingHorizontal: Spacing.xs + 2,
  },
  navGroup: {
    gap: 2,
    marginBottom: Spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radii.xs,
    cursor: 'pointer' as any,
  },
  navIconBox: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  navRowLabel: {
    flex: 1,
    ...TypographyScale.footnote,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginTop: Spacing.xs,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer' as any,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  projDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm + 4,
    marginLeft: 4,
  },
  bottomSection: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderTopWidth: 1,
    gap: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radii.xs,
    cursor: 'pointer' as any,
    gap: Spacing.sm,
  },
  bottomRowLabel: {
    ...TypographyScale.footnote,
    fontWeight: '500',
  },
  collapseToggle: {
    padding: 8,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
    marginTop: 4,
  },
});
