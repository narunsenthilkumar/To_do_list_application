import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ShieldCheck,
  Activity,
  Trash2,
  Download,
  CheckCircle2,
  Lock,
  WifiOff,
} from 'lucide-react-native';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { AnimatedToggle } from '../../components/settings/AnimatedToggle';
import { DiagnosticsService, DiagnosticLog } from '../../diagnostics/DiagnosticsService';
import { useTheme } from '../../store/ThemeContext';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';

export default function PrivacyDiagnosticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);

  const loadData = async () => {
    const isEnabled = await DiagnosticsService.isDiagnosticsEnabled();
    const storedLogs = await DiagnosticsService.getLogs();
    setDiagnosticsEnabled(isEnabled);
    setLogs(storedLogs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleDiagnostics = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDiagnosticsEnabled(val);
    await DiagnosticsService.setDiagnosticsEnabled(val);
  };

  const handleExportReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const report = await DiagnosticsService.generateReport();
    Alert.alert('Diagnostic Report Ready', 'A private diagnostics report has been compiled for troubleshooting.', [
      { text: 'Done', style: 'cancel' },
    ]);
  };

  const handleClearLogs = async () => {
    Alert.alert('Clear Logs', 'Clear all local diagnostic logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await DiagnosticsService.clearLogs();
          await loadData();
        },
      },
    ]);
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
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy & Diagnostics</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Privacy Architecture Guarantee Card */}
            <ElevatedCard style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <ShieldCheck size={22} color={colors.success} style={{ marginRight: 8 }} />
                <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>
                  Taskora Privacy Architecture
                </Text>
              </View>

              <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>
                Taskora is built from the ground up as a zero-cloud, local-first application. Your productivity data remains exclusively on your hardware.
              </Text>

              <View style={styles.pointsList}>
                <View style={styles.pointRow}>
                  <Lock size={15} color={colors.accent} style={styles.pointIcon} />
                  <Text style={[styles.pointText, { color: colors.textSecondary }]}>
                    No central database or analytics servers
                  </Text>
                </View>
                <View style={styles.pointRow}>
                  <WifiOff size={15} color={colors.accent} style={styles.pointIcon} />
                  <Text style={[styles.pointText, { color: colors.textSecondary }]}>
                    100% of tasks, notes, and calendar events execute offline
                  </Text>
                </View>
                <View style={styles.pointRow}>
                  <CheckCircle2 size={15} color={colors.accent} style={styles.pointIcon} />
                  <Text style={[styles.pointText, { color: colors.textSecondary }]}>
                    Synchronization connects directly over local Wi-Fi / LAN
                  </Text>
                </View>
              </View>
            </ElevatedCard>

            {/* Diagnostics Controls */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>LOCAL DIAGNOSTICS</Text>
            <ElevatedCard style={styles.cardSection}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                    Record Local Diagnostics
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.textTertiary }]}>
                    Logs sync events and database errors locally to assist with troubleshooting (OFF by default)
                  </Text>
                </View>
                <AnimatedToggle value={diagnosticsEnabled} onValueChange={handleToggleDiagnostics} />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <AnimatedPressable profile="smallControl" onPress={handleExportReport} style={styles.actionBtn}>
                <Download size={18} color={colors.accent} style={{ marginRight: Spacing.md }} />
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                  Export Diagnostic Report (JSON)
                </Text>
              </AnimatedPressable>

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <AnimatedPressable profile="smallControl" onPress={handleClearLogs} style={styles.actionBtn}>
                <Trash2 size={18} color={colors.error} style={{ marginRight: Spacing.md }} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Clear Diagnostic Logs</Text>
              </AnimatedPressable>
            </ElevatedCard>

            {/* Log Viewer */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>RECENT EVENTS</Text>
            {logs.length === 0 ? (
              <ElevatedCard style={styles.emptyCard}>
                <Activity size={28} color={colors.textTertiary} style={{ marginBottom: 4 }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Diagnostic Logs</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {diagnosticsEnabled ? 'System running smoothly.' : 'Diagnostics logging is currently turned off.'}
                </Text>
              </ElevatedCard>
            ) : (
              logs.map((log) => (
                <ElevatedCard key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <Text
                      style={[
                        styles.logLevel,
                        {
                          color:
                            log.level === 'error'
                              ? colors.error
                              : log.level === 'warn'
                              ? colors.warning
                              : colors.accent,
                        },
                      ]}
                    >
                      [{log.category.toUpperCase()}] {log.level.toUpperCase()}
                    </Text>
                    <Text style={[styles.logTime, { color: colors.textTertiary }]}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={[styles.logMsg, { color: colors.textPrimary }]}>{log.message}</Text>
                </ElevatedCard>
              ))
            )}
          </ScrollView>
        </View>
      </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  privacyCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
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
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  pointsList: {
    gap: Spacing.xs,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointIcon: {
    marginRight: Spacing.sm,
  },
  pointText: {
    ...TypographyScale.footnote,
    flex: 1,
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  cardSection: {
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  toggleTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  toggleSub: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  actionBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptySub: {
    ...TypographyScale.footnote,
    textAlign: 'center',
  },
  logCard: {
    padding: Spacing.sm + 2,
    borderRadius: Radii.md,
    marginBottom: Spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  logLevel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  logTime: {
    ...TypographyScale.caption2,
  },
  logMsg: {
    ...TypographyScale.footnote,
  },
});
