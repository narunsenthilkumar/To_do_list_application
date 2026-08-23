import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Folder, Inbox, Plus, X, Check, Search, ChevronDown } from 'lucide-react-native';
import { Project } from '../../models/project';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { haptics } from '../../services/haptics';

interface TaskDestinationSelectorProps {
  selectedProjectIds: string[];
  inbox: boolean;
  projects: Project[];
  onToggleInbox: (inbox: boolean) => void;
  onSelectProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onSetProjectIds?: (projectIds: string[]) => void;
  compact?: boolean;
}

export const TaskDestinationSelector: React.FC<TaskDestinationSelectorProps> = ({
  selectedProjectIds,
  inbox,
  projects,
  onToggleInbox,
  onSelectProject,
  onRemoveProject,
  onSetProjectIds,
  compact = false,
}) => {
  const { colors, isDark } = useTheme();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedProjects = projects.filter((p) => selectedProjectIds.includes(p.id));
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleProject = (projectId: string) => {
    haptics.selection();
    if (selectedProjectIds.includes(projectId)) {
      onRemoveProject(projectId);
    } else {
      onSelectProject(projectId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Inbox Checkbox Toggle */}
      <Pressable
        style={({ hovered }: any) => [
          styles.inboxRow,
          {
            backgroundColor: inbox
              ? isDark
                ? 'rgba(0, 122, 255, 0.12)'
                : 'rgba(0, 122, 255, 0.08)'
              : colors.secondaryBackground,
            borderColor: inbox ? colors.accent : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          hovered && { opacity: 0.9 },
        ]}
        onPress={() => {
          haptics.selection();
          onToggleInbox(!inbox);
        }}
      >
        <View
          style={[
            styles.checkboxBox,
            {
              backgroundColor: inbox ? colors.accent : 'transparent',
              borderColor: inbox ? colors.accent : colors.textTertiary,
            },
          ]}
        >
          {inbox && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </View>

        <Inbox size={15} color={inbox ? colors.accent : colors.textSecondary} style={{ marginRight: 6 }} />
        <Text
          style={[
            styles.inboxLabel,
            {
              color: inbox ? colors.accent : colors.textPrimary,
              fontWeight: inbox ? '700' : '500',
            },
          ]}
        >
          Inbox
        </Text>
        <Text style={[styles.inboxHint, { color: colors.textTertiary }]}>
          {inbox ? '(Included in Inbox feed)' : '(Not in Inbox)'}
        </Text>
      </Pressable>

      {/* Projects Section */}
      <View style={styles.projectsSection}>
        <View style={styles.projectsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            PROJECTS {selectedProjectIds.length > 0 ? `(${selectedProjectIds.length})` : ''}
          </Text>

          <Pressable
            style={({ hovered }: any) => [
              styles.addProjectBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.08)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 122, 255, 0.2)',
              },
              hovered && { opacity: 0.9 },
            ]}
            onPress={() => {
              haptics.selection();
              setPickerVisible(true);
            }}
          >
            <Plus size={13} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.addProjectBtnText, { color: colors.accent }]}>
              {selectedProjectIds.length === 0 ? 'Select Projects' : 'Add Project'}
            </Text>
            <ChevronDown size={12} color={colors.accent} style={{ marginLeft: 4 }} />
          </Pressable>
        </View>

        {/* Selected Project Chips */}
        {selectedProjects.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContainer}
          >
            {selectedProjects.map((proj) => (
              <View
                key={proj.id}
                style={[
                  styles.projectChip,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: proj.color || colors.accent,
                  },
                ]}
              >
                <View
                  style={[
                    styles.chipColorDot,
                    { backgroundColor: proj.color || colors.accent },
                  ]}
                />
                <Text style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {proj.name}
                </Text>
                <Pressable
                  style={styles.chipRemoveBtn}
                  onPress={() => {
                    haptics.selection();
                    onRemoveProject(proj.id);
                  }}
                  hitSlop={6}
                >
                  <X size={12} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={[styles.noProjectsText, { color: colors.textTertiary }]}>
            No projects assigned. (Task will only appear in chosen destinations)
          </Text>
        )}
      </View>

      {/* Multi-Project Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable
            style={[
              styles.modalDialog,
              {
                backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
              },
              Shadows.floating,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dialogHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Folder size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.dialogTitle, { color: colors.textPrimary }]}>
                  Select Projects
                </Text>
              </View>
              <Pressable style={styles.dialogCloseBtn} onPress={() => setPickerVisible(false)}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              <Search size={14} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search projects..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            {/* Project List with Multi-Select Checkmarks */}
            <ScrollView style={styles.projectListScroll} keyboardShouldPersistTaps="handled">
              {filteredProjects.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={[styles.emptyListText, { color: colors.textTertiary }]}>
                    {projects.length === 0 ? 'No projects exist yet.' : 'No matching projects.'}
                  </Text>
                </View>
              ) : (
                filteredProjects.map((proj) => {
                  const isSelected = selectedProjectIds.includes(proj.id);
                  return (
                    <Pressable
                      key={proj.id}
                      style={({ hovered }: any) => [
                        styles.projectRow,
                        isSelected && {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 122, 255, 0.08)',
                        },
                        hovered && !isSelected && {
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(0, 0, 0, 0.03)',
                        },
                      ]}
                      onPress={() => toggleProject(proj.id)}
                    >
                      <View
                        style={[
                          styles.projectRowDot,
                          { backgroundColor: proj.color || colors.accent },
                        ]}
                      />
                      <Text
                        style={[
                          styles.projectRowName,
                          {
                            color: colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {proj.name}
                      </Text>

                      <View
                        style={[
                          styles.rowCheckbox,
                          {
                            backgroundColor: isSelected ? colors.accent : 'transparent',
                            borderColor: isSelected ? colors.accent : colors.textTertiary,
                          },
                        ]}
                      >
                        {isSelected && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {/* Dialog Footer */}
            <View style={styles.dialogFooter}>
              <Text style={[styles.footerSummary, { color: colors.textTertiary }]}>
                {selectedProjectIds.length === 0
                  ? 'No projects selected'
                  : `${selectedProjectIds.length} project${selectedProjectIds.length > 1 ? 's' : ''} selected`}
              </Text>
              <Pressable
                style={[styles.doneBtn, { backgroundColor: colors.accent }]}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.sm,
  },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  inboxLabel: {
    ...TypographyScale.subhead,
  },
  inboxHint: {
    ...TypographyScale.caption2,
    marginLeft: Spacing.xs,
  },
  projectsSection: {
    gap: 6,
  },
  projectsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  addProjectBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  chipsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: 6,
  },
  chipColorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chipText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    maxWidth: 140,
  },
  chipRemoveBtn: {
    padding: 2,
    cursor: 'pointer' as any,
  },
  noProjectsText: {
    ...TypographyScale.caption2,
    fontStyle: 'italic',
    paddingVertical: 2,
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
    maxWidth: 400,
    maxHeight: 460,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    zIndex: 10000,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dialogTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  dialogCloseBtn: {
    padding: 4,
    cursor: 'pointer' as any,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...TypographyScale.subhead,
    paddingVertical: 0,
  },
  projectListScroll: {
    maxHeight: 240,
  },
  emptyList: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyListText: {
    ...TypographyScale.subhead,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    borderRadius: Radii.xs,
    marginBottom: 2,
    cursor: 'pointer' as any,
  },
  projectRowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  projectRowName: {
    flex: 1,
    ...TypographyScale.subhead,
  },
  rowCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerSummary: {
    ...TypographyScale.caption2,
  },
  doneBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  doneBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
