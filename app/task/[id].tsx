import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Clock,
  Flag,
  Folder,
  Bell,
  Repeat,
  Plus,
  Check,
  History,
  Pin,
  Star,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { TaskCheckbox } from '../../components/tasks/TaskCheckbox';
import { PriorityBadge } from '../../components/tasks/PriorityBadge';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { PriorityLevel } from '../../models/task';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { getBottomContentInset, MaterialLayers } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    tasks,
    projects,
    updateTask,
    toggleTaskCompletion,
    toggleTaskPin,
    toggleTaskFavorite,
    deleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useTaskora();

  const task = tasks.find((t) => t.id === id);

  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
    }
  }, [task]);

  if (!task) {
    return (
      <PrimarySurface>
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>Task not found</Text>
          <AnimatedPressable profile="primaryButton" onPress={() => safeGoBack(router)} style={[styles.backBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go Back</Text>
          </AnimatedPressable>
        </View>
      </PrimarySurface>
    );
  }

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      updateTask(task.id, { title: title.trim() });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== task.notes) {
      updateTask(task.id, { notes });
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    addSubtask(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleDeleteTask = () => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task.id);
          safeGoBack(router);
        },
      },
    ]);
  };

  const bottomInset = Math.max(insets.bottom, 24) + 20;

  return (
    <PrimarySurface>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.iconBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.textPrimary} />
        </AnimatedPressable>

        <View style={styles.headerRightActions}>
          {/* Pin Quick Toggle */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleTaskPin(task.id);
            }}
            style={[
              styles.iconBtn,
              task.isPinned && { backgroundColor: colors.accent + '20' },
            ]}
          >
            <Pin
              size={20}
              color={task.isPinned ? colors.accent : colors.textTertiary}
              fill={task.isPinned ? colors.accent : 'transparent'}
            />
          </AnimatedPressable>

          {/* Favorite Quick Toggle */}
          <AnimatedPressable
            profile="smallControl"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleTaskFavorite(task.id);
            }}
            style={[
              styles.iconBtn,
              task.isFavorite && { backgroundColor: '#FFCC0025' },
            ]}
          >
            <Star
              size={20}
              color={task.isFavorite ? '#FFCC00' : colors.textTertiary}
              fill={task.isFavorite ? '#FFCC00' : 'transparent'}
            />
          </AnimatedPressable>

          {/* Delete */}
          <AnimatedPressable profile="destructiveAction" onPress={handleDeleteTask} style={styles.iconBtn}>
            <Trash2 size={20} color={colors.error} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Large Checkbox */}
        <View style={styles.titleSection}>
          <TaskCheckbox
            completed={task.completed}
            onToggle={() => toggleTaskCompletion(task.id)}
            priority={task.priority}
            size={28}
          />
          <TextInput
            value={title}
            onChangeText={setTitle}
            onBlur={handleTitleBlur}
            style={[
              styles.titleInput,
              {
                color: task.completed ? colors.textTertiary : colors.textPrimary,
                textDecorationLine: task.completed ? 'line-through' : 'none',
              },
            ]}
            multiline
          />
        </View>

        {/* Pin & Favorite Highlights Card */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Importance & Position</Text>
          <View style={styles.statusChipsRow}>
            {/* Pinned toggle chip */}
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleTaskPin(task.id);
              }}
              style={[
                styles.highlightChip,
                {
                  backgroundColor: task.isPinned ? colors.accent : colors.secondaryBackground,
                },
              ]}
            >
              <Pin
                size={16}
                color={task.isPinned ? '#FFFFFF' : colors.textSecondary}
                fill={task.isPinned ? '#FFFFFF' : 'transparent'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.highlightChipText,
                  { color: task.isPinned ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {task.isPinned ? 'Pinned to Top' : 'Pin Task'}
              </Text>
            </AnimatedPressable>

            {/* Favorite toggle chip */}
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                toggleTaskFavorite(task.id);
              }}
              style={[
                styles.highlightChip,
                {
                  backgroundColor: task.isFavorite ? '#FFCC00' : colors.secondaryBackground,
                },
              ]}
            >
              <Star
                size={16}
                color={task.isFavorite ? '#000000' : colors.textSecondary}
                fill={task.isFavorite ? '#000000' : 'transparent'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.highlightChipText,
                  { color: task.isFavorite ? '#000000' : colors.textPrimary },
                ]}
              >
                {task.isFavorite ? 'In Favorites' : 'Add to Favorites'}
              </Text>
            </AnimatedPressable>
          </View>
        </ElevatedCard>

        {/* Priority Selector */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Priority</Text>
          <View style={styles.chipRow}>
            {(['none', 'low', 'medium', 'high', 'urgent'] as PriorityLevel[]).map((p) => (
              <AnimatedPressable
                key={p}
                profile="smallControl"
                onPress={() => updateTask(task.id, { priority: p })}
                style={[
                  styles.selectorChip,
                  {
                    backgroundColor: task.priority === p ? colors.accent : colors.secondaryBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: task.priority === p ? '#FFFFFF' : colors.textSecondary, textTransform: 'capitalize' },
                  ]}
                >
                  {p}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </ElevatedCard>

        {/* Project Selector */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Project</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => updateTask(task.id, { projectId: undefined })}
              style={[
                styles.selectorChip,
                { backgroundColor: !task.projectId ? colors.accent : colors.secondaryBackground },
              ]}
            >
              <Text style={[styles.chipText, { color: !task.projectId ? '#FFFFFF' : colors.textSecondary }]}>
                Inbox
              </Text>
            </AnimatedPressable>

            {projects.map((proj) => (
              <AnimatedPressable
                key={proj.id}
                profile="smallControl"
                onPress={() => updateTask(task.id, { projectId: proj.id })}
                style={[
                  styles.selectorChip,
                  {
                    backgroundColor: task.projectId === proj.id ? proj.color : colors.secondaryBackground,
                    marginLeft: Spacing.xs,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: task.projectId === proj.id ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {proj.name}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </ElevatedCard>

        {/* Subtasks Section */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Subtasks</Text>
          {task.subtasks.map((sub) => (
            <View key={sub.id} style={styles.subtaskRow}>
              <AnimatedPressable profile="smallControl" onPress={() => toggleSubtask(task.id, sub.id)}>
                <Check
                  size={18}
                  color={sub.completed ? colors.success : colors.textTertiary}
                  style={{ marginRight: 8 }}
                />
              </AnimatedPressable>
              <Text
                style={[
                  styles.subtaskText,
                  {
                    color: sub.completed ? colors.textTertiary : colors.textPrimary,
                    textDecorationLine: sub.completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {sub.title}
              </Text>
              <AnimatedPressable profile="smallControl" onPress={() => deleteSubtask(task.id, sub.id)} style={{ padding: 4 }}>
                <Trash2 size={14} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          ))}

          <View style={styles.addSubtaskRow}>
            <TextInput
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add a subtask..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.subtaskInput, { color: colors.textPrimary, backgroundColor: colors.secondaryBackground }]}
              onSubmitEditing={handleAddSubtask}
            />
            <AnimatedPressable profile="smallControl" onPress={handleAddSubtask} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
              <Plus size={16} color="#FFFFFF" />
            </AnimatedPressable>
          </View>
        </ElevatedCard>

        {/* Notes Area */}
        <ElevatedCard style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            placeholder="Add detailed notes..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.notesInput, { color: colors.textPrimary }]}
            multiline
          />
        </ElevatedCard>

        {/* Activity Audit Log */}
        <ElevatedCard style={styles.cardSection}>
          <View style={styles.activityHeader}>
            <History size={16} color={colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>Activity History</Text>
          </View>

          {task.activityLogs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <Text style={[styles.logText, { color: colors.textSecondary }]}>
                {log.action} · {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ElevatedCard>
      </ScrollView>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    padding: Spacing.xs,
    borderRadius: Radii.pill,
  },
  statusChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radii.pill,
  },
  highlightChipText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  titleInput: {
    ...TypographyScale.title2,
    flex: 1,
    marginLeft: Spacing.md,
    paddingTop: 0,
  },
  cardSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  selectorChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  chipText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    justifyContent: 'space-between',
  },
  subtaskText: {
    ...TypographyScale.body,
    flex: 1,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    ...TypographyScale.body,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    ...TypographyScale.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logItem: {
    paddingVertical: 2,
  },
  logText: {
    ...TypographyScale.caption1,
    textTransform: 'capitalize',
  },
});

