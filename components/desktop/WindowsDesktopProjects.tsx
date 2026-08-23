import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import {
  Folder,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Flag,
  ListTodo,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Project } from '../../models/project';
import { Task } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { calculateTasksProgress } from '../../utils/progress';
import { ContextMenuPosition } from './WindowsTaskContextMenu';

interface WindowsDesktopProjectsProps {
  selectedTaskId: string | null;
  initialProjectId?: string | null;
  onSelectTask: (task: Task) => void;
  onContextMenu: (task: Task, pos: ContextMenuPosition) => void;
  onOpenQuickAdd: () => void;
}

const PRESET_COLORS = [
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#00C7BE',
];

export const WindowsDesktopProjects: React.FC<WindowsDesktopProjectsProps> = ({
  selectedTaskId,
  initialProjectId,
  onSelectTask,
  onContextMenu,
  onOpenQuickAdd,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const {
    projects,
    tasks,
    addProject,
    updateProject,
    deleteProject,
    toggleTaskCompletion,
    addTask,
  } = useTaskora();

  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId || null);

  React.useEffect(() => {
    if (initialProjectId) {
      setActiveProjectId(initialProjectId);
    }
  }, [initialProjectId]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjColor, setNewProjColor] = useState(PRESET_COLORS[0]);
  const [quickTaskInput, setQuickTaskInput] = useState('');

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleCreateProject = async () => {
    if (!newProjName.trim()) return;
    const newProj = await addProject({
      name: newProjName.trim(),
      description: newProjDesc.trim(),
      color: newProjColor,
    });
    setNewProjName('');
    setNewProjDesc('');
    setCreateModalVisible(false);
    setActiveProjectId(newProj.id);
  };

  const handleAddProjectTask = async () => {
    if (!quickTaskInput.trim() || !activeProjectId) return;
    await addTask({
      title: quickTaskInput.trim(),
      projectId: activeProjectId,
      projectIds: [activeProjectId],
      inbox: false,
    });
    setQuickTaskInput('');
  };

  const renderProjectDetail = (proj: Project) => {
    const projectTasks = tasks.filter((t) =>
      t.projectIds ? t.projectIds.includes(proj.id) : t.projectId === proj.id
    );
    const stats = calculateTasksProgress(projectTasks);

    return (
      <View style={styles.projectDetailContainer}>
        {/* Back navigation & Project Title */}
        <View style={styles.detailHeader}>
          <Pressable
            style={({ hovered }: any) => [
              styles.backButton,
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={() => setActiveProjectId(null)}
          >
            <ArrowLeft size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>All Projects</Text>
          </Pressable>

          <Pressable
            style={({ hovered }: any) => [
              styles.deleteProjBtn,
              hovered && { backgroundColor: 'rgba(255, 59, 48, 0.15)' },
            ]}
            onPress={() => {
              deleteProject(proj.id);
              setActiveProjectId(null);
            }}
          >
            <Trash2 size={14} color={colors.error} style={{ marginRight: 4 }} />
            <Text style={[styles.deleteProjBtnText, { color: colors.error }]}>Delete Project</Text>
          </Pressable>
        </View>

        {/* Project Banner Card */}
        <View
          style={[
            styles.projectBanner,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
            Shadows.subtle,
          ]}
        >
          <View style={styles.bannerLeft}>
            <View style={[styles.bannerColorBlock, { backgroundColor: proj.color || colors.accent }]} />
            <View>
              <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>{proj.name}</Text>
              {proj.description ? (
                <Text style={[styles.bannerDesc, { color: colors.textTertiary }]}>{proj.description}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.bannerStats}>
            <Text style={[styles.bannerStatValue, { color: proj.color || colors.accent }]}>
              {stats.progressPercent}%
            </Text>
            <Text style={[styles.bannerStatLabel, { color: colors.textTertiary }]}>
              {stats.completedCount} of {stats.totalCount} completed
            </Text>
          </View>
        </View>

        {/* Quick add within project */}
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
          <Plus size={16} color={proj.color || colors.accent} style={{ marginRight: Spacing.sm }} />
          <TextInput
            style={[styles.inlineInput, { color: colors.textPrimary }]}
            placeholder={`Add task to ${proj.name}... (Press Enter)`}
            placeholderTextColor={colors.textTertiary}
            value={quickTaskInput}
            onChangeText={setQuickTaskInput}
            onSubmitEditing={handleAddProjectTask}
            returnKeyType="done"
          />
          {quickTaskInput.trim().length > 0 && (
            <Pressable
              style={[styles.inlineSaveBtn, { backgroundColor: proj.color || colors.accent }]}
              onPress={handleAddProjectTask}
            >
              <Text style={styles.inlineSaveBtnText}>Add</Text>
            </Pressable>
          )}
        </View>

        {/* Tasks in this project */}
        {projectTasks.length === 0 ? (
          <View style={styles.emptyProjectState}>
            <ListTodo size={36} color={colors.textTertiary} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Tasks in this Project</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              Add tasks using the input above or assign existing tasks to this project.
            </Text>
          </View>
        ) : (
          <View style={styles.taskGrid}>
            {projectTasks.map((t) => {
              const isSelected = selectedTaskId === t.id;
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

                  <View style={styles.taskContent}>
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
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {activeProject ? (
        renderProjectDetail(activeProject)
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Projects</Text>
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
                {projects.length} active {projects.length === 1 ? 'workspace' : 'workspaces'}
              </Text>
            </View>

            <Pressable
              style={({ hovered }: any) => [
                styles.addBtn,
                { backgroundColor: colors.accent },
                hovered && { opacity: 0.9 },
                Shadows.subtle,
              ]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.addBtnText}>New Project</Text>
            </Pressable>
          </View>

          {/* Project Workspaces Grid */}
          <View style={styles.projectsGrid}>
            {projects.map((p) => {
              const projectTasks = tasks.filter((t) =>
                t.projectIds ? t.projectIds.includes(p.id) : t.projectId === p.id
              );
              const stats = calculateTasksProgress(projectTasks);
              const projColor = p.color || colors.accent;

              return (
                <Pressable
                  key={p.id}
                  style={({ hovered }: any) => [
                    styles.projectCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    },
                    hovered && {
                      borderColor: projColor,
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.02)',
                    },
                    Shadows.subtle,
                  ]}
                  onPress={() => setActiveProjectId(p.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: projColor + '20' }]}>
                      <Folder size={18} color={projColor} />
                    </View>
                    <View style={[styles.taskCountBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <Text style={[styles.taskCountText, { color: colors.textSecondary }]}>
                        {projectTasks.length} tasks
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.description ? (
                    <Text style={[styles.cardDesc, { color: colors.textTertiary }]} numberOfLines={2}>
                      {p.description}
                    </Text>
                  ) : (
                    <Text style={[styles.cardDesc, { color: colors.textTertiary }]}>No description</Text>
                  )}

                  <View style={styles.cardFooter}>
                    <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${stats.progressPercent}%`,
                            backgroundColor: projColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textTertiary }]}>
                      {stats.progressPercent}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Create Project Modal */}
      <Modal transparent visible={createModalVisible} onRequestClose={() => setCreateModalVisible(false)} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateModalVisible(false)}>
          <Pressable
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? 'rgba(26, 26, 34, 0.98)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
              },
              Shadows.floating,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create Workspace / Project</Text>
              <Pressable onPress={() => setCreateModalVisible(false)}>
                <X size={16} color={colors.textTertiary} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textTertiary }]}>PROJECT NAME</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.accent }]}
                placeholder="e.g. Work, Personal, Marketing Q3"
                placeholderTextColor={colors.textTertiary}
                value={newProjName}
                onChangeText={setNewProjName}
                autoFocus
              />

              <Text style={[styles.inputLabel, { color: colors.textTertiary, marginTop: Spacing.md }]}>
                DESCRIPTION (OPTIONAL)
              </Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                placeholder="Brief project goals or scope..."
                placeholderTextColor={colors.textTertiary}
                value={newProjDesc}
                onChangeText={setNewProjDesc}
              />

              <Text style={[styles.inputLabel, { color: colors.textTertiary, marginTop: Spacing.md }]}>
                ACCENT COLOR
              </Text>
              <View style={styles.colorPalette}>
                {PRESET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorChoice,
                      { backgroundColor: c },
                      newProjColor === c && styles.selectedColorChoice,
                    ]}
                    onPress={() => setNewProjColor(c)}
                  >
                    {newProjColor === c && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalCancelBtn]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: newProjName.trim() ? colors.accent : colors.textQuaternary },
                ]}
                disabled={!newProjName.trim()}
                onPress={handleCreateProject}
              >
                <Text style={styles.modalSubmitBtnText}>Create Project</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    marginBottom: Spacing.xl,
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
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  projectCard: {
    width: '48%',
    minWidth: 260,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskCountText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  cardTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    ...TypographyScale.caption1,
    marginBottom: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    width: 32,
    textAlign: 'right',
  },
  projectDetailContainer: {
    width: '100%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  backButtonText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  deleteProjBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  deleteProjBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  projectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerColorBlock: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginRight: Spacing.md,
  },
  bannerTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  bannerDesc: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  bannerStats: {
    alignItems: 'flex-end',
  },
  bannerStatValue: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  bannerStatLabel: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  inlineAddBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
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
  emptyProjectState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  emptySub: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 4,
  },
  taskGrid: {
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
  taskTitle: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalDialog: {
    width: '90%',
    maxWidth: 480,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  modalBody: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    ...TypographyScale.body,
    borderWidth: 1,
    borderRadius: Radii.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    outlineStyle: 'none',
  } as any,
  colorPalette: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  colorChoice: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  selectedColorChoice: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  modalCancelBtnText: {
    ...TypographyScale.subhead,
    fontWeight: '500',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer' as any,
  },
  modalSubmitBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
