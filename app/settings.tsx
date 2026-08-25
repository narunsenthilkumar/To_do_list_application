import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Download, Upload, Trash2, Info, BarChart2, Sparkles, Mic, Calendar, RotateCcw, ShieldCheck, Tag, Clock, Lightbulb, RefreshCw, Camera, User, LayoutGrid, Check, Volume2, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../components/common/PrimarySurface';
import { ElevatedCard } from '../components/common/ElevatedCard';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { ThemeSegmentedControl } from '../components/settings/ThemeSegmentedControl';
import { TimeFormatSelector } from '../components/settings/TimeFormatSelector';
import { BackgroundEditor } from '../components/settings/BackgroundEditor';
import { AnimatedToggle } from '../components/settings/AnimatedToggle';
import { SettingsRow } from '../components/settings/SettingsRow';
import { ImportDataSheet } from '../components/settings/ImportDataSheet';
import { BrandLogo } from '../components/common/BrandLogo';
import { useTheme } from '../store/ThemeContext';
import { useTaskora } from '../store/useTaskora';
import { Repository, IncompleteTaskIndicationType } from '../services/storage/repository';
import { NotificationService, NotificationCapability } from '../services/notifications/notificationService';
import { VoiceService, MicrophonePermissionStatus } from '../services/voice';
import { PermissionManager, PermissionStatusMap } from '../services/permissions/PermissionManager';
import { MAX_CONTENT_WIDTH } from '../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../theme/tokens';
import { getBottomContentInset } from '../theme/materials';
import { safeGoBack } from '../utils/navigation';
import { haptics } from '../services/haptics';
import { updateService } from '../services/updates/UpdateService';
import { UpdateState } from '../services/updates/UpdateTypes';
import Constants from 'expo-constants';

