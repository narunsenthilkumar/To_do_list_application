import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Search,
  X,
  Check,
  Star,
  Pin,
  Flag,
  Calendar,
  Inbox,
  Folder,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task, PriorityLevel } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { getTodayDateString } from '../../services/storage/repository';

export type FilterStatus = 'all' | 'incomplete' | 'completed';
export type FilterSmartDate = 'all' | 'today' | 'upcoming' | 'overdue';
export type FilterOrg = 'all' | 'inbox' | 'favorites' | 'pinned' | string; // string is projectId
export type FilterPriority = 'all' | PriorityLevel;

export interface DesktopFilterState {
  status: FilterStatus;
  smartDate: FilterSmartDate;
  org: FilterOrg;
  priority: FilterPriority;
  searchQuery: string;
}

export const DEFAULT_FILTER_STATE: DesktopFilterState = {
  status: 'all',
  smartDate: 'all',
  org: 'all',
  priority: 'all',
  searchQuery: '',
};

interface WindowsDesktopFilterBarProps {
  filterState: DesktopFilterState;
  onChangeFilterState: (next: DesktopFilterState) => void;
  placeholder?: string;
}

export const WindowsDesktopFilterBar: React.FC<WindowsDesktopFilterBarProps> = ({
  filterState,
  onChangeFilterState,
  placeholder = 'Search tasks...',
}) => {
  const { colors, isDark } = useTheme();
  const { projects } = useTaskora();
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const activeChips: { id: string; label: string; onRemove: () => void }[] = [];

  if (filterState.status === 'incomplete') {
    activeChips.push({
      id: 'status-incomplete',
      label: 'Incomplete',
      onRemove: () => onChangeFilterState({ ...filterState, status: 'all' }),
    });
  } else if (filterState.status === 'completed') {
    activeChips.push({
      id: 'status-completed',
      label: 'Completed',
      onRemove: () => onChangeFilterState({ ...filterState, status: 'all' }),
    });
  }

  if (filterState.smartDate === 'today') {
    activeChips.push({
      id: 'date-today',
      label: 'Today',
      onRemove: () => onChangeFilterState({ ...filterState, smartDate: 'all' }),
    });
  } else if (filterState.smartDate === 'upcoming') {
    activeChips.push({
      id: 'date-upcoming',
      label: 'Upcoming',
      onRemove: () => onChangeFilterState({ ...filterState, smartDate: 'all' }),
    });
  } else if (filterState.smartDate === 'overdue') {
    activeChips.push({
      id: 'date-overdue',
      label: 'Overdue',
      onRemove: () => onChangeFilterState({ ...filterState, smartDate: 'all' }),
    });
  }

  if (filterState.org === 'favorites') {
    activeChips.push({
      id: 'org-fav',
      label: '★ Favourites',
      onRemove: () => onChangeFilterState({ ...filterState, org: 'all' }),
    });
  } else if (filterState.org === 'pinned') {
    activeChips.push({
      id: 'org-pinned',
      label: '📌 Pinned',
      onRemove: () => onChangeFilterState({ ...filterState, org: 'all' }),
    });
  } else if (filterState.org === 'inbox') {
    activeChips.push({
      id: 'org-inbox',
      label: 'Inbox',
      onRemove: () => onChangeFilterState({ ...filterState, org: 'all' }),
    });
  } else if (filterState.org !== 'all') {
    const proj = projects.find((p) => p.id === filterState.org);
    if (proj) {
      activeChips.push({
        id: 'org-proj',
        label: `Project: ${proj.name}`,
        onRemove: () => onChangeFilterState({ ...filterState, org: 'all' }),
      });
    }
  }

  if (filterState.priority !== 'all') {
    activeChips.push({
      id: 'priority',
      label: `Priority: ${filterState.priority.toUpperCase()}`,
      onRemove: () => onChangeFilterState({ ...filterState, priority: 'all' }),
    });
  }

  const handleClearAll = () => {
    onChangeFilterState({
      ...DEFAULT_FILTER_STATE,
      searchQuery: filterState.searchQuery, // keep search query if user was typing
    });
  };

  return (
    <View style={styles.barContainer}>
      {/* Main Toolbar Row */}
      <View
        style={[
          styles.searchFilterRow,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        {/* Search Input Box */}
        <View style={styles.searchInputWrapper}>
          <Search size={15} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            value={filterState.searchQuery}
            onChangeText={(text) => onChangeFilterState({ ...filterState, searchQuery: text })}
          />
          {filterState.searchQuery.length > 0 && (
            <Pressable
              onPress={() => onChangeFilterState({ ...filterState, searchQuery: '' })}
              style={styles.clearSearchBtn}
            >
              <X size={12} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* Filter Trigger Button */}
        <Pressable
          style={({ hovered }: any) => [
            styles.filterTriggerBtn,
            activeChips.length > 0 && {
              backgroundColor: colors.accent + '20',
              borderColor: colors.accent,
            },
            { borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' },
            hovered && { opacity: 0.85 },
          ]}
          onPress={() => setFilterModalOpen(true)}
        >
          <SlidersHorizontal
            size={14}
            color={activeChips.length > 0 ? colors.accent : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.filterTriggerText,
              { color: activeChips.length > 0 ? colors.accent : colors.textPrimary },
            ]}
          >
            Filters {activeChips.length > 0 ? `(${activeChips.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Active Filter Chips Row */}
      {activeChips.length > 0 && (
        <View style={styles.chipsRow}>
          <Text style={[styles.activeFilterLabel, { color: colors.textTertiary }]}>ACTIVE:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {activeChips.map((chip) => (
              <View
                key={chip.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
                    borderColor: colors.accent + '40',
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.accent }]}>{chip.label}</Text>
                <Pressable style={styles.chipRemoveBtn} onPress={chip.onRemove}>
                  <X size={12} color={colors.accent} />
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.clearAllBtn} onPress={handleClearAll}>
              <Text style={[styles.clearAllText, { color: colors.textTertiary }]}>Clear Filters</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Multi-Criteria Filter Dropdown Modal */}
      <Modal
        transparent
        visible={filterModalOpen}
        onRequestClose={() => setFilterModalOpen(false)}
        animationType="fade"
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalOpen(false)}>
          <Pressable
            style={[
              styles.filterModalCard,
              {
                backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
              },
              Shadows.floating,
            ]}
            onPress={(e: any) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={styles.modalTitleRow}>
                <SlidersHorizontal size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Smart Multi-Filters</Text>
              </View>

              <Pressable style={styles.modalCloseBtn} onPress={() => setFilterModalOpen(false)}>
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Section 1: Completion Status */}
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>STATUS</Text>
                <View style={styles.filterOptionsGrid}>
                  {[
                    { id: 'all', label: 'All Tasks' },
                    { id: 'incomplete', label: 'Incomplete' },
                    { id: 'completed', label: 'Completed' },
                  ].map((opt) => {
                    const isSelected = filterState.status === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[
                          styles.optionPill,
                          isSelected && {
                            backgroundColor: colors.accent,
                            borderColor: colors.accent,
                          },
                          { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        ]}
                        onPress={() => onChangeFilterState({ ...filterState, status: opt.id as FilterStatus })}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Section 2: Smart Due Dates */}
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>SMART SCHEDULE</Text>
                <View style={styles.filterOptionsGrid}>
                  {[
                    { id: 'all', label: 'Any Date' },
                    { id: 'today', label: 'Today' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'overdue', label: 'Overdue' },
                  ].map((opt) => {
                    const isSelected = filterState.smartDate === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[
                          styles.optionPill,
                          isSelected && {
                            backgroundColor: colors.accent,
                            borderColor: colors.accent,
                          },
                          { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        ]}
                        onPress={() => onChangeFilterState({ ...filterState, smartDate: opt.id as FilterSmartDate })}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Section 3: Organization & Highlights */}
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ORGANIZATION</Text>
                <View style={styles.filterOptionsGrid}>
                  {[
                    { id: 'all', label: 'All Places' },
                    { id: 'inbox', label: 'Inbox' },
                    { id: 'favorites', label: '★ Favourites' },
                    { id: 'pinned', label: '📌 Pinned' },
                  ].map((opt) => {
                    const isSelected = filterState.org === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[
                          styles.optionPill,
                          isSelected && {
                            backgroundColor: colors.accent,
                            borderColor: colors.accent,
                          },
                          { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        ]}
                        onPress={() => onChangeFilterState({ ...filterState, org: opt.id as FilterOrg })}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Projects picker pills */}
                {projects.length > 0 && (
                  <View style={{ marginTop: Spacing.sm }}>
                    <Text style={[styles.subSectionTitle, { color: colors.textTertiary }]}>Filter by Project:</Text>
                    <View style={styles.filterOptionsGrid}>
                      {projects.map((proj) => {
                        const isSelected = filterState.org === proj.id;
                        return (
                          <Pressable
                            key={proj.id}
                            style={[
                              styles.optionPill,
                              isSelected && {
                                backgroundColor: proj.color || colors.accent,
                                borderColor: proj.color || colors.accent,
                              },
                              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                            ]}
                            onPress={() =>
                              onChangeFilterState({
                                ...filterState,
                                org: isSelected ? 'all' : proj.id,
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                              ]}
                            >
                              {proj.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Section 4: Priority */}
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PRIORITY</Text>
                <View style={styles.filterOptionsGrid}>
                  {[
                    { id: 'all', label: 'All Priorities' },
                    { id: 'urgent', label: 'Urgent' },
                    { id: 'high', label: 'High' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'low', label: 'Low' },
                  ].map((opt) => {
                    const isSelected = filterState.priority === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[
                          styles.optionPill,
                          isSelected && {
                            backgroundColor: colors.accent,
                            borderColor: colors.accent,
                          },
                          { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        ]}
                        onPress={() => onChangeFilterState({ ...filterState, priority: opt.id as FilterPriority })}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={[styles.modalFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Pressable style={styles.footerClearBtn} onPress={handleClearAll}>
                <Text style={[styles.footerClearText, { color: colors.textSecondary }]}>Clear All</Text>
              </Pressable>

              <Pressable
                style={[styles.footerDoneBtn, { backgroundColor: colors.accent }]}
                onPress={() => setFilterModalOpen(false)}
              >
                <Text style={styles.footerDoneText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export const applyTaskFilters = (tasks: Task[], state: DesktopFilterState): Task[] => {
  const todayStr = getTodayDateString();

  return tasks.filter((t) => {
    // 1. Status Filter
    if (state.status === 'incomplete' && t.completed) return false;
    if (state.status === 'completed' && !t.completed) return false;

    // 2. Smart Due Date Filter
    if (state.smartDate === 'today' && t.dueDate !== todayStr) return false;
    if (state.smartDate === 'upcoming' && (!t.dueDate || t.dueDate <= todayStr)) return false;
    if (state.smartDate === 'overdue' && (!t.dueDate || t.dueDate >= todayStr || t.completed)) return false;

    // 3. Organization Filter
    if (state.org === 'inbox' && !t.inbox) return false;
    if (state.org === 'favorites' && !t.isFavorite) return false;
    if (state.org === 'pinned' && !t.isPinned) return false;
    if (state.org !== 'all' && state.org !== 'inbox' && state.org !== 'favorites' && state.org !== 'pinned') {
      const inProject = t.projectIds ? t.projectIds.includes(state.org) : t.projectId === state.org;
      if (!inProject) return false;
    }

    // 4. Priority Filter
    if (state.priority !== 'all' && t.priority !== state.priority) return false;

    // 5. Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
      const matchesTags = t.tags ? t.tags.some((tag) => tag.toLowerCase().includes(q)) : false;
      if (!matchesTitle && !matchesNotes && !matchesTags) return false;
    }

    return true;
  });
};

const styles = StyleSheet.create({
  barContainer: {
    marginBottom: Spacing.md,
    gap: Spacing.xs + 2,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...TypographyScale.footnote,
    paddingVertical: 4,
  },
  clearSearchBtn: {
    padding: 4,
    cursor: 'pointer' as any,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  filterTriggerText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  activeFilterLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  chipRemoveBtn: {
    padding: 2,
    cursor: 'pointer' as any,
  },
  clearAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    cursor: 'pointer' as any,
  },
  clearAllText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  filterModalCard: {
    width: 440,
    maxHeight: '80%',
    borderRadius: Radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
    cursor: 'pointer' as any,
  },
  modalScrollBody: {
    padding: Spacing.lg,
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  optionPillText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  footerClearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    cursor: 'pointer' as any,
  },
  footerClearText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  footerDoneBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    cursor: 'pointer' as any,
  },
  footerDoneText: {
    ...TypographyScale.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
