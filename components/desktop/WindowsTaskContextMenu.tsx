import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Modal } from 'react-native';
import {
  Check,
  Edit2,
  Play,
  Flag,
  Folder,
  Bell,
  Copy,
  Trash2,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { Task, PriorityLevel, ReminderOption } from '../../models/task';
import { Project } from '../../models/project';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface WindowsTaskContextMenuProps {
  task: Task | null;
  position: ContextMenuPosition | null;
  projects: Project[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onStartFocus: (task: Task) => void;
  onSetPriority: (taskId: string, priority: PriorityLevel) => void;
  onMoveProject: (taskId: string, projectId?: string) => void;
  onSetReminder: (taskId: string, reminder: ReminderOption) => void;
  onDuplicate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const WindowsTaskContextMenu: React.FC<WindowsTaskContextMenuProps> = ({
  task,
  position,
  projects,
  onClose,
  onSelectTask,
  onToggleComplete,
  onStartFocus,
  onSetPriority,
  onMoveProject,
  onSetReminder,
  onDuplicate,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  const menuRef = useRef<View>(null);

  if (!task || !position) return null;

  // Constrain coordinates within viewport bounds
  const menuWidth = 220;
  const menuHeight = 360;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.min(position.x, viewportWidth - menuWidth - 16);
  const top = Math.min(position.y, viewportHeight - menuHeight - 16);

  return (
    <Modal transparent visible={Boolean(task && position)} onRequestClose={onClose} animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          ref={menuRef}
          style={[
            styles.menuContainer,
            {
              left: Math.max(12, left),
              top: Math.max(12, top),
              backgroundColor: isDark ? 'rgba(30, 30, 38, 0.95)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
            Shadows.card,
          ]}
        >
          {/* Header Title Preview */}
          <View style={[styles.menuHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.taskTitlePreview, { color: colors.textPrimary }]} numberOfLines={1}>
              {task.title}
            </Text>
          </View>

          {/* Toggle Completion */}
          <Pressable
            style={({ hovered }: any) => [
              styles.menuItem,
              hovered && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.08)' },
            ]}
            onPress={() => {
              onToggleComplete(task.id);
              onClose();
            }}
          >
            <CheckCircle2 size={15} color={task.completed ? colors.textTertiary : colors.success} style={styles.itemIcon} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>
              {task.completed ? 'Mark Incomplete' : 'Mark Complete'}
            </Text>
          </Pressable>

          {/* Edit / Inspect Details */}
          <Pressable
            style={({ hovered }: any) => [
              styles.menuItem,
              hovered && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.08)' },
            ]}
            onPress={() => {
              onSelectTask(task);
              onClose();
            }}
          >
            <Edit2 size={15} color={colors.accent} style={styles.itemIcon} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>Edit Task Details</Text>
          </Pressable>

          {/* Start Focus Timer */}
          <Pressable
            style={({ hovered }: any) => [
              styles.menuItem,
              hovered && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.08)' },
            ]}
            onPress={() => {
              onStartFocus(task);
              onClose();
            }}
          >
            <Play size={15} color="#FF9500" style={styles.itemIcon} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>Start Focus Session</Text>
          </Pressable>

          <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

          {/* Set Priority Quick Submenu / Selection */}
          <View style={styles.priorityRow}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>Priority</Text>
            <View style={styles.priorityPills}>
              {(['urgent', 'high', 'medium', 'low', 'none'] as PriorityLevel[]).map((p) => {
                const isSelected = task.priority === p;
                const pColor =
                  p === 'urgent'
                    ? colors.priorityUrgent
                    : p === 'high'
                    ? colors.priorityHigh
                    : p === 'medium'
                    ? colors.priorityMedium
                    : p === 'low'
                    ? colors.priorityLow
                    : colors.textTertiary;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.pPill,
                      {
                        backgroundColor: isSelected ? pColor + '25' : 'transparent',
                        borderColor: isSelected ? pColor : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      },
                    ]}
                    onPress={() => {
                      onSetPriority(task.id, p);
                      onClose();
                    }}
                  >
                    <Text style={[styles.pText, { color: pColor }]}>
                      {p.charAt(0).toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

          {/* Duplicate Task */}
          <Pressable
            style={({ hovered }: any) => [
              styles.menuItem,
              hovered && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.08)' },
            ]}
            onPress={() => {
              onDuplicate(task);
              onClose();
            }}
          >
            <Copy size={15} color={colors.textSecondary} style={styles.itemIcon} />
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>Duplicate</Text>
          </Pressable>

          {/* Delete Task */}
          <Pressable
            style={({ hovered }: any) => [
              styles.menuItem,
              hovered && { backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.08)' },
            ]}
            onPress={() => {
              onDelete(task.id);
              onClose();
            }}
          >
            <Trash2 size={15} color={colors.error} style={styles.itemIcon} />
            <Text style={[styles.itemText, { color: colors.error }]}>Delete Task</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  menuContainer: {
    position: 'absolute',
    width: 220,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    zIndex: 10000,
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  } as any,
  menuHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
  },
  taskTitlePreview: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    marginHorizontal: 4,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  itemIcon: {
    marginRight: Spacing.sm,
  },
  itemText: {
    ...TypographyScale.footnote,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
  priorityRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  sectionLabel: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityPills: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pPill: {
    width: 28,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  pText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
