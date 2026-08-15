import React, { useState } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { X, CheckCircle2, AlertCircle, Upload, FileCode } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../store/ThemeContext';
import { Repository } from '../../services/storage/repository';
import { RestoreService, BackupPreviewSummary } from '../../backup/RestoreService';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';

interface ImportDataSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportDataSheet: React.FC<ImportDataSheetProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [jsonText, setJsonText] = useState('');
  const [previewSummary, setPreviewSummary] = useState<BackupPreviewSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessState, setIsSuccessState] = useState(false);
  const [restoreStrategy, setRestoreStrategy] = useState<'merge' | 'replace'>('merge');

  React.useEffect(() => {
    if (!visible) {
      setJsonText('');
      setPreviewSummary(null);
      setErrorMessage(null);
      setIsSuccessState(false);
    }
  }, [visible]);

  const isSmallDevice = windowWidth < 360;
  const sheetWidth = Math.min(windowWidth - (isSmallDevice ? 16 : 32), 500);

  const handleValidateAndParse = (text: string) => {
    setJsonText(text);
    setErrorMessage(null);
    setPreviewSummary(null);

    if (!text.trim()) return;

    try {
      const summary = RestoreService.validateAndPreviewBackup(text.trim());
      setPreviewSummary(summary);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Unable to parse backup JSON.');
    }
  };

  const handlePickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

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

      if (content) {
        setJsonText(content);
        handleValidateAndParse(content);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Could not read chosen file.');
    }
  };

  const handleRestore = async () => {
    if (!previewSummary) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await RestoreService.restoreFromPreview(previewSummary, restoreStrategy);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsSuccessState(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(e?.message || 'Failed to restore backup data.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />

          <View
            style={[
              styles.sheetContainer,
              {
                width: sheetWidth,
                backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
                borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
                maxHeight: windowHeight - 80,
              },
              Shadows.floating,
            ]}
          >
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.titleRow}>
                <Upload size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Import Taskora Backup</Text>
              </View>
              <AnimatedPressable profile="smallControl" onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close dialog">
                <X size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            {isSuccessState ? (
              <View style={styles.successContainer}>
                <CheckCircle2 size={48} color={colors.success} style={{ marginBottom: 12 }} />
                <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Restore Complete</Text>
                <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                  Your workspaces and tasks have been restored successfully!
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* Pick File CTA */}
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handlePickDocument}
                  style={[styles.pickFileBtn, { backgroundColor: colors.secondaryBackground }]}
                  accessibilityLabel="Choose backup file"
                >
                  <FileCode size={18} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={[styles.pickFileText, { color: colors.textPrimary }]}>Choose JSON File...</Text>
                </AnimatedPressable>

                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  Or paste your Taskora backup JSON string below:
                </Text>

                <TextInput
                  value={jsonText}
                  onChangeText={handleValidateAndParse}
                  placeholder='{"format": "taskora-backup", "data": { ... }}'
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.jsonInput,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.secondaryBackground,
                      borderColor: errorMessage ? colors.error : colors.subtleBorder,
                    },
                  ]}
                  multiline
                />

                {/* Validation Error Message */}
                {errorMessage && (
                  <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
                    <AlertCircle size={18} color={colors.error} style={{ marginRight: 8 }} />
                    <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                  </View>
                )}

                {/* Parsed Summary Preview Card */}
                {previewSummary && !errorMessage && (
                  <View style={[styles.summaryCard, { backgroundColor: colors.accent + '12' }]}>
                    <Text style={[styles.summaryTitle, { color: colors.accent }]}>DATA BACKUP PREVIEW</Text>
                    <View style={styles.summaryGrid}>
                      <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                        • {previewSummary.taskCount} tasks
                      </Text>
                      <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                        • {previewSummary.projectCount} projects
                      </Text>
                      <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                        • {previewSummary.tagCount} tags
                      </Text>
                      <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                        • {previewSummary.pinnedCount} pinned
                      </Text>
                    </View>

                    {/* Restore Strategy Selection */}
                    <Text style={[styles.strategyLabel, { color: colors.textSecondary }]}>Strategy:</Text>
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
                      >
                        <Text style={[styles.strategyBtnText, { color: restoreStrategy === 'merge' ? '#FFFFFF' : colors.textPrimary }]}>
                          Merge
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
                      >
                        <Text style={[styles.strategyBtnText, { color: restoreStrategy === 'replace' ? '#FFFFFF' : colors.textPrimary }]}>
                          Replace All
                        </Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                )}

                <View style={styles.sheetFooter}>
                  <AnimatedPressable
                    profile="primaryButton"
                    onPress={handleRestore}
                    disabled={!previewSummary || !!errorMessage}
                    style={[
                      styles.restoreBtn,
                      {
                        backgroundColor: colors.accent,
                        opacity: !previewSummary || !!errorMessage ? 0.4 : 1,
                      },
                    ]}
                    accessibilityLabel="Restore Data"
                  >
                    <Text style={styles.restoreBtnText}>Restore Data</Text>
                  </AnimatedPressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    width: '100%',
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  sheetTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  scrollBody: {
    marginVertical: Spacing.xs,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  pickFileText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  instructionText: {
    ...TypographyScale.caption1,
    marginBottom: Spacing.xs,
  },
  jsonInput: {
    ...TypographyScale.caption1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    height: 110,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    flex: 1,
  },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  summaryTitle: {
    ...TypographyScale.caption2,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
    width: '45%',
  },
  strategyLabel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    marginBottom: 4,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  strategyBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  strategyBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  sheetFooter: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  restoreBtn: {
    height: 46,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...TypographyScale.title2,
    fontWeight: '700',
  },
  successSubtitle: {
    ...TypographyScale.footnote,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
});
