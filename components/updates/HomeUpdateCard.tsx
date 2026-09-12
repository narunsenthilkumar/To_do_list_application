import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowUpCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { updateService } from '../../services/updates/UpdateService';
import { UpdateState } from '../../services/updates/UpdateTypes';
import { haptics } from '../../services/haptics';

export const HomeUpdateCard: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [updateState, setUpdateState] = useState<UpdateState>(updateService.getState());

  useEffect(() => {
    // Only active on Android
    if (Platform.OS !== 'android') return;

    const unsubscribe = updateService.subscribe(setUpdateState);
    // Trigger non-intrusive background check on mount
    updateService.checkForUpdates(false);

    return () => {
      unsubscribe();
    };
  }, []);

  if (Platform.OS !== 'android') return null;

  const { status, manifest, isMandatory, downloadProgress, errorMessage } = updateState;

  // Don't render card if nothing to update or idle
  if (
    status === 'idle' ||
    status === 'checking' ||
    status === 'up_to_date' ||
    !manifest
  ) {
    return null;
  }

  const handleStartUpdate = () => {
    haptics.medium();
    updateService.downloadUpdate();
  };

  const handleInstall = () => {
    haptics.success();
    updateService.installUpdate();
  };

  const handleDismiss = () => {
    haptics.light();
    updateService.dismissUpdate();
  };

  // If update is MANDATORY, show blocking full-screen modal
  if (isMandatory) {
    return (
      <Modal visible={true} transparent={false} animationType="fade">
        <View
          style={[
            styles.mandatoryModalContainer,
            { backgroundColor: isDark ? '#0D0E12' : '#F2F2F7' },
          ]}
        >
          <View
            style={[
              styles.mandatoryDialog,
              {
                backgroundColor: isDark ? '#1C1D24' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              },
              Shadows.floating,
            ]}
          >
            <View style={styles.mandatoryIconCircle}>
              <ArrowUpCircle size={40} color={colors.accent} />
            </View>

            <Text style={[styles.mandatoryTitle, { color: colors.textPrimary }]}>
              Update Required
            </Text>
            <Text style={[styles.mandatorySubtitle, { color: colors.textTertiary }]}>
              A critical update ({manifest.latestVersion}) is required to continue using KIVENTA securely.
            </Text>

            {manifest.releaseNotes && manifest.releaseNotes.length > 0 && (
              <View
                style={[
                  styles.releaseNotesBox,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  },
                ]}
              >
                <Text style={[styles.releaseNotesHeader, { color: colors.textSecondary }]}>
                  What's New:
                </Text>
                {manifest.releaseNotes.map((note, idx) => (
                  <Text key={idx} style={[styles.noteBullet, { color: colors.textPrimary }]}>
                    • {note}
                  </Text>
                ))}
              </View>
            )}

            {status === 'downloading' || status === 'verifying' ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                    {status === 'verifying' ? 'Verifying checksum...' : 'Downloading update...'}
                  </Text>
                  <Text style={[styles.progressPercent, { color: colors.accent }]}>
                    {downloadProgress}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarTrack,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      { backgroundColor: colors.accent, width: `${downloadProgress}%` },
                    ]}
                  />
                </View>
              </View>
            ) : status === 'ready_to_install' ? (
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
                onPress={handleInstall}
              >
                <Download size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>Install Now</Text>
              </Pressable>
            ) : status === 'error' ? (
              <View style={{ width: '100%', gap: 8 }}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errorMessage || 'Download error. Please try again.'}
                </Text>
                <Pressable
                  style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
                  onPress={handleStartUpdate}
                >
                  <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Retry Download</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={[styles.primaryActionBtn, { backgroundColor: colors.accent }]}
                onPress={handleStartUpdate}
              >
                <Download size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>Download & Update</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  // Non-blocking Card Banner on Today feed
  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 122, 255, 0.05)',
          borderColor: isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.2)',
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.accent + '25' }]}>
            <Sparkles size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              KIVENTA {manifest.latestVersion} Available
            </Text>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
              New features and performance improvements
            </Text>
          </View>
        </View>

        {status !== 'downloading' && (
          <Pressable style={styles.dismissBtn} onPress={handleDismiss} hitSlop={8}>
            <X size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {manifest.releaseNotes && manifest.releaseNotes.length > 0 && (
        <View style={styles.notesContainer}>
          {manifest.releaseNotes.slice(0, 2).map((note, idx) => (
            <Text key={idx} style={[styles.cardNote, { color: colors.textSecondary }]} numberOfLines={1}>
              • {note}
            </Text>
          ))}
        </View>
      )}

      {/* Progress or Actions */}
      {status === 'downloading' || status === 'verifying' ? (
        <View style={styles.cardProgressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {status === 'verifying' ? 'Verifying APK...' : 'Downloading APK...'}
            </Text>
            <Text style={[styles.progressPercent, { color: colors.accent }]}>
              {downloadProgress}%
            </Text>
          </View>
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: colors.accent, width: `${downloadProgress}%` },
              ]}
            />
          </View>
        </View>
      ) : status === 'ready_to_install' ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleInstall}
          >
            <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Install Now</Text>
          </Pressable>
        </View>
      ) : status === 'error' ? (
        <View style={styles.actionRow}>
          <Text style={[styles.cardErrorText, { color: colors.error }]}>
            {errorMessage || 'Failed to download update.'}
          </Text>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleStartUpdate}
          >
            <RefreshCw size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.secondaryBtn,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              },
            ]}
            onPress={handleDismiss}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Later</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.accent }]}
            onPress={handleStartUpdate}
          >
            <Download size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Update Now</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  cardSub: {
    ...TypographyScale.caption2,
  },
  dismissBtn: {
    padding: 4,
    cursor: 'pointer' as any,
  },
  notesContainer: {
    gap: 2,
    paddingLeft: Spacing.xs,
  },
  cardNote: {
    ...TypographyScale.footnote,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  actionBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radii.sm,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  secondaryBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  cardProgressContainer: {
    gap: 6,
    marginTop: 2,
  },
  progressContainer: {
    width: '100%',
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...TypographyScale.caption1,
    fontWeight: '500',
  },
  progressPercent: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardErrorText: {
    ...TypographyScale.caption2,
    flex: 1,
  },
  // Mandatory update modal styles
  mandatoryModalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  mandatoryDialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  mandatoryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mandatoryTitle: {
    ...TypographyScale.title3,
    fontWeight: '800',
    textAlign: 'center',
  },
  mandatorySubtitle: {
    ...TypographyScale.subhead,
    textAlign: 'center',
  },
  releaseNotesBox: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radii.sm,
    gap: 4,
  },
  releaseNotesHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  noteBullet: {
    ...TypographyScale.footnote,
  },
  primaryActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  primaryActionBtnText: {
    ...TypographyScale.body,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    ...TypographyScale.footnote,
    textAlign: 'center',
  },
});
