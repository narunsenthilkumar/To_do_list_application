import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, X, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ProjectCard } from '../../components/projects/ProjectCard';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { useResponsive, MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';

import * as Icons from 'lucide-react-native';

const PRESET_COLORS = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#FFCC00', '#34C759', '#00C7BE'];
const PRESET_ICONS = [
  'Folder',
  'ShoppingCart',
  'Plane',
  'Luggage',
  'SquareCheck',
  'Sun',
  'BookOpen',
  'Rocket',
  'House',
  'GraduationCap',
  'Code',
  'Zap',
  'User',
  'Briefcase',
  'Heart',
];

export default function ProjectsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDesktopOrLaptop } = useResponsive();
  const { projects, tasks, addProject } = useTaskora();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);

  const handleCreateProject = async () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newProj = await addProject({
      name: name.trim(),
      description: description.trim(),
      color: selectedColor,
      icon: selectedIcon,
    });
    setName('');
    setDescription('');
    setModalVisible(false);
    router.push(`/project/${newProj.id}`);
  };

  const getTaskCountsForProject = (projId: string) => {
    const projTasks = tasks.filter((t) => t.projectId === projId);
    const active = projTasks.filter((t) => !t.completed).length;
    const completed = projTasks.filter((t) => t.completed).length;
    return { active, completed };
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Projects</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {projects.length} active workspaces
              </Text>
            </View>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => setModalVisible(true)}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            </AnimatedPressable>
          </View>

          {/* Projects Grid */}
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={isDesktopOrLaptop ? styles.desktopGrid : undefined}>
              {projects.map((proj) => {
                const { active, completed } = getTaskCountsForProject(proj.id);
                return (
                  <View key={proj.id} style={isDesktopOrLaptop ? styles.desktopGridItem : undefined}>
                    <ProjectCard
                      project={proj}
                      activeTaskCount={active}
                      completedTaskCount={completed}
                      onPress={() => router.push(`/project/${proj.id}`)}
                    />
                  </View>
                );
              })}
            </View>

            {projects.length === 0 && (
              <EmptyState
                icon="folder"
                title="No projects yet"
                subtitle="Organize your tasks into projects."
              />
            )}
          </ScrollView>
        </View>
      </View>

      {/* New Project Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.elevatedCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Project</Text>
              <AnimatedPressable profile="smallControl" onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Project Name (e.g. Hackathon)"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.secondaryBackground }]}
            />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.secondaryBackground }]}
            />

            <Text style={[styles.label, { color: colors.textTertiary }]}>Color Accent</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    selectedColor === c && styles.selectedColorCircle,
                  ]}
                >
                  {selectedColor === c && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textTertiary }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScrollRow} contentContainerStyle={styles.iconScrollContent}>
              {PRESET_ICONS.map((iconName) => {
                const IconComp = (Icons as any)[iconName] || Icons.Folder;
                const isSelected = selectedIcon === iconName;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => setSelectedIcon(iconName)}
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected ? selectedColor + '25' : colors.secondaryBackground,
                        borderColor: isSelected ? selectedColor : 'transparent',
                      },
                    ]}
                  >
                    <IconComp size={18} color={isSelected ? selectedColor : colors.textSecondary} />
                  </Pressable>
                );
              })}
            </ScrollView>

            <AnimatedPressable
              profile="primaryButton"
              onPress={handleCreateProject}
              disabled={!name.trim()}
              style={[
                styles.createBtn,
                { backgroundColor: colors.accent, opacity: !name.trim() ? 0.4 : 1 },
              ]}
            >
              <Text style={styles.createBtnText}>Create Project</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
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
    paddingBottom: Spacing.sm,
  },
  title: {
    ...TypographyScale.largeTitle,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  desktopGridItem: {
    width: '48.5%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    ...TypographyScale.title3,
  },
  input: {
    ...TypographyScale.body,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  label: {
    ...TypographyScale.footnote,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorCircle: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  iconScrollRow: {
    maxHeight: 44,
    marginVertical: Spacing.xs,
  },
  iconScrollContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  createBtn: {
    height: 50,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  createBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
  },
});


