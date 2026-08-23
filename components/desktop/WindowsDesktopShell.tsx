import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTaskora, useTheme } from '../../store/useTaskora';
import { Task, PriorityLevel, ReminderOption } from '../../models/task';
import { WindowsDesktopHeader } from './WindowsDesktopHeader';
import { WindowsDesktopSidebar, DesktopView } from './WindowsDesktopSidebar';
import { WindowsDesktopToday } from './WindowsDesktopToday';
import { WindowsDesktopInbox } from './WindowsDesktopInbox';
import { WindowsDesktopProjects } from './WindowsDesktopProjects';
import { WindowsDesktopCalendar } from './WindowsDesktopCalendar';
import { WindowsDesktopFocus } from './WindowsDesktopFocus';
import { WindowsDesktopSync } from './WindowsDesktopSync';
import { WindowsDesktopSettings } from './WindowsDesktopSettings';
import { WindowsDesktopDetailPanel } from './WindowsDesktopDetailPanel';
import { WindowsCommandPalette } from './WindowsCommandPalette';
import { WindowsQuickAddModal } from './WindowsQuickAddModal';
import { WindowsTaskContextMenu, ContextMenuPosition } from './WindowsTaskContextMenu';
import { WindowsScreenSaver } from './WindowsScreenSaver';
import { useDesktopShortcuts } from './useDesktopShortcuts';
import { ImportDataSheet } from '../settings/ImportDataSheet';

interface WindowsDesktopShellProps {
  initialView?: DesktopView;
  initialTaskId?: string;
}

