import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Target,
  Play,
  Pause,
  Sparkles,
  Settings,
  ShieldCheck,
  Circle,
  AlertTriangle,
  Minus,
  Square,
  X,
  Check,
  CheckCircle2,
} from 'lucide-react-native';
import { useTaskora, useTheme, useFocusTimer } from '../../store/useTaskora';
import { ThemeMode } from '../../store/ThemeContext';
import { SyncEngine } from '../../sync/SyncEngine';
import { SyncStatus } from '../../sync/types';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { BrandLogo } from '../common/BrandLogo';

interface WindowsDesktopHeaderProps {
  onOpenCommandPalette: () => void;
  onOpenQuickAdd: () => void;
  onOpenScreenSaver: () => void;
  onNavigateSync: () => void;
  onNavigateSettings: () => void;
  onNavigateFocus: () => void;
}

export const WindowsDesktopHeader: React.FC<WindowsDesktopHeaderProps> = ({
  onOpenCommandPalette,
  onOpenQuickAdd,
  onOpenScreenSaver,
  onNavigateSync,
  onNavigateSettings,
  onNavigateFocus,
}) => {
  const { colors, isDark, mode, setThemeMode } = useTheme();
  const { tasks } = useTaskora();
  const {
    isActive: isFocusActive,
    secondsRemaining,
    selectedTaskId,
    pauseTimer,
    startTimer,
    mode: focusMode,
  } = useFocusTimer();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());
  const [themePopoverOpen, setThemePopoverOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = SyncEngine.addStatusListener((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  const selectedFocusTask = tasks.find((t) => t.id === selectedTaskId);

  const formatFocusTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const getSyncStatusPill = () => {
    switch (syncStatus) {
      case 'syncing':
        return { label: 'Syncing', color: colors.accent, icon: <RefreshCw size={12} color={colors.accent} /> };
      case 'offline':
        return { label: 'Offline', color: colors.textTertiary, icon: <Circle size={8} color={colors.textTertiary} /> };
      case 'error':
        return { label: 'Sync Attention', color: colors.error, icon: <AlertTriangle size={12} color={colors.error} /> };
      case 'synced':
      default:
        return { label: 'Saved Locally & Synced', color: colors.success, icon: <Check size={12} color={colors.success} strokeWidth={2.5} /> };
    }
  };

  const syncDetails = getSyncStatusPill();

  // Electron window controls
  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.minimizeWindow) {
      (window as any).electronAPI.minimizeWindow();
    }
  };
  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.maximizeWindow) {
      (window as any).electronAPI.maximizeWindow();
    }
  };
  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.closeWindow) {
      (window as any).electronAPI.closeWindow();
    }
  };

  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isElectron);

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: isDark ? 'rgba(16, 16, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      {/* Left: Branding */}
      <View style={styles.brandSection}>
        <BrandLogo size={24} />
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Taskora</Text>
      </View>

      {/* Center: Command Palette Trigger */}
      <Pressable
        style={({ hovered }: any) => [
          styles.commandBarTrigger,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
          },
          hovered && {
            borderColor: colors.accent,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
        onPress={onOpenCommandPalette}
      >
        <Search size={14} color={colors.textTertiary} style={{ marginRight: 8 }} />
        <Text style={[styles.commandBarPlaceholder, { color: colors.textTertiary }]}>
          Search or type a command...
        </Text>
        <View style={[styles.shortcutBadge, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }]}>
          <Text style={[styles.shortcutBadgeText, { color: colors.textTertiary }]}>Ctrl + K</Text>
        </View>
      </Pressable>

      {/* Right Controls */}
      <View style={styles.rightSection}>
        {/* Focus Mini Player (Visible when active) */}
        {isFocusActive && (
          <Pressable
            style={[
              styles.focusMiniPlayer,
              {
                backgroundColor: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.1)',
                borderColor: '#FF950040',
              },
            ]}
            onPress={onNavigateFocus}
          >
            <Target size={14} color="#FF9500" style={{ marginRight: 6 }} />
            <Text style={[styles.focusMiniTime, { color: '#FF9500' }]}>
              {formatFocusTime(secondsRemaining)}
            </Text>
            {selectedFocusTask && (
              <Text style={[styles.focusMiniTask, { color: colors.textSecondary }]} numberOfLines={1}>
                • {selectedFocusTask.title}
              </Text>
            )}
            <Pressable
              style={styles.focusMiniPauseBtn}
              onPress={(e) => {
                e.stopPropagation();
                if (isFocusActive) {
                  pauseTimer(selectedFocusTask?.title);
                } else {
                  startTimer(selectedFocusTask?.title);
                }
              }}
            >
              <Pause size={12} color="#FF9500" />
            </Pressable>
          </Pressable>
        )}

        {/* Sync Status Pill */}
        <Pressable
          style={({ hovered }: any) => [
            styles.syncPill,
            {
              backgroundColor: syncDetails.color + '12',
              borderColor: syncDetails.color + '30',
            },
            hovered && { backgroundColor: syncDetails.color + '20' },
          ]}
          onPress={onNavigateSync}
        >
          {syncDetails.icon}
          <Text style={[styles.syncPillText, { color: syncDetails.color }]}>
            {syncDetails.label}
          </Text>
        </Pressable>

        {/* Theme Switcher Popover Trigger */}
        <View style={{ position: 'relative' }}>
          <Pressable
            style={({ hovered }: any) => [
              styles.iconButton,
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ]}
            onPress={() => setThemePopoverOpen(!themePopoverOpen)}
          >
            {mode === 'light' ? (
              <Sun size={17} color="#FF9500" />
            ) : mode === 'dark' ? (
              <Moon size={17} color="#5856D6" />
            ) : (
              <Monitor size={17} color={colors.accent} />
            )}
          </Pressable>

          {themePopoverOpen && (
            <Modal transparent visible={themePopoverOpen} onRequestClose={() => setThemePopoverOpen(false)} animationType="none">
              <Pressable style={styles.popoverBackdrop} onPress={() => setThemePopoverOpen(false)}>
                <View
                  style={[
                    styles.themePopover,
                    {
                      backgroundColor: isDark ? '#1C1C24' : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                    },
                    Shadows.card,
                  ]}
                >
                  <Text style={[styles.popoverTitle, { color: colors.textTertiary }]}>APPEARANCE</Text>
                  {[
                    { id: 'light', label: 'Light Theme', icon: <Sun size={15} color="#FF9500" /> },
                    { id: 'dark', label: 'Dark Theme', icon: <Moon size={15} color="#5856D6" /> },
                    { id: 'system', label: 'System (Sync)', icon: <Monitor size={15} color={colors.accent} /> },
                  ].map((item) => (
                    <Pressable
                      key={item.id}
                      style={({ hovered }: any) => [
                        styles.popoverRow,
                        mode === item.id && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.08)' },
                        hovered && mode !== item.id && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                      ]}
                      onPress={() => {
                        setThemeMode(item.id as ThemeMode);
                        setThemePopoverOpen(false);
                      }}
                    >
                      <View style={{ marginRight: 8 }}>{item.icon}</View>
                      <Text style={[styles.popoverRowText, { color: colors.textPrimary }]}>{item.label}</Text>
                      {mode === item.id && <Check size={14} color={colors.accent} style={{ marginLeft: 'auto' }} />}
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>
          )}
        </View>

        {/* Screen Saver Launcher */}
        <Pressable
          style={({ hovered }: any) => [
            styles.iconButton,
            hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={onOpenScreenSaver}
        >
          <Sparkles size={17} color={colors.textSecondary} />
        </Pressable>

        {/* Settings Launcher */}
        <Pressable
          style={({ hovered }: any) => [
            styles.iconButton,
            hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={onNavigateSettings}
        >
          <Settings size={17} color={colors.textSecondary} />
        </Pressable>

        {/* Electron Window Controls (if inside Electron) */}
        {isElectron && (
          <View style={styles.windowControls}>
            <Pressable style={styles.winCtrlBtn} onPress={handleMinimize}>
              <Minus size={12} color={colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.winCtrlBtn} onPress={handleMaximize}>
              <Square size={10} color={colors.textSecondary} />
            </Pressable>
            <Pressable style={[styles.winCtrlBtn, styles.winCloseBtn]} onPress={handleClose}>
              <X size={12} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 48,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    zIndex: 100,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 200,
  },
  brandTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginLeft: Spacing.sm,
    letterSpacing: -0.3,
  },
  commandBarTrigger: {
    flex: 1,
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  commandBarPlaceholder: {
    flex: 1,
    ...TypographyScale.caption1,
  },
  shortcutBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  shortcutBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  focusMiniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
    cursor: 'pointer' as any,
    maxWidth: 220,
  },
  focusMiniTime: {
    fontSize: 12,
    fontWeight: '700',
  },
  focusMiniTask: {
    ...TypographyScale.caption2,
    marginLeft: 4,
    flexShrink: 1,
  },
  focusMiniPauseBtn: {
    marginLeft: 6,
    padding: 2,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
    cursor: 'pointer' as any,
    gap: 5,
  },
  syncPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  popoverBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 9999,
  },
  themePopover: {
    position: 'absolute',
    top: 48,
    right: 80,
    width: 180,
    borderRadius: Radii.sm,
    borderWidth: 1,
    padding: Spacing.xs,
    zIndex: 10000,
  },
  popoverTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  popoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: 4,
    cursor: 'pointer' as any,
  },
  popoverRowText: {
    ...TypographyScale.footnote,
    fontWeight: '500',
  },
  windowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  winCtrlBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  winCloseBtn: {
    borderRadius: 4,
  },
});
