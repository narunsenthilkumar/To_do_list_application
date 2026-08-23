import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Pin, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PrimarySurface } from '../components/common/PrimarySurface';
import { SwipeableTaskRow } from '../components/tasks/SwipeableTaskRow';
import { TaskActionSheet } from '../components/tasks/TaskActionSheet';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { useTaskora, useTheme } from '../store/useTaskora';
import { Task } from '../models/task';
import { MAX_CONTENT_WIDTH } from '../theme/responsive';
import { Spacing, TypographyScale, Radii, Shadows } from '../theme/tokens';
import { getBottomContentInset } from '../theme/materials';
import { getTodayDateString } from '../services/storage/repository';
import { safeGoBack } from '../utils/navigation';
import { WindowsDesktopShell } from '../components/desktop/WindowsDesktopShell';

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isDesktop =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.innerWidth >= 900 || Boolean((window as any).electronAPI?.isElectron));

  if (isDesktop) {
    return <WindowsDesktopShell initialView="favorites" />;
  }

  const {
    favoriteTasks,
    projects,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    updateTask,
  } = useTaskora();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [actionSheetTask, setActionSheetTask] = useState<Task | null>(null);
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

  const filteredFavorites = favoriteTasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = task.title.toLowerCase().includes(q);
    const matchNotes = task.notes?.toLowerCase().includes(q);
    const matchTag = task.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchTitle || matchNotes || matchTag;
  });

  const pinnedFavorites = filteredFavorites.filter((t) => t.isPinned);
  const unpinnedFavorites = filteredFavorites.filter((t) => !t.isPinned);

  const getProjectForTask = (projectId?: string) => {
    if (!projectId) return undefined;
    return projects.find((p) => p.id === projectId);
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Navigation Bar */}
          <View style={styles.navBar}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Animated.View style={animatedHeaderStyle}>
              <View style={styles.titleRow}>
                <View style={[styles.starCircle, { backgroundColor: '#FFCC0025' }]}>
                  <Star size={24} color="#FFCC00" fill="#FFCC00" />
                </View>
                <View>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>Favorites</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {favoriteTasks.length} starred {favoriteTasks.length === 1 ? 'task' : 'tasks'}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Search Bar */}
          {favoriteTasks.length > 0 && (
            <View style={styles.searchContainer}>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: isSearchFocused
                      ? (isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)')
                      : colors.secondaryBackground,
                    borderColor: isSearchFocused ? colors.accent + '35' : 'transparent',
                  },
                  isSearchFocused && Shadows.card,
                ]}
              >
                <Search size={18} color={isSearchFocused ? colors.accent : colors.textTertiary} style={{ marginRight: 8 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search favorites..."
                  placeholderTextColor={colors.textTertiary}
                  underlineColorAndroid="transparent"
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                />
                {searchQuery.length > 0 && (
                  <AnimatedPressable profile="smallControl" onPress={() => setSearchQuery('')}>
                    <X size={18} color={colors.textTertiary} />
                  </AnimatedPressable>
                )}
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
            {pinnedFavorites.length > 0 && (
              <View style={styles.section}>
                <View style={styles.pinnedHeader}>
                  <Pin size={15} color={colors.accent} fill={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: colors.accent, marginBottom: 0 }]}>Pinned</Text>
                  <View style={[styles.pinnedBadge, { backgroundColor: colors.accent + '18' }]}>
                    <Text style={[styles.pinnedBadgeText, { color: colors.accent }]}>
                      {pinnedFavorites.length}
                    </Text>
                  </View>
                </View>
                {pinnedFavorites.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Other Favorites */}
            {unpinnedFavorites.length > 0 && (
              <View style={pinnedFavorites.length > 0 ? styles.section : undefined}>
                {pinnedFavorites.length > 0 && (
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tasks</Text>
                )}
                {unpinnedFavorites.map((task) => (
                  <SwipeableTaskRow
                    key={task.id}
                    task={task}
                    project={getProjectForTask(task.projectId)}
                    onPress={() => router.push(`/task/${task.id}`)}
                    onLongPress={() => setActionSheetTask(task)}
                    onToggleComplete={() => toggleTaskCompletion(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {filteredFavorites.length === 0 && (
              <EmptyState
                icon="star"
                title={searchQuery ? 'No matching favorites' : 'No favorite tasks'}
                subtitle={
                  searchQuery
                    ? 'Try searching with a different keyword.'
                    : 'Favorite important tasks to find them quickly.'
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
  navBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  starCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...TypographyScale.largeTitle,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...TypographyScale.body,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
          boxShadow: 'none',
        } as any)
      : {}),
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