export const WindowsDesktopShell: React.FC<WindowsDesktopShellProps> = ({
  initialView = 'today',
  initialTaskId,
}) => {
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const {
    tasks,
    projects,
    toggleTaskCompletion,
    deleteTask,
    updateTask,
    addTask,
    startTimer,
  } = useTaskora();

  // Navigation & panel states
  const [activeView, setActiveView] = useState<DesktopView>(initialView);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId || null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(width < 1050);

  // Overlay states
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [screenSaverVisible, setScreenSaverVisible] = useState(false);
  const [importSheetVisible, setImportSheetVisible] = useState(false);

  // Context Menu State
  const [contextMenuTask, setContextMenuTask] = useState<Task | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);

  // Responsive breakpoints
  const isLargeScreen = width >= 1260;
  const isMediumScreen = width >= 900 && width < 1260;
  const isSmallScreen = width < 900;

  // Selected task reference
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Auto collapse sidebar on smaller screens
  useEffect(() => {
    if (isSmallScreen) {
      setSidebarCollapsed(true);
    }
  }, [isSmallScreen]);

  // Keep selected task in sync if it changes or initialTaskId is provided
  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
    }
  }, [initialTaskId]);

  const handleSelectTask = useCallback((t: Task) => {
    setSelectedTaskId(t.id);
  }, []);

  const handleContextMenu = useCallback((task: Task, pos: ContextMenuPosition) => {
    setContextMenuTask(task);
    setContextMenuPos(pos);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuTask(null);
    setContextMenuPos(null);
  }, []);

  const handleStartFocusOnTask = useCallback(
    (t: Task) => {
      startTimer(t.title);
      setActiveView('focus');
    },
    [startTimer]
  );

  const handleDuplicateTask = useCallback(
    async (t: Task) => {
      await addTask({
        title: `${t.title} (Copy)`,
        notes: t.notes,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        priority: t.priority,
        projectId: t.projectId,
        tags: t.tags,
      });
    },
    [addTask]
  );

  // Keyboard Shortcuts integration
  useDesktopShortcuts({
    onQuickAdd: () => setQuickAddVisible(true),
    onCommandPalette: () => setCommandPaletteVisible(true),
    onSearch: () => setCommandPaletteVisible(true),
    onNavigate: (v) => setActiveView(v as DesktopView),
    onSettings: () => setActiveView('settings'),
    onClose: () => {
      if (contextMenuTask) {
        handleCloseContextMenu();
      } else if (commandPaletteVisible) {
        setCommandPaletteVisible(false);
      } else if (quickAddVisible) {
        setQuickAddVisible(false);
      } else if (screenSaverVisible) {
        setScreenSaverVisible(false);
      } else if (selectedTaskId) {
        setSelectedTaskId(null);
      }
    },
    onToggleComplete: () => {
      if (selectedTaskId) {
        toggleTaskCompletion(selectedTaskId);
      }
    },
    onDeleteSelected: () => {
      if (selectedTaskId) {
        deleteTask(selectedTaskId);
        setSelectedTaskId(null);
      }
    },
  });

  return (
    <View style={[styles.shellContainer, { backgroundColor: isDark ? '#0C0C10' : '#F5F5FA' }]}>
      {/* Top Windows Header */}
      <WindowsDesktopHeader
        onOpenCommandPalette={() => setCommandPaletteVisible(true)}
        onOpenQuickAdd={() => setQuickAddVisible(true)}
        onOpenScreenSaver={() => setScreenSaverVisible(true)}
        onNavigateSync={() => setActiveView('sync')}
        onNavigateSettings={() => setActiveView('settings')}
        onNavigateFocus={() => setActiveView('focus')}
      />

      {/* 3-Pane Body Workspace */}
      <View style={styles.workspaceBody}>
        {/* Left Sidebar */}
        <WindowsDesktopSidebar
          activeView={activeView}
          selectedProjectId={selectedProjectId}
          onNavigate={(v) => {
            if (v !== 'projects') setSelectedProjectId(null);
            setActiveView(v);
          }}
          onSelectProject={(pId) => {
            setSelectedProjectId(pId);
            setActiveView('projects');
          }}
          onOpenQuickAdd={() => setQuickAddVisible(true)}
          onOpenScreenSaver={() => setScreenSaverVisible(true)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Center Main Content Area */}
        <View style={styles.mainContentPane}>
          {activeView === 'today' && (
            <WindowsDesktopToday
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              onContextMenu={handleContextMenu}
              onOpenQuickAdd={() => setQuickAddVisible(true)}
            />
          )}

          {activeView === 'inbox' && (
            <WindowsDesktopInbox
              selectedTaskId={selectedTaskId}
              viewMode="inbox"
              onSelectTask={handleSelectTask}
              onContextMenu={handleContextMenu}
              onOpenQuickAdd={() => setQuickAddVisible(true)}
            />
          )}

          {activeView === 'projects' && (
            <WindowsDesktopProjects
              selectedTaskId={selectedTaskId}
              initialProjectId={selectedProjectId}
              onSelectTask={handleSelectTask}
              onContextMenu={handleContextMenu}
              onOpenQuickAdd={() => setQuickAddVisible(true)}
            />
          )}

          {activeView === 'calendar' && (
            <WindowsDesktopCalendar
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectTask}
              onContextMenu={handleContextMenu}
              onOpenQuickAdd={() => setQuickAddVisible(true)}
            />
          )}

          {activeView === 'focus' && (
            <WindowsDesktopFocus
              onOpenScreenSaver={() => setScreenSaverVisible(true)}
            />
          )}

          {activeView === 'sync' && <WindowsDesktopSync />}

          {activeView === 'settings' && (
            <WindowsDesktopSettings
              onOpenScreenSaver={() => setScreenSaverVisible(true)}
              onNavigateSync={() => setActiveView('sync')}
              onNavigateCalendar={() => setActiveView('calendar')}
            />
          )}

          {/* Smart list views */}
          {(activeView === 'upcoming' ||
            activeView === 'important' ||
            activeView === 'completed' ||
            activeView === 'favorites' ||
            activeView === 'search') && (
            <WindowsDesktopInbox
              selectedTaskId={selectedTaskId}
              viewMode={activeView}
              onSelectTask={handleSelectTask}
              onContextMenu={handleContextMenu}
              onOpenQuickAdd={() => setQuickAddVisible(true)}
            />
          )}
        </View>

        {/* Right Detail Inspector Panel */}
        {/* On large screen, always render detail panel column. On medium screen, render when a task is selected. */}
        {(isLargeScreen || (isMediumScreen && selectedTaskId)) && (
          <View
            style={[
              styles.detailPanelPane,
              {
                width: isLargeScreen ? 360 : 340,
              },
            ]}
          >
            <WindowsDesktopDetailPanel
              task={selectedTask}
              onClose={() => setSelectedTaskId(null)}
              onStartFocus={handleStartFocusOnTask}
            />
          </View>
        )}
      </View>

      {/* Global Desktop Overlays */}
      <WindowsCommandPalette
        visible={commandPaletteVisible}
        onClose={() => setCommandPaletteVisible(false)}
        onNavigate={(view) => setActiveView(view as DesktopView)}
        onOpenQuickAdd={() => setQuickAddVisible(true)}
        onSelectTask={handleSelectTask}
        onOpenScreenSaver={() => setScreenSaverVisible(true)}
        onOpenImport={() => setImportSheetVisible(true)}
      />

      <WindowsQuickAddModal
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
      />

      <WindowsTaskContextMenu
        task={contextMenuTask}
        position={contextMenuPos}
        projects={projects}
        onClose={handleCloseContextMenu}
        onSelectTask={handleSelectTask}
        onToggleComplete={(id) => toggleTaskCompletion(id)}
        onStartFocus={handleStartFocusOnTask}
        onSetPriority={(id, p) => updateTask(id, { priority: p })}
        onMoveProject={(id, pId) => updateTask(id, { projectId: pId })}
        onSetReminder={(id, r) => updateTask(id, { reminder: r })}
        onDuplicate={handleDuplicateTask}
        onDelete={(id) => deleteTask(id)}
      />

      <WindowsScreenSaver
        visible={screenSaverVisible}
        onClose={() => setScreenSaverVisible(false)}
      />

      <ImportDataSheet
        visible={importSheetVisible}
        onClose={() => setImportSheetVisible(false)}
        onSuccess={() => setImportSheetVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shellContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  workspaceBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    height: '100%',
    overflow: 'hidden',
  },
  mainContentPane: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  detailPanelPane: {
    height: '100%',
    overflow: 'hidden',
  },
});
