import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SlidersHorizontal, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PriorityLevel } from '../../models/task';
import { Project } from '../../models/project';
import { useTheme } from '../../store/ThemeContext';
import { FilterBottomSheet, FilterState } from './FilterBottomSheet';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';

interface InboxFiltersProps {
  filters: FilterState;
  projects: Project[];
  onUpdateFilters: (filters: FilterState) => void;
}

export const InboxFilters: React.FC<InboxFiltersProps> = ({
  filters,
  projects,
  onUpdateFilters,
}) => {
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  // Count active non-default filters
  let activeCount = 0;
  if (filters.priority !== null) activeCount++;
  if (filters.projectId !== null) activeCount++;
  if (filters.status !== 'all') activeCount++;
  if (filters.isPinned) activeCount++;
  if (filters.isFavorite) activeCount++;

  const togglePriorityChip = (p: PriorityLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateFilters({
      ...filters,
      priority: filters.priority === p ? null : p,
    });
  };

  const togglePinnedChip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateFilters({
      ...filters,
      isPinned: filters.isPinned ? null : true,
    });
  };

  const toggleFavoriteChip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateFilters({
      ...filters,
      isFavorite: filters.isFavorite ? null : true,
    });
  };

  const toggleProjectChip = (projId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateFilters({
      ...filters,
      projectId: filters.projectId === projId ? null : projId,
    });
  };

  const removeStatusFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateFilters({
      ...filters,
      status: 'all',
    });
  };

  const activeProject = projects.find((p) => p.id === filters.projectId);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Primary Filter Sheet Trigger Button */}
        <AnimatedPressable
          profile="smallControl"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSheetVisible(true);
          }}
          style={[
            styles.filterTriggerBtn,
            {
              backgroundColor: activeCount > 0 ? colors.accent : colors.secondaryBackground,
            },
          ]}
        >
          <SlidersHorizontal
            size={16}
            color={activeCount > 0 ? '#FFFFFF' : colors.textPrimary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.triggerText,
              { color: activeCount > 0 ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
          </Text>
        </AnimatedPressable>

        {/* Pinned Quick Chip */}
        <AnimatedPressable
          profile="smallControl"
          onPress={togglePinnedChip}
          style={[
            styles.chip,
            {
              backgroundColor: filters.isPinned ? colors.accent : colors.secondaryBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color: filters.isPinned ? '#FFFFFF' : colors.textSecondary,
              },
            ]}
          >
            📌 Pinned
          </Text>
          {filters.isPinned && (
            <X size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
          )}
        </AnimatedPressable>

        {/* Favorites Quick Chip */}
        <AnimatedPressable
          profile="smallControl"
          onPress={toggleFavoriteChip}
          style={[
            styles.chip,
            {
              backgroundColor: filters.isFavorite ? '#FFCC00' : colors.secondaryBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              {
                color: filters.isFavorite ? '#000000' : colors.textSecondary,
              },
            ]}
          >
            ⭐ Favorites
          </Text>
          {filters.isFavorite && (
            <X size={14} color="#000000" style={{ marginLeft: 4 }} />
          )}
        </AnimatedPressable>

        {/* Priority Quick Chips */}
        {(['high', 'urgent'] as PriorityLevel[]).map((p) => {
          const isSelected = filters.priority === p;
          return (
            <AnimatedPressable
              key={p}
              profile="smallControl"
              onPress={() => togglePriorityChip(p)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.accent : colors.secondaryBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    textTransform: 'capitalize',
                  },
                ]}
              >
                {p}
              </Text>
              {isSelected && (
                <X size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </AnimatedPressable>
          );
        })}

        {/* Project Quick Chips */}
        {projects.slice(0, 4).map((proj) => {
          const isSelected = filters.projectId === proj.id;
          return (
            <AnimatedPressable
              key={proj.id}
              profile="smallControl"
              onPress={() => toggleProjectChip(proj.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? proj.color : colors.secondaryBackground,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {proj.name}
              </Text>
              {isSelected && (
                <X size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </AnimatedPressable>
          );
        })}

        {/* Status Active Chip */}
        {filters.status !== 'all' && (
          <AnimatedPressable
            profile="smallControl"
            onPress={removeStatusFilter}
            style={[styles.chip, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.chipText, { color: '#FFFFFF', textTransform: 'capitalize' }]}>
              {filters.status}
            </Text>
            <X size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </AnimatedPressable>
        )}
      </ScrollView>

      {/* Full Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={sheetVisible}
        filters={filters}
        projects={projects}
        onClose={() => setSheetVisible(false)}
        onApplyFilters={(newFilters) => onUpdateFilters(newFilters)}
        onClearFilters={() =>
          onUpdateFilters({
            priority: null,
            projectId: null,
            status: 'all',
          })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 44,
    marginVertical: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  triggerText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  chipText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
});
