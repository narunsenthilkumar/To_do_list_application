import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { X, Check, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PriorityLevel } from '../../models/task';
import { Project } from '../../models/project';
import { useTheme } from '../../store/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';

export interface FilterState {
  priority: PriorityLevel | null;
  projectId: string | null;
  status: 'all' | 'active' | 'completed';
  isPinned?: boolean | null;
  isFavorite?: boolean | null;
}

interface FilterBottomSheetProps {
  visible: boolean;
  filters: FilterState;
  projects: Project[];
  onClose: () => void;
  onApplyFilters: (newFilters: FilterState) => void;
  onClearFilters: () => void;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  filters,
  projects,
  onClose,
  onApplyFilters,
  onClearFilters,
}) => {
  const { colors, isDark } = useTheme();
  const [draftFilters, setDraftFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setDraftFilters(filters);
  }, [filters, visible]);

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApplyFilters(draftFilters);
    onClose();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClearFilters();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.modalBackdrop }]}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
              borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Filter Tasks</Text>
            <AnimatedPressable profile="smallControl" onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textTertiary} />
            </AnimatedPressable>
          </View>

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Highlights & Importance */}
            <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>IMPORTANCE & PINNED</Text>
            <View style={styles.optionsRow}>
              {/* Pinned */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDraftFilters((prev) => ({
                    ...prev,
                    isPinned: prev.isPinned ? null : true,
                  }));
                }}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: draftFilters.isPinned ? colors.accent : colors.secondaryBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: draftFilters.isPinned ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  📌 Pinned Only
                </Text>
                {draftFilters.isPinned && <Check size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
              </Pressable>

              {/* Favorites */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDraftFilters((prev) => ({
                    ...prev,
                    isFavorite: prev.isFavorite ? null : true,
                  }));
                }}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: draftFilters.isFavorite ? '#FFCC00' : colors.secondaryBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: draftFilters.isFavorite ? '#000000' : colors.textPrimary },
                  ]}
                >
                  ⭐ Favorites Only
                </Text>
                {draftFilters.isFavorite && <Check size={16} color="#000000" style={{ marginLeft: 6 }} />}
              </Pressable>
            </View>

            {/* Priority Section */}
            <Text style={[styles.groupTitle, { color: colors.textTertiary, marginTop: Spacing.lg }]}>PRIORITY</Text>
            <View style={styles.optionsRow}>
              {(['high', 'urgent'] as PriorityLevel[]).map((p) => {
                const isSelected = draftFilters.priority === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraftFilters((prev) => ({
                        ...prev,
                        priority: prev.priority === p ? null : p,
                      }));
                    }}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.secondaryBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary, textTransform: 'capitalize' },
                      ]}
                    >
                      {p} Priority
                    </Text>
                    {isSelected && <Check size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Status Section */}
            <Text style={[styles.groupTitle, { color: colors.textTertiary, marginTop: Spacing.lg }]}>STATUS</Text>
            <View style={styles.optionsRow}>
              {[
                { key: 'all', label: 'All Tasks' },
                { key: 'active', label: 'Active Only' },
                { key: 'completed', label: 'Completed Only' },
              ].map((item) => {
                const isSelected = draftFilters.status === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraftFilters((prev) => ({
                        ...prev,
                        status: item.key as any,
                      }));
                    }}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.secondaryBackground,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                      {item.label}
                    </Text>
                    {isSelected && <Check size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Projects Section */}
            {projects.length > 0 && (
              <>
                <Text style={[styles.groupTitle, { color: colors.textTertiary, marginTop: Spacing.lg }]}>
                  PROJECT WORKSPACE
                </Text>
                <View style={styles.optionsRow}>
                  {projects.map((proj) => {
                    const isSelected = draftFilters.projectId === proj.id;
                    return (
                      <Pressable
                        key={proj.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDraftFilters((prev) => ({
                            ...prev,
                            projectId: prev.projectId === proj.id ? null : proj.id,
                          }));
                        }}
                        style={[
                          styles.optionChip,
                          {
                            backgroundColor: isSelected ? proj.color : colors.secondaryBackground,
                          },
                        ]}
                      >
                        <Text style={[styles.optionText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {proj.name}
                        </Text>
                        {isSelected && <Check size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer CTA Actions */}
          <View style={styles.sheetFooter}>
            <AnimatedPressable
              profile="smallControl"
              onPress={handleClear}
              style={[styles.clearBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <RotateCcw size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.clearBtnText, { color: colors.textPrimary }]}>Clear All</Text>
            </AnimatedPressable>

            <AnimatedPressable
              profile="primaryButton"
              onPress={handleApply}
              style={[styles.applyBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    maxHeight: '80%',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    ...TypographyScale.title2,
    fontWeight: '700',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  sheetBody: {
    marginVertical: Spacing.sm,
  },
  groupTitle: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    borderRadius: Radii.pill,
  },
  optionText: {
    ...TypographyScale.callout,
    fontWeight: '600',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: Radii.lg,
  },
  clearBtnText: {
    ...TypographyScale.callout,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
  },
});
