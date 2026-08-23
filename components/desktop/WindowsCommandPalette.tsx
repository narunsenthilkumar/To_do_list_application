import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Search,
  Plus,
  Calendar,
  Folder,
  Clock,
  Settings,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  CheckCircle2,
  Trash2,
  Sparkles,
  Command,
  ArrowRight,
  Target,
  Globe,
  Star,
  X,
} from 'lucide-react-native';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task } from '../../models/task';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { ExportService } from '../../backup/ExportService';

interface WindowsCommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onOpenQuickAdd: () => void;
  onSelectTask: (task: Task) => void;
  onOpenScreenSaver: () => void;
  onOpenImport: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions' | 'Theme' | 'Data' | 'Tasks';
  icon: any;
  action: () => void;
  shortcut?: string;
}

export const WindowsCommandPalette: React.FC<WindowsCommandPaletteProps> = ({
  visible,
  onClose,
  onNavigate,
  onOpenQuickAdd,
  onSelectTask,
  onOpenScreenSaver,
  onOpenImport,
}) => {
  const { colors, isDark, mode, setThemeMode } = useTheme();
  const { tasks, completedTasks, bulkDeleteTasks, startTimer } = useTaskora();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [visible]);

  // Static commands list
  const baseCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: 'nav-today',
        title: 'Go to Today',
        subtitle: 'View today’s agenda and progress',
        category: 'Navigation',
        icon: <Calendar size={16} color={colors.accent} />,
        shortcut: 'Ctrl+1',
        action: () => {
          onNavigate('today');
          onClose();
        },
      },
      {
        id: 'nav-inbox',
        title: 'Go to Inbox',
        subtitle: 'View unsorted and incoming tasks',
        category: 'Navigation',
        icon: <Folder size={16} color="#5856D6" />,
        shortcut: 'Ctrl+2',
        action: () => {
          onNavigate('inbox');
          onClose();
        },
      },
      {
        id: 'nav-projects',
        title: 'Go to Projects',
        subtitle: 'Manage workspaces and lists',
        category: 'Navigation',
        icon: <Folder size={16} color="#FF9500" />,
        shortcut: 'Ctrl+3',
        action: () => {
          onNavigate('projects');
          onClose();
        },
      },
      {
        id: 'nav-calendar',
        title: 'Go to Calendar',
        subtitle: 'Schedule and plan across timeline',
        category: 'Navigation',
        icon: <Calendar size={16} color="#34C759" />,
        shortcut: 'Ctrl+4',
        action: () => {
          onNavigate('calendar');
          onClose();
        },
      },
      {
        id: 'nav-focus',
        title: 'Go to Focus Timer',
        subtitle: 'Start a Pomodoro deep work session',
        category: 'Navigation',
        icon: <Target size={16} color="#FF2D55" />,
        shortcut: 'Ctrl+5',
        action: () => {
          onNavigate('focus');
          onClose();
        },
      },
      {
        id: 'nav-sync',
        title: 'Go to Sync & Devices',
        subtitle: 'Pair devices & view sync state',
        category: 'Navigation',
        icon: <RefreshCw size={16} color={colors.accent} />,
        action: () => {
          onNavigate('sync');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        title: 'Go to Settings',
        subtitle: 'Configure preferences & appearance',
        category: 'Navigation',
        icon: <Settings size={16} color={colors.textSecondary} />,
        shortcut: 'Ctrl+,',
        action: () => {
          onNavigate('settings');
          onClose();
        },
      },

      // Actions
      {
        id: 'act-new-task',
        title: 'Create New Task',
        subtitle: 'Open smart natural language input',
        category: 'Actions',
        icon: <Plus size={16} color={colors.accent} />,
        shortcut: 'Ctrl+N',
        action: () => {
          onClose();
          onOpenQuickAdd();
        },
      },
      {
        id: 'act-start-focus',
        title: 'Start Deep Focus Session',
        subtitle: 'Begin 25-minute Pomodoro timer',
        category: 'Actions',
        icon: <Target size={16} color="#FF9500" />,
        action: () => {
          startTimer('Deep Focus');
          onNavigate('focus');
          onClose();
        },
      },
      {
        id: 'act-screensaver',
        title: 'Launch Screen Saver',
        subtitle: 'Enter ambient idle mode',
        category: 'Actions',
        icon: <Sparkles size={16} color="#5856D6" />,
        action: () => {
          onClose();
          onOpenScreenSaver();
        },
      },

      // Theme
      {
        id: 'thm-light',
        title: 'Switch to Light Theme',
        subtitle: 'Apple-inspired clean light surface',
        category: 'Theme',
        icon: <Sun size={16} color="#FF9500" />,
        action: () => {
          setThemeMode('light');
          onClose();
        },
      },
      {
        id: 'thm-dark',
        title: 'Switch to Dark Theme',
        subtitle: 'Deep OLED & night workspace',
        category: 'Theme',
        icon: <Moon size={16} color="#5856D6" />,
        action: () => {
          setThemeMode('dark');
          onClose();
        },
      },
      {
        id: 'thm-system',
        title: 'Use System Theme',
        subtitle: 'Sync automatically with Windows mode',
        category: 'Theme',
        icon: <Monitor size={16} color={colors.accent} />,
        action: () => {
          setThemeMode('system');
          onClose();
        },
      },

      // Data Backup
      {
        id: 'dat-export',
        title: 'Export Backup JSON',
        subtitle: 'Save offline backup file to disk',
        category: 'Data',
        icon: <Download size={16} color="#34C759" />,
        action: async () => {
          onClose();
          await ExportService.exportJSON();
        },
      },
      {
        id: 'dat-import',
        title: 'Import Backup JSON',
        subtitle: 'Restore tasks and projects from backup',
        category: 'Data',
        icon: <Upload size={16} color="#007AFF" />,
        action: () => {
          onClose();
          onOpenImport();
        },
      },
    ];

    return list;
  }, [colors, onNavigate, onClose, onOpenQuickAdd, onOpenScreenSaver, onOpenImport, setThemeMode, startTimer]);

  // Filter commands & include matched tasks
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseCommands;

    const matchedCommands = baseCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
        cmd.category.toLowerCase().includes(q)
    );

    const matchedTasks: CommandItem[] = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((t) => ({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: t.completed ? 'Completed' : t.dueDate ? `Due ${t.dueDate}` : 'Inbox Task',
        category: 'Tasks',
        icon: <CheckCircle2 size={16} color={t.completed ? colors.success : colors.textTertiary} />,
        action: () => {
          onSelectTask(t);
          onClose();
        },
      }));

    return [...matchedCommands, ...matchedTasks];
  }, [query, baseCommands, tasks, colors, onSelectTask, onClose]);

  // Keep selected index within range
  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, filteredItems.length - 1)));
  }, [filteredItems.length]);

  const handleKeyDown = (e: any) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentItem = filteredItems[selectedIndex];
      if (currentItem) {
        currentItem.action();
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.paletteContainer,
            {
              backgroundColor: isDark ? 'rgba(24, 24, 32, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
            },
            Shadows.floating,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Search Header Bar */}
          <View
            style={[
              styles.searchBar,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <Search size={18} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Type a command or search tasks..."
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setSelectedIndex(0);
              }}
              onKeyPress={Platform.OS === 'web' ? handleKeyDown : undefined}
            />
            <View style={[styles.cmdKeyBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.cmdKeyText, { color: colors.textTertiary }]}>ESC to close</Text>
            </View>
          </View>

          {/* Results List */}
          <ScrollView style={styles.listScroll} keyboardShouldPersistTaps="handled">
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No matching commands or tasks found.
                </Text>
              </View>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <Pressable
                    key={item.id}
                    style={({ hovered }: any) => [
                      styles.itemRow,
                      isSelected && {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 122, 255, 0.08)',
                      },
                      hovered && !isSelected && {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                      },
                    ]}
                    onPress={() => item.action()}
                    onHoverIn={() => setSelectedIndex(index)}
                  >
                    <View style={styles.itemIconContainer}>{item.icon}</View>

                    <View style={styles.itemTextContainer}>
                      <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text style={[styles.itemSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>

                    <View style={styles.itemRightContainer}>
                      <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <Text style={[styles.categoryText, { color: colors.textTertiary }]}>{item.category}</Text>
                      </View>
                      {item.shortcut && (
                        <View style={[styles.shortcutBadge, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }]}>
                          <Text style={[styles.shortcutText, { color: colors.textTertiary }]}>{item.shortcut}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '10%',
    zIndex: 9999,
    backdropFilter: 'blur(10px)',
  } as any,
  paletteContainer: {
    width: '90%',
    maxWidth: 640,
    maxHeight: 520,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 10000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: 1,
  },
  searchIcon: {
    marginRight: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...TypographyScale.body,
    paddingVertical: 4,
    outlineStyle: 'none',
  } as any,
  cmdKeyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cmdKeyText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  listScroll: {
    maxHeight: 420,
    paddingVertical: Spacing.xs,
  },
  emptyContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...TypographyScale.subhead,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    marginHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  itemIconContainer: {
    width: 28,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    ...TypographyScale.subhead,
    fontWeight: '600',
  },
  itemSubtitle: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  itemRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    ...TypographyScale.caption2,
    fontWeight: '500',
  },
  shortcutBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  shortcutText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
