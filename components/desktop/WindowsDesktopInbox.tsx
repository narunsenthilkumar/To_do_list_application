import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import {
  Check,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  Flag,
  Folder,
  Pin,
  Star,
  Clock,
  X,
  ListTodo,
  Inbox,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task, PriorityLevel } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { formatTaskTime } from '../../utils/timeFormatter';
import { ContextMenuPosition } from './WindowsTaskContextMenu';
import {
  WindowsDesktopFilterBar,
  DesktopFilterState,
  DEFAULT_FILTER_STATE,
  applyTaskFilters,
} from './WindowsDesktopFilterBar';
import { DesktopView } from './WindowsDesktopSidebar';

interface WindowsDesktopInboxProps {
  selectedTaskId: string | null;
  viewMode?: DesktopView;
  onSelectTask: (task: Task) => void;
  onContextMenu: (task: Task, pos: ContextMenuPosition) => void;
  onOpenQuickAdd: () => void;
}

export const WindowsDesktopInbox: React.FC<WindowsDesktopInboxProps> = ({
  selectedTaskId,
  viewMode = 'inbox',
  onSelectTask,
  onContextMenu,
  onOpenQuickAdd,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const {
    inboxTasks,
    todayTasks,
    upcomingTasks,
    highPriorityTasks,
    completedTasks,
    favoriteTasks,
    tasks,
    projects,
    toggleTaskCompletion,
    toggleTaskFavorite,
    toggleTaskPin,
    deleteTask,
    addTask,
    bulkCompleteTasks,
    bulkDeleteTasks,
  } = useTaskora();

  const [filterState, setFilterState] = useState<DesktopFilterState>(DEFAULT_FILTER_STATE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickInput, setQuickInput] = useState('');

  const baseTasks = useMemo(() => {
    switch (viewMode) {
      case 'today':
        return todayTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'important':
        return highPriorityTasks;
      case 'favorites':
        return tasks.filter((t) => t.isFavorite);
      case 'completed':
        return completedTasks;
      case 'search':
        return tasks;
      case 'inbox':
      default:
        return tasks.filter((t) => t.inbox === true);
    }
  }, [viewMode, tasks, todayTasks, upcomingTasks, highPriorityTasks, completedTasks]);

  const filteredTasks = useMemo(() => {
    return applyTaskFilters(baseTasks, filterState);
  }, [baseTasks, filterState]);

  const getViewMeta = () => {
    switch (viewMode) {
      case 'today':
        return { title: 'Today', subtitle: 'Tasks scheduled for today', icon: <Inbox size={22} color={colors.accent} /> };
      case 'upcoming':
        return { title: 'Upcoming', subtitle: 'Scheduled for future dates', icon: <Clock size={22} color="#34C759" /> };
      case 'important':
        return { title: 'Important', subtitle: 'High and urgent priority tasks', icon: <Flag size={22} color={colors.priorityHigh} /> };
      case 'favorites':
        return { title: 'Favourites', subtitle: 'Starred and favorite tasks', icon: <Star size={22} color="#FF9500" /> };
      case 'completed':
        return { title: 'Completed', subtitle: 'Archived and finished tasks', icon: <CheckCircle2 size={22} color={colors.textTertiary} /> };
      case 'search':
        return { title: 'All Tasks & Search', subtitle: 'Global workspace search', icon: <Search size={22} color={colors.accent} /> };
      case 'inbox':
      default:
        return { title: 'Inbox', subtitle: 'Unsorted and quick capture items', icon: <Inbox size={22} color="#5856D6" /> };
    }
  };

  const viewMeta = getViewMeta();

  const handleInlineAdd = async () => {
    if (!quickInput.trim()) return;
    await addTask({
      title: quickInput.trim(),
      inbox: viewMode === 'inbox' || viewMode === 'today',
      isFavorite: viewMode === 'favorites',
      priority: viewMode === 'important' ? 'high' : 'none',
      projectIds: [],
    });
    setQuickInput('');
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasks.map((t) => t.id));
    }
  };

  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return;
    await bulkCompleteTasks(selectedIds);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await bulkDeleteTasks(selectedIds);
    setSelectedIds([]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Dynamic Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerTitleRow}>
            {viewMeta.icon}
            <Text style={[styles.title, { color: colors.textPrimary, marginLeft: 8 }]}>{viewMeta.title}</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} • {viewMeta.subtitle}
          </Text>
        </View>

        <Pressable
          style={({ hovered }: any) => [
            styles.addBtn,
            { backgroundColor: colors.accent },
            hovered && { opacity: 0.9 },
            Shadows.subtle,
          ]}
          onPress={onOpenQuickAdd}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>New Task (Ctrl+N)</Text>
        </Pressable>
      </View>

      {/* Multi-Criteria Filter & Search Toolbar */}
      <WindowsDesktopFilterBar
        filterState={filterState}
        onChangeFilterState={setFilterState}
        placeholder={`Filter ${viewMeta.title.toLowerCase()}...`}
      />

      {/* Bulk Selection Bar (if items selected) */}
      {selectedIds.length > 0 && (
        <View
          style={[
            styles.bulkBar,
            {
              backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
              borderColor: colors.accent + '40',
            },
          ]}
        >
          <Text style={[styles.bulkCount, { color: colors.accent }]}>
            {selectedIds.length} {selectedIds.length === 1 ? 'task selected' : 'tasks selected'}
          </Text>
          <View style={styles.bulkActions}>
            <Pressable style={[styles.bulkBtn, { backgroundColor: colors.success }]} onPress={handleBulkComplete}>
              <Check size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.bulkBtnText}>Complete</Text>
            </Pressable>
            <Pressable style={[styles.bulkBtn, { backgroundColor: colors.error }]} onPress={handleBulkDelete}>
              <Trash2 size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.bulkBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Inline Fast Add Input */}
      <View
        style={[
          styles.inlineAddBox,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          },
          Shadows.subtle,
        ]}
      >
        <Plus size={16} color={colors.accent} style={{ marginRight: Spacing.sm }} />
        <TextInput
          style={[styles.inlineInput, { color: colors.textPrimary }]}
          placeholder={`Add an item to ${viewMeta.title}... (Press Enter)`}
          placeholderTextColor={colors.textTertiary}
          value={quickInput}
          onChangeText={setQuickInput}
          onSubmitEditing={handleInlineAdd}
          returnKeyType="done"
        />
        {quickInput.trim().length > 0 && (
          <Pressable style={[styles.inlineSaveBtn, { backgroundColor: colors.accent }]} onPress={handleInlineAdd}>
            <Text style={styles.inlineSaveBtnText}>Add</Text>
          </Pressable>
        )}
      </View>

      {/* Task List Grid & Dynamic Empty States */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          {viewMode === 'favorites' || filterState.org === 'favorites' ? (
            <>
              <Star size={40} color="#FF9500" style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No favourite tasks yet</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textTertiary }]}>
                Star important tasks to quickly access them in your favorites list.
              </Text>
              <Pressable
                style={[styles.emptyStateActionBtn, { backgroundColor: colors.accent, marginTop: Spacing.md }]}
                onPress={onOpenQuickAdd}
              >
                <Plus size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateActionBtnText}>Add a Favourite</Text>
              </Pressable>
            </>
          ) : filterState.org === 'pinned' ? (
            <>
              <Pin size={40} color={colors.accent} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No pinned tasks yet</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textTertiary }]}>
                Pin tasks to keep them at the top of your workspace.
              </Text>
            </>
          ) : (
            <>
              <Folder size={40} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>No Tasks Found</Text>
              <Text style={[styles.emptyStateSub, { color: colors.textTertiary }]}>
                No tasks match your current criteria. Clear filters or create a new task.
              </Text>
              <Pressable
                style={[styles.emptyStateActionBtn, { backgroundColor: colors.accent, marginTop: Spacing.md }]}
                onPress={() => setFilterState(DEFAULT_FILTER_STATE)}
              >
                <Text style={styles.emptyStateActionBtnText}>Clear Filters</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={styles.taskList}>
          {filteredTasks.map((t) => {
            const isSelected = selectedTaskId === t.id;
            const priorityColor =
              t.priority === 'urgent'
                ? colors.priorityUrgent
                : t.priority === 'high'
                ? colors.priorityHigh
                : t.priority === 'medium'
                ? colors.priorityMedium
                : t.priority === 'low'
                ? colors.priorityLow
                : null;

            // Resolve assigned projects
            const assignedProjects = projects.filter((p) =>
              t.projectIds ? t.projectIds.includes(p.id) : t.projectId === p.id
            );

            return (
              <Pressable
                key={t.id}
                style={({ hovered }: any) => [
                  styles.taskCard,
                  {
                    backgroundColor: isDark
                      ? isSelected
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(255, 255, 255, 0.03)'
                      : isSelected
                      ? 'rgba(0, 122, 255, 0.08)'
                      : '#FFFFFF',
                    borderColor: isSelected
                      ? colors.accent
                      : isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.06)',
                  },
                  hovered && !isSelected && {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                  },
                  Shadows.subtle,
                ]}
                onPress={() => onSelectTask(t)}
                {...({
                  onContextMenu: (e: any) => {
                    if (Platform.OS === 'web') {
                      e.preventDefault();
                      onContextMenu(t, { x: e.clientX, y: e.clientY });
                    }
                  },
                } as any)}
              >
                {/* Completion Checkbox */}
                <Pressable
                  style={[
                    styles.taskCheckbox,
                    {
                      borderColor: t.completed ? colors.success : colors.textTertiary,
                      backgroundColor: t.completed ? colors.success : 'transparent',
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleTaskCompletion(t.id);
                  }}
                >
                  {t.completed && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                </Pressable>

                {/* Content */}
                <View style={styles.taskContent}>
                  <View style={styles.taskTitleRow}>
                    <Text
                      style={[
                        styles.taskTitle,
                        { color: colors.textPrimary },
                        t.completed && styles.completedText,
                      ]}
                      numberOfLines={1}
                    >
                      {t.title}
                    </Text>
                  </View>

                  {/* Metadata Tags */}
                  <View style={styles.taskMetaRow}>
                    {t.dueDate && (
                      <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <Clock size={10} color={colors.textTertiary} style={{ marginRight: 3 }} />
                        <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                          {t.dueDate} {t.dueTime ? formatTaskTime(t.dueTime, timeFormat) : ''}
                        </Text>
                      </View>
                    )}

                    {priorityColor && (
                      <View style={[styles.metaBadge, { backgroundColor: priorityColor + '15' }]}>
                        <Flag size={10} color={priorityColor} style={{ marginRight: 3 }} />
                        <Text style={[styles.metaBadgeText, { color: priorityColor, fontWeight: '700' }]}>
                          {t.priority.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {assignedProjects.map((p) => (
                      <View
                        key={p.id}
                        style={[
                          styles.metaBadge,
                          { backgroundColor: (p.color || colors.accent) + '18' },
                        ]}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: p.color || colors.accent,
                            marginRight: 4,
                          }}
                        />
                        <Text style={[styles.metaBadgeText, { color: p.color || colors.accent, fontWeight: '600' }]}>
                          {p.name}
                        </Text>
                      </View>
                    ))}

                    {t.subtasks && t.subtasks.length > 0 && (
                      <View style={[styles.metaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <ListTodo size={10} color={colors.textTertiary} style={{ marginRight: 3 }} />
                        <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                          {t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Right Interactive Actions (Star, Pin) */}
                <View style={styles.taskRightActions}>
                  <Pressable
                    style={styles.actionIconBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleTaskFavorite(t.id);
                    }}
                  >
                    <Star
                      size={15}
                      color={t.isFavorite ? '#FF9500' : colors.textTertiary}
                      fill={t.isFavorite ? '#FF9500' : 'none'}
                    />
                  </Pressable>

                  <Pressable
                    style={styles.actionIconBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleTaskPin(t.id);
                    }}
                  >
                    <Pin
                      size={15}
                      color={t.isPinned ? colors.accent : colors.textTertiary}
                      fill={t.isPinned ? colors.accent : 'none'}
                    />
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
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
    maxWidth: 960,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: {
    ...TypographyScale.title2,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  addBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...TypographyScale.footnote,
    outlineStyle: 'none',
  } as any,
  filterGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  filterPillText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  bulkLabel: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  bulkActionBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  bulkCancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    cursor: 'pointer' as any,
  },
  bulkCancelBtnText: {
    ...TypographyScale.caption1,
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  inlineInput: {
    flex: 1,
    ...TypographyScale.footnote,
    outlineStyle: 'none',
  } as any,
  inlineSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  inlineSaveBtnText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskList: {
    gap: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
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
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyStateTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  emptyStateSub: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 4,
  },
  emptyStateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  emptyStateActionBtnText: {
    ...TypographyScale.caption1,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitleGroup: {
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.sm,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: Radii.xs,
    cursor: 'pointer' as any,
  },
  bulkCount: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  bulkBtnText: {
    ...TypographyScale.caption1,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
