import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  ArrowLeft,
  Download,
  Upload,
  Camera,
  Trash2,
  RotateCcw,
  FileText,
  ShieldCheck,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
} from 'lucide-react-native';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { BackupService, BackupSnapshot } from '../../backup/BackupService';
import { ExportService, ExportResult } from '../../backup/ExportService';
import { RestoreService, BackupPreviewSummary } from '../../backup/RestoreService';
import { useTheme } from '../../store/ThemeContext';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';

export default function BackupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessModal, setExportSuccessModal] = useState<{ visible: boolean; title: string; subtitle: string; filename: string } | null>(null);
  const [exportErrorModal, setExportErrorModal] = useState<{ visible: boolean; message: string; retryAction?: () => void } | null>(null);

  // Restore Modal State
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreTab, setRestoreTab] = useState<'file' | 'paste'>('file');
  const [pasteInput, setPasteInput] = useState('');
  const [previewSummary, setPreviewSummary] = useState<BackupPreviewSummary | null>(null);
  const [restoreStrategy, setRestoreStrategy] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  const isSmallDevice = windowWidth < 360;
  const isMobile = windowWidth < 600;
  const modalContainerWidth = Math.min(windowWidth - (isSmallDevice ? 16 : 32), 480);
  const maxModalContentHeight = windowHeight - Math.max(insets.top, 20) - Math.max(insets.bottom, 20) - 100;

  const loadSnapshots = async () => {
    const list = await BackupService.getSnapshots();
    setSnapshots(list);
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  // --- Snapshot Handlers ---
  const handleCreateSnapshot = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const snap = await BackupService.createSnapshot();
    await loadSnapshots();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Snapshot Created', `Saved local snapshot with ${snap.taskCount} tasks.`);
  };

  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    Alert.alert(
      'Restore Snapshot',
      `Restore from "${snap.name}" (${snap.taskCount} tasks)? A pre-rollback safety snapshot will be created automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await RestoreService.restoreFromSnapshot(snap.id);
            await loadSnapshots();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Restored', 'Taskora data restored from snapshot.');
          },
        },
      ]
    );
  };

  const handleDeleteSnapshot = (snap: BackupSnapshot) => {
    Alert.alert('Delete Snapshot', `Delete "${snap.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await BackupService.deleteSnapshot(snap.id);
          await loadSnapshots();
        },
      },
    ]);
  };

  // --- Export Handlers ---
  const handleExportJSON = async () => {
    if (isExporting) return;
    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result: ExportResult = await ExportService.exportJSON();
      if (result.success && !result.isCancelled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setExportSuccessModal({
          visible: true,
          title: 'Export Complete',
          subtitle: `Your Taskora backup with ${result.itemCount} tasks is ready to share or save.`,
          filename: result.filename,
        });
      }
    } catch (e: any) {
      setExportErrorModal({
        visible: true,
        message: e?.message || 'Taskora could not create the backup JSON file.',
        retryAction: handleExportJSON,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (isExporting) return;
    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result: ExportResult = await ExportService.exportCSV();
      if (result.success && !result.isCancelled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setExportSuccessModal({
          visible: true,
          title: 'CSV Export Complete',
          subtitle: `Spreadsheet with ${result.itemCount} tasks generated successfully.`,
          filename: result.filename,
        });
      }
    } catch (e: any) {
      setExportErrorModal({
        visible: true,
        message: e?.message || 'Taskora could not create the tasks CSV file.',
        retryAction: handleExportCSV,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // --- Restore File Picker & Preview ---
  const handlePickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 1. Electron Windows Native Open File Dialog (via Secure IPC)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).electronAPI?.openFile) {
        const res = await (window as any).electronAPI.openFile({
          filters: [
            { name: 'Taskora Backup (*.json)', extensions: ['json'] },
            { name: 'All Files (*.*)', extensions: ['*'] },
          ],
        });

        if (res.isCancelled || !res.content) {
          return;
        }

        const summary = RestoreService.validateAndPreviewBackup(res.content);
        setPreviewSummary(summary);
        setRestoreModalVisible(true);
        return;
      }

      // 2. Standard Mobile / Web File Picker
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const asset = res.assets[0];
      let content = '';

      if (Platform.OS === 'web' && (asset as any).file) {
        const file = (asset as any).file as File;
        content = await file.text();
      } else if (asset.uri) {
        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (!content) {
        throw new Error('Selected file could not be read.');
      }

      const summary = RestoreService.validateAndPreviewBackup(content);
      setPreviewSummary(summary);
      setRestoreModalVisible(true);
    } catch (e: any) {
      Alert.alert('Invalid Backup File', e?.message || 'Could not validate the selected backup file.');
    }
  };

  const handleInspectPastedText = () => {
    try {
      if (!pasteInput.trim()) {
        Alert.alert('Empty Input', 'Please paste the backup JSON content.');
        return;
      }
      const summary = RestoreService.validateAndPreviewBackup(pasteInput.trim());
      setPreviewSummary(summary);
    } catch (e: any) {
      Alert.alert('Invalid Backup JSON', e?.message || 'Could not parse the pasted JSON string.');
    }
  };

  const handleExecuteRestore = async () => {
    if (!previewSummary) return;

    setIsRestoring(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await RestoreService.restoreFromPreview(previewSummary, restoreStrategy);
      await loadSnapshots();
      setRestoreModalVisible(false);
      setPreviewSummary(null);
      setPasteInput('');

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Restore Complete',
        `Successfully restored ${res.taskCount} tasks and ${res.projectCount} projects.`
      );
    } catch (e: any) {
      Alert.alert('Restore Failed', e?.message || 'Could not complete the restoration.');
    } finally {
      setIsRestoring(false);
    }
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface style={{ flex: 1 }}>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router, '/settings')} style={styles.backBtn} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Backup & Restore</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Backup & Export Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>BACKUP & EXPORT</Text>

            {/* 1. Export Backup */}
            <ElevatedCard style={styles.actionCard}>
              <AnimatedPressable
                profile="smallControl"
                onPress={handleExportJSON}
                disabled={isExporting}
                style={styles.actionRow}
                accessibilityLabel="Export Backup"
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.accent + '15' }]}>
                  {isExporting ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Download size={20} color={colors.accent} />
                  )}
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {isExporting ? 'Exporting Backup...' : 'Export Backup'}
                  </Text>
                  <Text style={[styles.actionSub, { color: colors.textTertiary }]} numberOfLines={2}>
                    Complete verified JSON backup to save or share
                  </Text>
                </View>
              </AnimatedPressable>
            </ElevatedCard>

            {/* 2. Export CSV */}
            <ElevatedCard style={styles.actionCard}>
              <AnimatedPressable
                profile="smallControl"
                onPress={handleExportCSV}
                disabled={isExporting}
                style={styles.actionRow}
                accessibilityLabel="Export CSV"
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.accent + '15' }]}>
                  <FileText size={20} color={colors.accent} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    Export CSV
                  </Text>
                  <Text style={[styles.actionSub, { color: colors.textTertiary }]} numberOfLines={2}>
                    Spreadsheet-compatible RFC 4180 format
                  </Text>
                </View>
              </AnimatedPressable>
            </ElevatedCard>

            {/* 3. Restore Backup */}
            <ElevatedCard style={styles.actionCard}>
              <AnimatedPressable
                profile="smallControl"
                onPress={handlePickDocument}
                style={styles.actionRow}
                accessibilityLabel="Restore Backup"
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.accent + '15' }]}>
                  <Upload size={20} color={colors.accent} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    Restore Backup
                  </Text>
                  <Text style={[styles.actionSub, { color: colors.textTertiary }]} numberOfLines={2}>
                    Select a Taskora_Backup.json file to restore
                  </Text>
                </View>
              </AnimatedPressable>

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  setPreviewSummary(null);
                  setRestoreTab('paste');
                  setRestoreModalVisible(true);
                }}
                style={styles.actionRow}
                accessibilityLabel="Paste JSON text to restore"
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.secondaryBackground }]}>
                  <FileCode size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    Paste JSON Text
                  </Text>
                  <Text style={[styles.actionSub, { color: colors.textTertiary }]} numberOfLines={2}>
                    Paste raw backup JSON directly from clipboard
                  </Text>
                </View>
              </AnimatedPressable>
            </ElevatedCard>

            {/* Automatic Snapshots Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>LOCAL SNAPSHOTS</Text>
              <AnimatedPressable profile="smallControl" onPress={handleCreateSnapshot} style={styles.addSnapshotBtn} accessibilityLabel="Create new snapshot">
                <Plus size={14} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.addSnapshotText, { color: colors.accent }]}>New Snapshot</Text>
              </AnimatedPressable>
            </View>

            {snapshots.length === 0 ? (
              <ElevatedCard style={styles.emptyCard}>
                <Camera size={32} color={colors.textTertiary} style={{ marginBottom: Spacing.xs }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Local Snapshots</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Snapshots capture rolling offline restore points before major changes.
                </Text>
              </ElevatedCard>
            ) : (
              snapshots.map((snap) => (
                <ElevatedCard key={snap.id} style={styles.snapshotCard}>
                  <View style={styles.snapshotRow}>
                    <View style={styles.snapshotInfo}>
                      <Text style={[styles.snapshotName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {snap.name}
                      </Text>
                      <Text style={[styles.snapshotMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                        {snap.taskCount} tasks · {snap.projectCount} projects · {new Date(snap.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.snapshotActions}>
                      <AnimatedPressable
                        profile="smallControl"
                        onPress={() => handleRestoreSnapshot(snap)}
                        style={[styles.restoreSnapBtn, { backgroundColor: colors.accent + '18' }]}
                        accessibilityLabel={`Restore ${snap.name}`}
                      >
                        <RotateCcw size={13} color={colors.accent} style={{ marginRight: 4 }} />
                        <Text style={[styles.restoreSnapText, { color: colors.accent }]}>Restore</Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        profile="smallControl"
                        onPress={() => handleDeleteSnapshot(snap)}
                        style={styles.deleteSnapBtn}
                        accessibilityLabel={`Delete ${snap.name}`}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </AnimatedPressable>
                    </View>
                  </View>
                </ElevatedCard>
              ))
            )}

            {/* Privacy Guarantee */}
            <ElevatedCard style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <ShieldCheck size={18} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>100% Offline & Private</Text>
              </View>
              <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>
                Exported files and snapshots stay strictly under your control on your hardware. Password verifiers and sensitive tokens are permanently excluded from all exports.
              </Text>
            </ElevatedCard>
          </ScrollView>
        </View>
      </View>

      {/* --- RESTORE PREVIEW / PASTE MODAL --- */}
      <Modal visible={restoreModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ElevatedCard style={[styles.modalCard, { width: modalContainerWidth }, Shadows.floating]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {previewSummary ? 'Restore Preview' : 'Paste Backup JSON'}
              </Text>
              <AnimatedPressable profile="smallControl" onPress={() => setRestoreModalVisible(false)} style={styles.closeBtn} accessibilityLabel="Close dialog">
                <X size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            <ScrollView
              style={{ maxHeight: maxModalContentHeight }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing.sm }}
            >
              {previewSummary ? (
                <View style={styles.previewWrap}>
                  <Text style={[styles.previewDesc, { color: colors.textSecondary }]}>
                    Verified Taskora backup. Review items before restoring:
                  </Text>

                  {/* Summary Grid Badges */}
                  <View style={styles.badgeGrid}>
                    <View style={[styles.badgeItem, { backgroundColor: colors.secondaryBackground }]}>
                      <Text style={[styles.badgeValue, { color: colors.accent }]}>{previewSummary.taskCount}</Text>
                      <Text style={[styles.badgeLabel, { color: colors.textTertiary }]}>Tasks</Text>
                    </View>

                    <View style={[styles.badgeItem, { backgroundColor: colors.secondaryBackground }]}>
                      <Text style={[styles.badgeValue, { color: colors.accent }]}>{previewSummary.projectCount}</Text>
                      <Text style={[styles.badgeLabel, { color: colors.textTertiary }]}>Projects</Text>
                    </View>

                    <View style={[styles.badgeItem, { backgroundColor: colors.secondaryBackground }]}>
                      <Text style={[styles.badgeValue, { color: colors.warning }]}>{previewSummary.pinnedCount}</Text>
                      <Text style={[styles.badgeLabel, { color: colors.textTertiary }]}>Pinned</Text>
                    </View>

                    <View style={[styles.badgeItem, { backgroundColor: colors.secondaryBackground }]}>
                      <Text style={[styles.badgeValue, { color: '#FFCC00' }]}>{previewSummary.favoriteCount}</Text>
                      <Text style={[styles.badgeLabel, { color: colors.textTertiary }]}>Starred</Text>
                    </View>
                  </View>

                  {/* Restore Strategy Selection */}
                  <Text style={[styles.strategyTitle, { color: colors.textPrimary }]}>Restore Strategy:</Text>
                  <View style={styles.strategyRow}>
                    <AnimatedPressable
                      profile="smallControl"
                      onPress={() => setRestoreStrategy('merge')}
                      style={[
                        styles.strategyBtn,
                        {
                          backgroundColor: restoreStrategy === 'merge' ? colors.accent : colors.secondaryBackground,
                        },
                      ]}
                      accessibilityLabel="Merge with existing items"
                    >
                      <Text style={[styles.strategyText, { color: restoreStrategy === 'merge' ? '#FFFFFF' : colors.textPrimary }]}>
                        Merge Existing
                      </Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      profile="smallControl"
                      onPress={() => setRestoreStrategy('replace')}
                      style={[
                        styles.strategyBtn,
                        {
                          backgroundColor: restoreStrategy === 'replace' ? colors.error : colors.secondaryBackground,
                        },
                      ]}
                      accessibilityLabel="Replace current data"
                    >
                      <Text style={[styles.strategyText, { color: restoreStrategy === 'replace' ? '#FFFFFF' : colors.textPrimary }]}>
                        Replace All
                      </Text>
                    </AnimatedPressable>
                  </View>

                  <Text style={[styles.safetyNotice, { color: colors.textTertiary }]}>
                    ℹ️ A safety snapshot of your current data is created automatically before restoring.
                  </Text>

                  {/* Action Buttons */}
                  <View style={styles.modalBtnRow}>
                    <AnimatedPressable
                      profile="smallControl"
                      onPress={() => setRestoreModalVisible(false)}
                      style={[styles.cancelBtn, { backgroundColor: colors.secondaryBackground }]}
                      accessibilityLabel="Cancel restore"
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      profile="primaryButton"
                      onPress={handleExecuteRestore}
                      disabled={isRestoring}
                      style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
                      accessibilityLabel="Confirm restore"
                    >
                      {isRestoring ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Restore Data</Text>
                      )}
                    </AnimatedPressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={[styles.previewDesc, { color: colors.textSecondary }]}>
                    Paste JSON backup content to inspect and restore:
                  </Text>

                  <TextInput
                    value={pasteInput}
                    onChangeText={setPasteInput}
                    placeholder='{"format": "taskora-backup", "data": { ... }}'
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    style={[
                      styles.pasteTextArea,
                      { backgroundColor: colors.secondaryBackground, color: colors.textPrimary },
                    ]}
                  />

                  <AnimatedPressable
                    profile="primaryButton"
                    onPress={handleInspectPastedText}
                    style={[styles.confirmBtn, { backgroundColor: colors.accent, marginTop: Spacing.sm }]}
                    accessibilityLabel="Inspect pasted JSON"
                  >
                    <Text style={styles.confirmBtnText}>Inspect & Preview</Text>
                  </AnimatedPressable>
                </View>
              )}
            </ScrollView>
          </ElevatedCard>
        </View>
      </Modal>

      {/* --- EXPORT SUCCESS FEEDBACK MODAL --- */}
      <Modal visible={!!exportSuccessModal?.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ElevatedCard style={[styles.feedbackCard, { width: modalContainerWidth }, Shadows.floating]}>
            <View style={[styles.successIconBox, { backgroundColor: colors.success + '20' }]}>
              <CheckCircle2 size={32} color={colors.success} />
            </View>
            <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>
              {exportSuccessModal?.title || 'Export Complete'}
            </Text>
            <Text style={[styles.feedbackSub, { color: colors.textSecondary }]}>
              {exportSuccessModal?.subtitle}
            </Text>
            {exportSuccessModal?.filename ? (
              <View style={[styles.fileBadge, { backgroundColor: colors.secondaryBackground }]}>
                <Text style={[styles.fileBadgeText, { color: colors.textTertiary }]} numberOfLines={1}>
                  📄 {exportSuccessModal.filename}
                </Text>
              </View>
            ) : null}

            <AnimatedPressable
              profile="primaryButton"
              onPress={() => setExportSuccessModal(null)}
              style={[styles.doneBtn, { backgroundColor: colors.accent }]}
              accessibilityLabel="Done"
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </AnimatedPressable>
          </ElevatedCard>
        </View>
      </Modal>

      {/* --- EXPORT ERROR FEEDBACK MODAL --- */}
      <Modal visible={!!exportErrorModal?.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ElevatedCard style={[styles.feedbackCard, { width: modalContainerWidth }, Shadows.floating]}>
            <View style={[styles.successIconBox, { backgroundColor: colors.error + '20' }]}>
              <AlertCircle size={32} color={colors.error} />
            </View>
            <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>Unable to Export</Text>
            <Text style={[styles.feedbackSub, { color: colors.textSecondary }]}>
              {exportErrorModal?.message || 'Taskora could not generate the requested file.'}
            </Text>

            <View style={styles.modalBtnRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setExportErrorModal(null)}
                style={[styles.cancelBtn, { backgroundColor: colors.secondaryBackground }]}
                accessibilityLabel="Close"
              >
                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Close</Text>
              </AnimatedPressable>

              {exportErrorModal?.retryAction && (
                <AnimatedPressable
                  profile="primaryButton"
                  onPress={() => {
                    const act = exportErrorModal.retryAction;
                    setExportErrorModal(null);
                    if (act) act();
                  }}
                  style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
                  accessibilityLabel="Try Again"
                >
                  <Text style={styles.confirmBtnText}>Try Again</Text>
                </AnimatedPressable>
              )}
            </View>
          </ElevatedCard>
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
    paddingBottom: Spacing.xs,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    width: '100%',
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  addSnapshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  addSnapshotText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  actionCard: {
    width: '100%',
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  actionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  actionTextWrap: {
    flex: 1,
    flexShrink: 1,
  },
  actionTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    flexShrink: 1,
  },
  actionSub: {
    ...TypographyScale.caption1,
    marginTop: 2,
    lineHeight: 16,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptySub: {
    ...TypographyScale.footnote,
    textAlign: 'center',
    lineHeight: 18,
  },
  snapshotCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.xs,
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  snapshotInfo: {
    flex: 1,
  },
  snapshotName: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  snapshotMeta: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  snapshotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  restoreSnapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  restoreSnapText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  deleteSnapBtn: {
    padding: Spacing.xs,
  },
  privacyCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  privacyTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  privacyDesc: {
    ...TypographyScale.caption1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.md,
  },
  modalCard: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  previewWrap: {},
  previewDesc: {
    ...TypographyScale.footnote,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  badgeItem: {
    flex: 1,
    minWidth: 70,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  badgeValue: {
    ...TypographyScale.title3,
    fontWeight: '800',
  },
  badgeLabel: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    marginTop: 2,
  },
  strategyTitle: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  strategyBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strategyText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  safetyNotice: {
    ...TypographyScale.caption2,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pasteTextArea: {
    ...TypographyScale.caption1,
    minHeight: 120,
    maxHeight: 200,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    textAlignVertical: 'top',
    marginBottom: Spacing.sm,
  },
  feedbackCard: {
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  successIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  feedbackTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  feedbackSub: {
    ...TypographyScale.footnote,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  fileBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    marginBottom: Spacing.lg,
    maxWidth: '100%',
  },
  fileBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  doneBtn: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
  },
  doneBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