import { WindowsDesktopShell } from '../components/desktop/WindowsDesktopShell';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setThemeMode, timeFormat, setTimeFormat, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const isDesktop =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (window.innerWidth >= 900 || Boolean((window as any).electronAPI?.isElectron));

  if (isDesktop) {
    return <WindowsDesktopShell initialView="settings" />;
  }

  const {
    completedTasks,
    bulkDeleteTasks,
    clearAllData,
    smartSettings,
    updateSmartSettings,
    resetSmartPreferences,
  } = useTaskora();

  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [incompleteIndication, setIncompleteIndication] = useState<IncompleteTaskIndicationType>('both');
  const [importSheetVisible, setImportSheetVisible] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>(updateService.getState());
  const [permMap, setPermMap] = useState<PermissionStatusMap>(PermissionManager.getStatus());

  useEffect(() => {
    Repository.loadIncompleteTaskIndication().then(setIncompleteIndication);
    PermissionManager.init().then(setPermMap);
    const unsubPerms = PermissionManager.subscribe(setPermMap);

    const unsub = updateService.subscribe(setUpdateState);
    return () => {
      unsub();
      unsubPerms();
    };
  }, []);

  const handleSelectIncompleteIndication = async (mode: IncompleteTaskIndicationType) => {
    haptics.selection();
    setIncompleteIndication(mode);
    await Repository.saveIncompleteTaskIndication(mode);

    if (mode === 'alarm' || mode === 'both') {
      const details = await PermissionManager.check('alarms');
      if (details.state !== 'GRANTED') {
        Alert.alert(
          'Exact Alarms',
          'Exact alarms allow Taskora to alert you at the scheduled time with high-urgency notifications.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                await PermissionManager.request('alarms');
              },
            },
          ]
        );
      }
    }
  };

  const handleRequestPermission = async (type: 'notifications' | 'bluetooth' | 'microphone' | 'alarms') => {
    haptics.light();
    const details = permMap[type];
    if (details.state === 'BLOCKED') {
      await PermissionManager.openSystemSettings();
    } else {
      await PermissionManager.request(type);
    }
  };

  const handleExportData = async () => {

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const jsonStr = await Repository.exportBackupJSON();
    Alert.alert('Data Export Ready', 'Your Taskora backup JSON is ready. You can copy it below or restore it anytime.', [
      { text: 'Done', style: 'cancel' },
    ]);
  };

  const handleClearCompleted = () => {
    const completedIds = completedTasks.map((t) => t.id);
    if (completedIds.length === 0) {
      Alert.alert('No Completed Tasks', 'There are no completed tasks to clear.');
      return;
    }

    Alert.alert('Clear Completed Tasks', `Are you sure you want to clear ${completedIds.length} completed tasks?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await bulkDeleteTasks(completedIds);
        },
      },
    ]);
  };

  const handleResetPreferences = () => {
    Alert.alert(
      'Reset Smart Preferences',
      'This will reset your learned category preferences and suggestion history to default. Your tasks and projects will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetSmartPreferences();
            Alert.alert('Preferences Reset', 'Smart preferences restored to default.');
          },
        },
      ]
    );
  };

  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Data?',
      'This will permanently delete all tasks, projects, tags, and productivity records, returning Taskora to a clean initial state. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Workspace Reset', 'All data has been cleared. Taskora is now completely fresh.');
          },
        },
      ]
    );
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Appearance Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>APPEARANCE</Text>
            <ElevatedCard style={styles.cardSection}>
              <ThemeSegmentedControl mode={mode} onSelectMode={setThemeMode} />
            </ElevatedCard>

            {/* Time & Date Format Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>TIME & DATE</Text>
            <ElevatedCard style={styles.cardSection}>
              <TimeFormatSelector timeFormat={timeFormat} onSelectFormat={setTimeFormat} />
            </ElevatedCard>

            {/* Background & Ambience Editor */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>BACKGROUND & AMBIENCE</Text>
            <ElevatedCard style={styles.cardSection}>
              <BackgroundEditor />
            </ElevatedCard>

            {/* Smart Productivity Suite */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>SMART FEATURES</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Sparkles size={20} color={colors.accent} />}
                title="Smart Task Parsing"
                subtitle="Detect dates, times, priorities from natural language"
                trailing={
                  <AnimatedToggle
                    value={smartSettings.smartParsingEnabled}
                    onValueChange={(val) => updateSmartSettings({ smartParsingEnabled: val })}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Calendar size={20} color={colors.accent} />}
                title="Smart Scheduling"
                subtitle="Optimize workloads and recommend focus tasks"
                trailing={
                  <AnimatedToggle
                    value={smartSettings.smartSchedulingEnabled}
                    onValueChange={(val) => updateSmartSettings({ smartSchedulingEnabled: val })}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Tag size={20} color={colors.accent} />}
                title="Smart Categorization"
                subtitle="Automatic task domain classification"
                trailing={
                  <AnimatedToggle
                    value={smartSettings.smartCategorizationEnabled}
                    onValueChange={(val) => updateSmartSettings({ smartCategorizationEnabled: val })}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Clock size={20} color={colors.accent} />}
                title="Smart Reminders"
                subtitle="Proactive reminder lead-time suggestions"
                trailing={
                  <AnimatedToggle
                    value={smartSettings.smartRemindersEnabled}
                    onValueChange={(val) => updateSmartSettings({ smartRemindersEnabled: val })}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Lightbulb size={20} color={colors.accent} />}
                title="Productivity Tips"
                subtitle="Daily morning/evening briefings and summaries"
                trailing={
                  <AnimatedToggle
                    value={smartSettings.productivityTipsEnabled}
                    onValueChange={(val) => updateSmartSettings({ productivityTipsEnabled: val })}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Mic size={20} color={colors.accent} />}
                title="Voice Tasks"
                subtitle="Speech-to-text task capture"
                trailing={
                  <AnimatedToggle
                    value={smartSettings.voiceTasksEnabled}
                    onValueChange={(val) => updateSmartSettings({ voiceTasksEnabled: val })}
                  />
                }
              />

              {smartSettings.voiceTasksEnabled && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />
                  <SettingsRow
                    icon={<ShieldCheck size={20} color={permMap.microphone.state === 'GRANTED' ? colors.success : colors.warning} />}
                    title="Microphone Permission"
                    subtitle={
                      permMap.microphone.state === 'GRANTED'
                        ? 'Granted — Ready for on-device voice tasks'
                        : permMap.microphone.state === 'BLOCKED'
                        ? 'Blocked — Tap to open System Settings'
                        : 'Tap to grant microphone access'
                    }
                    onPress={permMap.microphone.state !== 'GRANTED' ? () => handleRequestPermission('microphone') : undefined}
                    showChevron={permMap.microphone.state !== 'GRANTED'}
                  />
                </>
              )}


              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<RotateCcw size={20} color={colors.textSecondary} />}
                title="Reset Smart Preferences"
                subtitle="Clear learned corrections and suggestion cooldowns"
                onPress={handleResetPreferences}
                showChevron
              />
            </ElevatedCard>

            {/* Privacy Guarantee Card */}
            <ElevatedCard style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <ShieldCheck size={20} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>Local Intelligence Guarantee</Text>
              </View>
              <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>
                Taskora's smart features run 100% locally on your device code. Your task data is never sent to an external AI service or cloud backend.
              </Text>
              <View style={styles.privacyPoints}>
                <Text style={[styles.privacyPointText, { color: colors.textTertiary }]}>✓ No external AI API keys</Text>
                <Text style={[styles.privacyPointText, { color: colors.textTertiary }]}>✓ No user account required</Text>
                <Text style={[styles.privacyPointText, { color: colors.textTertiary }]}>✓ Fully functional offline</Text>
                <Text style={[styles.privacyPointText, { color: colors.textTertiary }]}>✓ Private on-device processing</Text>
              </View>
            </ElevatedCard>

            {/* Sync & Multi-Device Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>SYNC & DEVICES</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<RefreshCw size={20} color={colors.accent} />}
                title="Sync & Paired Devices"
                subtitle="Direct local-network sync across Windows & Android"
                showChevron
                onPress={() => router.push('/sync' as any)}
              />
            </ElevatedCard>

            {/* Productivity & Stats */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PRODUCTIVITY</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<BarChart2 size={20} color={colors.accent} />}
                title="Productivity Statistics & Streaks"
                showChevron
                onPress={() => router.push('/statistics')}
              />
            </ElevatedCard>

            {/* Widgets & Live Status */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>HOME SCREEN & WIDGETS</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<LayoutGrid size={20} color={colors.accent} />}
                title="Home Screen Widgets & Studio"
                subtitle="Interactive Small, Medium & Large live widgets"
                showChevron
                onPress={() => router.push('/settings/widgets' as any)}
              />
            </ElevatedCard>

            {/* Notifications Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>NOTIFICATIONS & ALERTS</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Bell size={20} color={colors.accent} />}
                title="Task Reminders"
                subtitle="Enable scheduled notifications for task deadlines"
                trailing={
                  <AnimatedToggle
                    value={remindersEnabled}
                    onValueChange={(val) => {
                      setRemindersEnabled(val);
                      if (val) NotificationService.requestPermissions();
                    }}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              {/* Incomplete Tasks Indication Mode Selector */}
              <View style={styles.incompleteSection}>
                <View style={styles.incompleteHeaderRow}>
                  <Volume2 size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <View>
                    <Text style={[styles.incompleteTitle, { color: colors.textPrimary }]}>
                      Incomplete Task Indication
                    </Text>
                    <Text style={[styles.incompleteSubtitle, { color: colors.textTertiary }]}>
                      How should Taskora remind you?
                    </Text>
                  </View>
                </View>

                <View style={styles.indicationOptionsList}>
                  {[
                    { id: 'off', label: 'Off', desc: 'No reminders' },
                    { id: 'notification', label: 'Notification', desc: 'Standard banner notification' },
                    { id: 'alarm', label: 'Alarm', desc: 'High-urgency alarm sound & vibration' },
                    { id: 'both', label: 'Notification + Alarm', desc: 'Banner and alarm sound combined' },
                  ].map((opt) => {
                    const isSelected = incompleteIndication === opt.id;
                    return (
                      <AnimatedPressable
                        key={opt.id}
                        profile="smallControl"
                        onPress={() => handleSelectIncompleteIndication(opt.id as IncompleteTaskIndicationType)}
                        style={[
                          styles.indicationOptionRow,
                          {
                            backgroundColor: isSelected ? colors.accent + '15' : 'transparent',
                            borderColor: isSelected ? colors.accent : colors.subtleBorder,
                          },
                        ]}
                      >
                        <View style={styles.indicationRadioWrap}>
                          <View
                            style={[
                              styles.radioOuter,
                              { borderColor: isSelected ? colors.accent : colors.textTertiary },
                            ]}
                          >
                            {isSelected && (
                              <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />
                            )}
                          </View>
                          <View style={styles.indicationTextCol}>
                            <Text
                              style={[
                                styles.indicationOptionLabel,
                                { color: isSelected ? colors.accent : colors.textPrimary, fontWeight: isSelected ? '700' : '600' },
                              ]}
                            >
                              {opt.label}
                            </Text>
                            <Text style={[styles.indicationOptionDesc, { color: colors.textTertiary }]}>
                              {opt.desc}
                            </Text>
                          </View>
                        </View>
                        {isSelected && <Check size={16} color={colors.accent} />}
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Bell size={20} color={permMap.notifications.state === 'GRANTED' ? colors.success : colors.warning} />}
                title="Notifications"
                subtitle={
                  permMap.notifications.state === 'GRANTED'
                    ? 'Allowed — On-time alerts and live focus active'
                    : permMap.notifications.state === 'BLOCKED'
                    ? 'Blocked in System Settings — Tap to enable'
                    : 'Tap to allow task reminder alerts'
                }
                trailing={
                  <View style={[styles.permBadge, { backgroundColor: permMap.notifications.state === 'GRANTED' ? colors.success + '20' : colors.warning + '20' }]}>
                    <Text style={[styles.permBadgeText, { color: permMap.notifications.state === 'GRANTED' ? colors.success : colors.warning }]}>
                      {permMap.notifications.state === 'GRANTED' ? 'Allowed' : permMap.notifications.state === 'BLOCKED' ? 'Blocked' : 'Enable'}
                    </Text>
                  </View>
                }
                onPress={() => handleRequestPermission('notifications')}
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Clock size={20} color={permMap.alarms.state === 'GRANTED' ? colors.success : colors.warning} />}
                title="Exact Alarms & Timers"
                subtitle={
                  permMap.alarms.state === 'GRANTED'
                    ? 'Enabled — High-precision alerts and alarms'
                    : 'Disabled — Using standard notification alerts'
                }
                trailing={
                  <View style={[styles.permBadge, { backgroundColor: permMap.alarms.state === 'GRANTED' ? colors.success + '20' : colors.warning + '20' }]}>
                    <Text style={[styles.permBadgeText, { color: permMap.alarms.state === 'GRANTED' ? colors.success : colors.warning }]}>
                      {permMap.alarms.state === 'GRANTED' ? 'Enabled' : 'Configure'}
                    </Text>
                  </View>
                }
                onPress={() => handleRequestPermission('alarms')}
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<ShieldCheck size={20} color={permMap.bluetooth.state === 'GRANTED' ? colors.success : colors.textTertiary} />}
                title="Bluetooth (Nearby Sync)"
                subtitle={
                  permMap.bluetooth.state === 'GRANTED'
                    ? 'Allowed — Local device discovery and sync ready'
                    : permMap.bluetooth.state === 'UNAVAILABLE'
                    ? 'Unsupported on this device platform'
                    : 'Required to discover nearby Taskora phones'
                }
                trailing={
                  <View style={[styles.permBadge, { backgroundColor: permMap.bluetooth.state === 'GRANTED' ? colors.success + '20' : colors.secondaryBackground }]}>
                    <Text style={[styles.permBadgeText, { color: permMap.bluetooth.state === 'GRANTED' ? colors.success : colors.textSecondary }]}>
                      {permMap.bluetooth.state === 'GRANTED' ? 'Allowed' : permMap.bluetooth.state === 'UNAVAILABLE' ? 'N/A' : 'Allow'}
                    </Text>
                  </View>
                }
                onPress={permMap.bluetooth.state !== 'UNAVAILABLE' ? () => handleRequestPermission('bluetooth') : undefined}
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Mic size={20} color={permMap.microphone.state === 'GRANTED' ? colors.success : colors.textTertiary} />}
                title="Microphone (Voice Capture)"
                subtitle={
                  permMap.microphone.state === 'GRANTED'
                    ? 'Allowed — On-device speech recognition active'
                    : permMap.microphone.state === 'BLOCKED'
                    ? 'Blocked in System Settings — Tap to enable'
                    : 'Contextual voice input for hands-free tasks'
                }
                trailing={
                  <View style={[styles.permBadge, { backgroundColor: permMap.microphone.state === 'GRANTED' ? colors.success + '20' : colors.secondaryBackground }]}>
                    <Text style={[styles.permBadgeText, { color: permMap.microphone.state === 'GRANTED' ? colors.success : colors.textSecondary }]}>
                      {permMap.microphone.state === 'GRANTED' ? 'Allowed' : 'Allow'}
                    </Text>
                  </View>
                }
                onPress={() => handleRequestPermission('microphone')}
              />
            </ElevatedCard>



            {/* Data & Backup Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>DATA & BACKUP</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Camera size={20} color={colors.accent} />}
                title="Local Snapshots & Backups"
                subtitle="Rolling snapshots, JSON & CSV export, safe restore"
                showChevron
                onPress={() => router.push('/settings/backup' as any)}
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Trash2 size={20} color={colors.error} />}
                title="Clear Completed Tasks"
                isDestructive
                onPress={handleClearCompleted}
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Trash2 size={20} color={colors.error} />}
                title="Reset All Data"
                subtitle="Clean slate: delete all tasks, projects & stats"
                isDestructive
                onPress={handleResetAllData}
              />
            </ElevatedCard>

            {/* Privacy & Diagnostics */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PRIVACY & SECURITY</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<ShieldCheck size={20} color={colors.success} />}
                title="Privacy & Diagnostics"
                subtitle="Local architecture, error logs, diagnostic export"
                showChevron
                onPress={() => router.push('/settings/privacy-diagnostics' as any)}
              />
            </ElevatedCard>

            {/* Account Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ACCOUNT</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<User size={20} color={colors.accent} />}
                title="Local Account / Sign In"
                subtitle="Manage your identity or switch account"
                showChevron
                onPress={() => router.push('/auth/login' as any)}
              />
            </ElevatedCard>

            {/* Software Updates Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>SOFTWARE UPDATES</Text>
            <ElevatedCard style={styles.cardSection}>
              <View style={styles.updateCardInner}>
                <View style={styles.updateInfoRow}>
                  <View style={[styles.updateIconBox, { backgroundColor: colors.accent + '15' }]}>
                    <RefreshCw size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.updateTitle, { color: colors.textPrimary }]}>
                      Taskora for Android
                    </Text>
                    <Text style={[styles.updateSub, { color: colors.textTertiary }]}>
                      Installed: v{Constants.expoConfig?.version || '1.0.0'}
                      {updateState.manifest ? ` • Latest: v${updateState.manifest.latestVersion}` : ''}
                    </Text>
                  </View>

                  {/* Status Indicator Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          updateState.status === 'update_available' || updateState.status === 'ready_to_install'
                            ? colors.accent + '20'
                            : updateState.status === 'error'
                            ? colors.error + '20'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            updateState.status === 'update_available' || updateState.status === 'ready_to_install'
                              ? colors.accent
                              : updateState.status === 'error'
                              ? colors.error
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {updateState.status === 'checking'
                        ? 'Checking...'
                        : updateState.status === 'downloading'
                        ? `${updateState.downloadProgress}%`
                        : updateState.status === 'verifying'
                        ? 'Verifying'
                        : updateState.status === 'ready_to_install'
                        ? 'Ready'
                        : updateState.status === 'update_available'
                        ? 'New Version'
                        : 'Up to Date'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar if downloading */}
                {updateState.status === 'downloading' && (
                  <View style={styles.updateProgressBarContainer}>
                    <View
                      style={[
                        styles.updateProgressTrack,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                      ]}
                    >
                      <View
                        style={[
                          styles.updateProgressFill,
                          { backgroundColor: colors.accent, width: `${updateState.downloadProgress}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Update Action Buttons */}
                <View style={styles.updateActionsRow}>
                  {updateState.status === 'ready_to_install' ? (
                    <AnimatedPressable
                      profile="primaryButton"
                      style={[styles.checkUpdateBtn, { backgroundColor: colors.accent }]}
                      onPress={() => updateService.installUpdate()}
                    >
                      <Download size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.checkUpdateBtnText}>Install Update</Text>
                    </AnimatedPressable>
                  ) : updateState.status === 'update_available' ? (
                    <AnimatedPressable
                      profile="primaryButton"
                      style={[styles.checkUpdateBtn, { backgroundColor: colors.accent }]}
                      onPress={() => updateService.downloadUpdate()}
                    >
                      <Download size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.checkUpdateBtnText}>
                        Update to v{updateState.manifest?.latestVersion}
                      </Text>
                    </AnimatedPressable>
                  ) : (
                    <AnimatedPressable
                      profile="smallControl"
                      style={[
                        styles.checkUpdateBtnOutline,
                        {
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                        },
                      ]}
                      onPress={() => {
                        haptics.medium();
                        updateService.checkForUpdates(true);
                      }}
                      disabled={updateState.status === 'checking'}
                    >
                      <RefreshCw
                        size={13}
                        color={colors.textPrimary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.checkUpdateBtnOutlineText, { color: colors.textPrimary }]}>
                        {updateState.status === 'checking' ? 'Checking for updates...' : 'Check for Updates'}
                      </Text>
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            </ElevatedCard>

            {/* About Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ABOUT</Text>
            <ElevatedCard style={[styles.cardSection, { alignItems: 'center', paddingVertical: Spacing.lg }]}>
              <BrandLogo size={56} animated withShadow style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.aboutBrandTitle, { color: colors.textPrimary }]}>Taskora</Text>
              <Text style={[styles.aboutTagline, { color: colors.textSecondary }]}>Premium Productivity</Text>
              <Text style={[styles.aboutVersion, { color: colors.textTertiary }]}>
                Version {Constants.expoConfig?.version || '1.0.0'} (Production Build)
              </Text>
            </ElevatedCard>
          </ScrollView>
        </View>
      </View>

      {/* Responsive Import Data Glass Sheet Modal */}
      <ImportDataSheet
        visible={importSheetVisible}
        onClose={() => setImportSheetVisible(false)}
        onSuccess={() => {
          Alert.alert('Data Restored', 'Taskora dataset updated successfully.');
        }}
      />
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
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...TypographyScale.headline,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  cardSection: {
    marginBottom: Spacing.xs,
  },
  privacyCard: {
    padding: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: Radii.lg,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  privacyTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  privacyDesc: {
    ...TypographyScale.footnote,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  privacyPoints: {
    gap: 4,
  },
  privacyPointText: {
    ...TypographyScale.caption1,
  },
  rowValue: {
    ...TypographyScale.footnote,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  aboutBrandTitle: {
    ...TypographyScale.title3,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aboutTagline: {
    ...TypographyScale.footnote,
    fontWeight: '600',
    marginTop: 2,
  },
  aboutVersion: {
    ...TypographyScale.caption1,
    marginTop: 4,
  },
  incompleteSection: {
    paddingVertical: Spacing.sm,
  },
  incompleteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  incompleteTitle: {
    ...TypographyScale.body,
    fontWeight: '700',
  },
  incompleteSubtitle: {
    ...TypographyScale.caption1,
    marginTop: 1,
  },
  indicationOptionsList: {
    gap: Spacing.xs,
  },
  indicationOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  indicationRadioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicationTextCol: {
    flex: 1,
  },
  indicationOptionLabel: {
    ...TypographyScale.footnote,
  },
  indicationOptionDesc: {
    ...TypographyScale.caption2,
    marginTop: 1,
  },
  // Software update card styles
  updateCardInner: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  updateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  updateIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateTitle: {
    ...TypographyScale.subhead,
    fontWeight: '700',
  },
  updateSub: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  updateProgressBarContainer: {
    width: '100%',
    paddingVertical: 2,
  },
  updateProgressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  updateProgressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  updateActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  checkUpdateBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkUpdateBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.sm,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  checkUpdateBtnOutlineText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  permBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  permBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
});




