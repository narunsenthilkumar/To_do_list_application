import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search as SearchIcon, X, Pin, Star } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimarySurface } from '../components/common/PrimarySurface';
import { SwipeableTaskRow } from '../components/tasks/SwipeableTaskRow';
import { TaskActionSheet } from '../components/tasks/TaskActionSheet';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { useSearch, useTheme, useTasks } from '../store/useTaskora';
import { PriorityLevel, Task } from '../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../theme/tokens';
import { getBottomContentInset } from '../theme/materials';
import { safeGoBack } from '../utils/navigation';
import { WindowsDesktopShell } from '../components/desktop/WindowsDesktopShell';
import { getTodayDateString } from '../services/storage/repository';

export default function SearchScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isDesktop =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.innerWidth >= 900 || Boolean((window as any).electronAPI?.isElectron));

  if (isDesktop) {
    return <WindowsDesktopShell initialView="search" />;
  }

  const [isFocused, setIsFocused] = useState(false);
  const {
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    updateTask,
  } = useTasks();
  const {
    query,
    setQuery,
    selectedPriority,
    setSelectedPriority,
    selectedProjectId,
    setSelectedProjectId,
    filterPinned,
    setFilterPinned,
    filterFavorite,
    setFilterFavorite,
    results,
    projects,
  } = useSearch();

  const [actionSheetTask, setActionSheetTask] = React.useState<Task | null>(null);

  const bottomInset = Math.max(insets.bottom, 24) + 20;

  return (
    <PrimarySurface>
      {/* Search Bar Header */}
      <View style={styles.header}>
        <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isFocused
                ? (isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)')
                : colors.secondaryBackground,
              borderColor: isFocused ? colors.accent + '35' : 'transparent',
            },
            isFocused && Shadows.card,
          ]}
        >
          <SearchIcon size={18} color={isFocused ? colors.accent : colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search tasks, notes, tags..."
            placeholderTextColor={colors.textTertiary}
            underlineColorAndroid="transparent"
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {query.length > 0 && (
            <AnimatedPressable profile="smallControl" onPress={() => setQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </AnimatedPressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {/* Pinned Chip */}
        <AnimatedPressable
          profile="smallControl"
          onPress={() => setFilterPinned(filterPinned ? null : true)}
          style={[
            styles.filterChip,
            {
              backgroundColor: filterPinned ? colors.accent : colors.secondaryBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: filterPinned ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            📌 Pinned
          </Text>
        </AnimatedPressable>

        {/* Favorites Chip */}
        <AnimatedPressable
          profile="smallControl"
          onPress={() => setFilterFavorite(filterFavorite ? null : true)}
          style={[
            styles.filterChip,
            {
              backgroundColor: filterFavorite ? '#FFCC00' : colors.secondaryBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: filterFavorite ? '#000000' : colors.textSecondary },
            ]}
          >
            ⭐ Favorites
          </Text>
        </AnimatedPressable>

        <Text style={[styles.filterLabel, { color: colors.textTertiary, marginLeft: Spacing.xs }]}>Priority:</Text>
        {(['high', 'urgent'] as PriorityLevel[]).map((p) => (
          <AnimatedPressable
            key={p}
            profile="smallControl"
            onPress={() => setSelectedPriority(selectedPriority === p ? null : p)}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedPriority === p ? colors.accent : colors.secondaryBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedPriority === p ? '#FFFFFF' : colors.textSecondary, textTransform: 'capitalize' },
              ]}
            >
              {p}
            </Text>
          </AnimatedPressable>
        ))}

        <Text style={[styles.filterLabel, { color: colors.textTertiary, marginLeft: Spacing.md }]}>
          Project:
        </Text>
        {projects.map((proj) => (
          <AnimatedPressable
            key={proj.id}
            profile="smallControl"
            onPress={() => setSelectedProjectId(selectedProjectId === proj.id ? null : proj.id)}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedProjectId === proj.id ? proj.color : colors.secondaryBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: selectedProjectId === proj.id ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {proj.name}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>

      {/* Results List */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {results.map((task) => (
          <SwipeableTaskRow
            key={task.id}
            task={task}
            onPress={() => router.push(`/task/${task.id}`)}
            onLongPress={() => setActionSheetTask(task)}
            onToggleComplete={() => toggleTaskCompletion(task.id)}
            onDelete={() => deleteTask(task.id)}
            onReschedule={() => updateTask(task.id, { dueDate: getTodayDateString() })}
          />
        ))}

        {results.length === 0 && (
          <EmptyState
            icon="search"
            title="No matching tasks"
            subtitle={query ? `No results found for "${query}"` : 'Type to search across your workspace.'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
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
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    maxHeight: 36,
  },
  filterLabel: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    alignSelf: 'center',
    marginRight: 6,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    marginRight: Spacing.xs,
    alignSelf: 'center',
  },
  chipText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
});

