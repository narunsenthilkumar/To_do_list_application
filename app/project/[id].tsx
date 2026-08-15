import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Pin } from 'lucide-react-native';
import * as Icons from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { SwipeableTaskRow } from '../../components/tasks/SwipeableTaskRow';
import { TaskActionSheet } from '../../components/tasks/TaskActionSheet';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task } from '../../models/task';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';
import { getTodayDateString } from '../../services/storage/repository';
import { safeGoBack } from '../../utils/navigation';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    projects,
    tasks,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    updateTask,
    deleteProject,
  } = useTaskora();

  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [actionSheetTask, setActionSheetTask] = useState<Task | null>(null);

  const project = projects.find((p) => p.id === id);

  const getIconComponent = (name: string) => {
    if (!name) return Icons.Folder;
    if ((Icons as any)[name]) return (Icons as any)[name];
    const aliases: Record<string, any> = {
      Home: (Icons as any).House || Icons.Folder,
      CheckSquare: (Icons as any).SquareCheck || (Icons as any).CheckSquare || Icons.Folder,
      CheckCircle2: (Icons as any).CircleCheck || (Icons as any).CheckCircle2 || Icons.Folder,
      Cart: (Icons as any).ShoppingCart || Icons.Folder,
      Shopping: (Icons as any).ShoppingCart || Icons.Folder,
      Travel: (Icons as any).Plane || Icons.Folder,
      List: (Icons as any).ListTodo || (Icons as any).ListChecks || Icons.Folder,
    };
    return aliases[name] || Icons.Folder;
  };

  const projectTasks = project ? tasks.filter((t) => t.projectId === project.id) : [];
  const todayStr = getTodayDateString();

  const activeTasks = projectTasks.filter((t) => !t.completed);
  const upcomingTasks = projectTasks.filter((t) => !t.completed && t.dueDate && t.dueDate > todayStr);
  const completedTasks = projectTasks.filter((t) => t.completed);

  const totalTasksCount = projectTasks.length;
  const completedTasksCount = completedTasks.length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(progressPercent, SpringConfigs.snappy);
  }, [progressPercent]);

  const animatedProgressFillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  if (!project) {
    return (
      <PrimarySurface>
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>Project not found</Text>
          <AnimatedPressable profile="primaryButton" onPress={() => safeGoBack(router)} style={[styles.backBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go Back</Text>
          </AnimatedPressable>
        </View>
      </PrimarySurface>
    );
  }

  const IconComponent = getIconComponent(project.icon);

  const displayedTasks =
    activeTab === 'active' ? activeTasks : activeTab === 'upcoming' ? upcomingTasks : completedTasks;

  const handleDeleteProject = () => {
    Alert.alert(
      `Delete "${project.name}"?`,
      'Tasks in this project will be moved to Inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.id);
            safeGoBack(router);
          },
        },
      ]
    );
  };

  const bottomInset = Math.max(insets.bottom, 24) + 20;

  return (
    <PrimarySurface>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.iconBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>

        <AnimatedPressable profile="destructiveAction" onPress={handleDeleteProject} style={styles.iconBtn}>
          <Trash2 size={20} color={colors.error} />
        </AnimatedPressable>
      </View>

      {/* Project Info Header */}
      <View style={styles.projectHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: project.color + '20' }]}>
            <IconComponent size={28} color={project.color} />
          </View>
          <View style={styles.titleTextContainer}>
            <Text style={[styles.projectTitle, { color: colors.textPrimary }]}>{project.name}</Text>
            {project.description ? (
              <Text style={[styles.projectDesc, { color: colors.textSecondary }]}>{project.description}</Text>
            ) : null}
          </View>
        </View>

        {/* Animated Checklist Progress Indicator */}
        <View style={[styles.progressWrapper, { backgroundColor: colors.elevatedCard }]}>
          <View style={styles.progressHeaderRow}>
            <Text style={[styles.progressCountText, { color: colors.textPrimary }]}>
              {completedTasksCount} of {totalTasksCount} completed
            </Text>
            <Text style={[styles.progressPercentageText, { color: project.color }]}>
              {progressPercent}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondaryBackground }]}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: project.color },
                animatedProgressFillStyle,
              ]}
            />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.tabBar, { backgroundColor: colors.secondaryBackground }]}>
          <Pressable
            onPress={() => setActiveTab('active')}
            style={[styles.tabItem, activeTab === 'active' && { backgroundColor: colors.elevatedCard }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'active' ? colors.accent : colors.textTertiary }]}>
              Active ({activeTasks.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('upcoming')}
            style={[styles.tabItem, activeTab === 'upcoming' && { backgroundColor: colors.elevatedCard }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'upcoming' ? colors.accent : colors.textTertiary }]}>
              Upcoming ({upcomingTasks.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('completed')}
            style={[styles.tabItem, activeTab === 'completed' && { backgroundColor: colors.elevatedCard }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'completed' ? colors.accent : colors.textTertiary }]}>
              Completed ({completedTasks.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'active' && activeTasks.filter((t) => t.isPinned).length > 0 ? (
          <>
            {/* Pinned Section */}
            <View style={styles.section}>
              <View style={styles.pinnedHeader}>
                <Pin size={15} color={colors.accent} fill={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.sectionTitle, { color: colors.accent, marginBottom: 0 }]}>Pinned</Text>
                <View style={[styles.pinnedBadge, { backgroundColor: colors.accent + '18' }]}>
                  <Text style={[styles.pinnedBadgeText, { color: colors.accent }]}>
                    {activeTasks.filter((t) => t.isPinned).length}
                  </Text>
                </View>
              </View>
              {activeTasks
                .filter((t) => t.isPinned)
                .map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={project}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
            </View>

            {/* Other Active Tasks */}
            {activeTasks.filter((t) => !t.isPinned).length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tasks</Text>
                {activeTasks
                  .filter((t) => !t.isPinned)
                  .map((task) => (
                    <SwipeableTaskRow
                      key={task.id}
                      task={task}
                      project={project}
                      onPress={() => router.push(`/task/${task.id}`)}
                      onLongPress={() => setActionSheetTask(task)}
                      onToggleComplete={() => toggleTaskCompletion(task.id)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
              </View>
            )}
          </>
        ) : (
          displayedTasks.map((task) => (
            <SwipeableTaskRow
              key={task.id}
              task={task}
              project={project}
              onPress={() => router.push(`/task/${task.id}`)}
              onLongPress={() => setActionSheetTask(task)}
              onToggleComplete={() => toggleTaskCompletion(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))
        )}

        {displayedTasks.length === 0 && (
          <EmptyState
            icon="sparkles"
            title={`No ${activeTab} tasks`}
            subtitle={`There are no ${activeTab} tasks in ${project.name}.`}
          />
        )}
      </ScrollView>

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
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    ...TypographyScale.title2,
    marginBottom: Spacing.md,
  },
  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  projectHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  titleTextContainer: {
    flex: 1,
  },
  projectTitle: {
    ...TypographyScale.title1,
  },
  projectDesc: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  progressWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressCountText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  progressPercentageText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radii.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  tabText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
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

