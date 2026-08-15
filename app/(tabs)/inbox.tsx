import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Trash2, CheckCircle, Search, X, Pin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { SwipeableTaskRow } from '../../components/tasks/SwipeableTaskRow';
import { TaskActionSheet } from '../../components/tasks/TaskActionSheet';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { PriorityLevel, Task } from '../../models/task';
import { InboxFilters } from '../../components/inbox/InboxFilters';
import { FilterState } from '../../components/inbox/FilterBottomSheet';
import { useResponsive, MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';
import { getTodayDateString } from '../../services/storage/repository';

export default function InboxScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useResponsive();
  const {
    inboxTasks,
    projects,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    updateTask,
    bulkCompleteTasks,
    bulkDeleteTasks,
  } = useTaskora();

  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSheetTask, setActionSheetTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    priority: null,
    projectId: null,
    status: 'all',
    isPinned: null,
    isFavorite: null,
  });

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, 60], [1, 0.92], Extrapolate.CLAMP);
    const opacity = interpolate(scrollY.value, [0, 60], [1, 0.94], Extrapolate.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const toggleSelectTask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedIds.length === 0) return;
    await bulkCompleteTasks(selectedIds);
    setSelectedIds([]);
    setIsMultiSelect(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    await bulkDeleteTasks(selectedIds);
    setSelectedIds([]);
    setIsMultiSelect(false);
  };

  // Filter tasks logic
  const filteredTasks = inboxTasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchNotes = task.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes) return false;
    }
    if (filters.isPinned && !task.isPinned) {
      return false;
    }
    if (filters.isFavorite && !task.isFavorite) {
      return false;
    }
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    if (filters.projectId && task.projectId !== filters.projectId) {
      return false;
    }
    if (filters.status === 'active' && task.completed) {
      return false;
    }
    if (filters.status === 'completed' && !task.completed) {
      return false;
    }
    return true;
  });

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Scroll-Reactive Header */}
          <View style={styles.header}>
            <Animated.View style={animatedHeaderStyle}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Inbox</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {inboxTasks.length} uncategorized tasks
              </Text>
            </Animated.View>
            {inboxTasks.length > 0 && (
              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  setIsMultiSelect(!isMultiSelect);
                  setSelectedIds([]);
                }}
                style={[styles.selectBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.selectText, { color: colors.accent }]}>
                  {isMultiSelect ? 'Done' : 'Select'}
                </Text>
              </AnimatedPressable>
            )}
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: colors.secondaryBackground }]}>
              <Search size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search inbox tasks..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {searchQuery.length > 0 && (
                <AnimatedPressable profile="smallControl" onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textTertiary} />
                </AnimatedPressable>
              )}
            </View>
          </View>

          {/* Dedicated Responsive Inbox Filters System */}
          <InboxFilters
            filters={filters}
            projects={projects}
            onUpdateFilters={(newFilters) => setFilters(newFilters)}
          />

          {/* Bulk Action Toolbar */}
          {isMultiSelect && selectedIds.length > 0 && (
            <View
              style={[
                styles.bulkToolbar,
                {
                  backgroundColor: colors.elevatedCard,
                  borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
                },
              ]}
            >
              <Text style={[styles.selectedCountText, { color: colors.textPrimary }]}>
                {selectedIds.length} selected
              </Text>
              <View style={styles.toolbarActions}>
                <AnimatedPressable profile="smallControl" onPress={handleBulkComplete} style={styles.actionBtn}>
                  <CheckCircle size={20} color={colors.success} />
                </AnimatedPressable>
                <AnimatedPressable profile="smallControl" onPress={handleBulkDelete} style={styles.actionBtn}>
                  <Trash2 size={20} color={colors.error} />
                </AnimatedPressable>
              </View>
            </View>
          )}

          {/* Task List */}
          <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Pinned Section */}
            {filteredTasks.filter((t) => t.isPinned).length > 0 && (
              <View style={styles.section}>
                <View style={styles.pinnedHeader}>
                  <Pin size={15} color={colors.accent} fill={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: colors.accent, marginBottom: 0 }]}>Pinned</Text>
                  <View style={[styles.pinnedBadge, { backgroundColor: colors.accent + '18' }]}>
                    <Text style={[styles.pinnedBadgeText, { color: colors.accent }]}>
                      {filteredTasks.filter((t) => t.isPinned).length}
                    </Text>
                  </View>
                </View>
                {filteredTasks
                  .filter((t) => t.isPinned)
                  .map((task) => (
                    <SwipeableTaskRow
                      key={task.id}
                      task={task}
                      onPress={() => router.push(`/task/${task.id}`)}
                      onLongPress={() => setActionSheetTask(task)}
                      onToggleComplete={() => toggleTaskCompletion(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      isMultiSelectMode={isMultiSelect}
                      isSelected={selectedIds.includes(task.id)}
                      onSelect={() => toggleSelectTask(task.id)}
                    />
                  ))}
              </View>
            )}

            {/* Unpinned Tasks */}
            {filteredTasks.filter((t) => !t.isPinned).length > 0 && (
              <View style={filteredTasks.filter((t) => t.isPinned).length > 0 ? styles.section : undefined}>
                {filteredTasks.filter((t) => t.isPinned).length > 0 && (
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tasks</Text>
                )}
                {filteredTasks
                  .filter((t) => !t.isPinned)
                  .map((task) => (
                    <SwipeableTaskRow
                      key={task.id}
                      task={task}
                      onPress={() => router.push(`/task/${task.id}`)}
                      onLongPress={() => setActionSheetTask(task)}
                      onToggleComplete={() => toggleTaskCompletion(task.id)}
                      onDelete={() => deleteTask(task.id)}
                      isMultiSelectMode={isMultiSelect}
                      isSelected={selectedIds.includes(task.id)}
                      onSelect={() => toggleSelectTask(task.id)}
                    />
                  ))}
              </View>
            )}

            {filteredTasks.length === 0 && (
              <EmptyState
                icon="inbox"
                title={searchQuery || filters.priority || filters.projectId || filters.status !== 'all' || filters.isPinned || filters.isFavorite ? 'No matching tasks' : 'No tasks yet'}
                subtitle={
                  searchQuery || filters.priority || filters.projectId || filters.status !== 'all' || filters.isPinned || filters.isFavorite
                    ? 'Try adjusting your filters or search query.'
                    : 'Tasks you add will appear here.'
                }
              />
            )}
          </Animated.ScrollView>
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
  selectBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  selectText: {
    ...TypographyScale.callout,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radii.lg,
  },
  searchInput: {
    flex: 1,
    ...TypographyScale.body,
  },
  filterScrollView: {
    maxHeight: 38,
    marginVertical: Spacing.xs,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  filterLabel: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  chipText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  bulkToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  selectedCountText: {
    ...TypographyScale.headline,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionBtn: {
    padding: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.md,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pinnedBadge: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    marginLeft: Spacing.xs,
  },
  pinnedBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  sectionTitle: {
    ...TypographyScale.headline,
    marginBottom: Spacing.sm,
  },
});



