import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Download, Upload, Trash2, Info, BarChart2, Sparkles, Mic, Calendar, RotateCcw, ShieldCheck, Tag, Clock, Lightbulb, RefreshCw, Camera, User } from 'lucide-react-native';
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
import { Repository } from '../services/storage/repository';
import { NotificationService } from '../services/notifications/notificationService';
import { VoiceService, MicrophonePermissionStatus } from '../services/voice';
import { MAX_CONTENT_WIDTH } from '../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../theme/tokens';
import { getBottomContentInset } from '../theme/materials';
import { safeGoBack } from '../utils/navigation';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setThemeMode, timeFormat, setTimeFormat, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    completedTasks,
    bulkDeleteTasks,
    clearAllData,
    smartSettings,
    updateSmartSettings,
    resetSmartPreferences,
  } = useTaskora();

  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [importSheetVisible, setImportSheetVisible] = useState(false);
  const [micPermStatus, setMicPermStatus] = useState<MicrophonePermissionStatus>('undetermined');

  React.useEffect(() => {
    VoiceService.checkPermission().then(setMicPermStatus);
  }, []);

  const handleRequestMicPermission = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (micPermStatus === 'blocked') {
      await VoiceService.openSettings();
    } else {
      const res = await VoiceService.requestPermission();
      setMicPermStatus(res);
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
                    icon={<ShieldCheck size={20} color={micPermStatus === 'granted' ? colors.success : colors.warning} />}
                    title="Microphone Permission"
                    subtitle={
                      micPermStatus === 'granted'
                        ? 'Granted — Ready for on-device voice tasks'
                        : micPermStatus === 'blocked'
                        ? 'Blocked — Tap to open System Settings'
                        : 'Tap to grant microphone access'
                    }
                    onPress={micPermStatus !== 'granted' ? handleRequestMicPermission : undefined}
                    showChevron={micPermStatus !== 'granted'}
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

            {/* Notifications Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>NOTIFICATIONS</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Bell size={20} color={colors.accent} />}
                title="Task Reminders"
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

            {/* About Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ABOUT</Text>
            <ElevatedCard style={[styles.cardSection, { alignItems: 'center', paddingVertical: Spacing.lg }]}>
              <BrandLogo size={56} animated withShadow style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.aboutBrandTitle, { color: colors.textPrimary }]}>Taskora</Text>
              <Text style={[styles.aboutTagline, { color: colors.textSecondary }]}>Premium Productivity</Text>
              <Text style={[styles.aboutVersion, { color: colors.textTertiary }]}>Version 1.0.0 (Phase 3 Build)</Text>
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
});


