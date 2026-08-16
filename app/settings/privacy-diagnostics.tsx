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
  Mic,
  Volume2,
  Copy,
  Play,
  Square,
} from 'lucide-react-native';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { AnimatedToggle } from '../../components/settings/AnimatedToggle';
import { DiagnosticsService, DiagnosticLog } from '../../diagnostics/DiagnosticsService';
import { VoiceService, MicrophoneDiagnostics } from '../../services/voice';
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
  const [micDiagnostics, setMicDiagnostics] = useState<MicrophoneDiagnostics | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [testSpeechResult, setTestSpeechResult] = useState('');

  const loadData = async () => {
    const isEnabled = await DiagnosticsService.isDiagnosticsEnabled();
    const storedLogs = await DiagnosticsService.getLogs();
    setDiagnosticsEnabled(isEnabled);
    setLogs(storedLogs);

    try {
      const diag = await VoiceService.getDiagnostics();
      setMicDiagnostics(diag);
    } catch {}
  };

  useEffect(() => {
    loadData();
    return () => {
      VoiceService.stopListening();
    };
  }, []);

  const handleToggleDiagnostics = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDiagnosticsEnabled(val);
    await DiagnosticsService.setDiagnosticsEnabled(val);
  };

  const handleExportReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await DiagnosticsService.generateReport();
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

  const handleRequestMicPerm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await VoiceService.requestPermission();
    await loadData();
    Alert.alert('Microphone Permission', `Result: ${res.toUpperCase()}`);
  };

  const handleToggleMicTest = async () => {
    if (isMicTesting) {
      VoiceService.stopListening();
      setIsMicTesting(false);
      setAudioLevel(0);
      await loadData();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMicTesting(true);
    setTestSpeechResult('');

    VoiceService.setAudioLevelCallback((lvl) => {
      setAudioLevel(lvl);
    });

    await VoiceService.startListening(
      (result) => {
        setTestSpeechResult(result.text);
      },
      (err) => {
        Alert.alert('Microphone Test Error', err);
        setIsMicTesting(false);
        setAudioLevel(0);
      },
      () => {
        setIsMicTesting(false);
        setAudioLevel(0);
        loadData();
      }
    );
    await loadData();
  };

  const handleCopyDiagnostics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const diagStr = JSON.stringify(micDiagnostics, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(diagStr);
    }
    Alert.alert('Diagnostics Copied', 'Microphone and system diagnostics copied to clipboard.');
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
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>System & Diagnostics</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 30 }]}>
            {/* Local Security Guarantee */}
            <ElevatedCard style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <ShieldCheck size={24} color={colors.success} style={{ marginRight: 10 }} />
                <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>
                  Privacy & Diagnostics
                </Text>
              </View>
              <Text style={[styles.privacyDesc, { color: colors.textSecondary }]}>
                Taskora operates 100% offline. No telemetry, audio, or database records leave your device.
              </Text>
              <View style={styles.pointsList}>
                <View style={styles.pointRow}>
                  <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 8 }} />
                  <Text style={[styles.pointText, { color: colors.textPrimary }]}>
                    Zero external analytics or third-party SDKs
                  </Text>
                </View>
                <View style={styles.pointRow}>
                  <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 8 }} />
                  <Text style={[styles.pointText, { color: colors.textPrimary }]}>
                    On-device SQLite & AES encrypted storage
                  </Text>
                </View>
              </View>
            </ElevatedCard>

            {/* Microphone Diagnostics Card */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>MICROPHONE & SPEECH DIAGNOSTICS</Text>
            <ElevatedCard style={styles.cardSection}>
              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: colors.textTertiary }]}>Platform Engine:</Text>
                <Text style={[styles.diagValue, { color: colors.textPrimary }]}>
                  {micDiagnostics?.platform || 'Detecting...'}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: colors.textTertiary }]}>Permission Status:</Text>
                <Text
                  style={[
                    styles.diagValue,
                    {
                      color:
                        micDiagnostics?.permissionStatus === 'granted'
                          ? colors.success
                          : colors.warning,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {(micDiagnostics?.permissionStatus || 'undetermined').toUpperCase()}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: colors.textTertiary }]}>getUserMedia API:</Text>
                <Text style={[styles.diagValue, { color: micDiagnostics?.getUserMediaAvailable ? colors.success : colors.error }]}>
                  {micDiagnostics?.getUserMediaAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: colors.textTertiary }]}>MediaRecorder Support:</Text>
                <Text style={[styles.diagValue, { color: colors.textPrimary }]}>
                  {micDiagnostics?.supportedMimeType || 'Available'}
                </Text>
              </View>

              <View style={styles.diagRow}>
                <Text style={[styles.diagLabel, { color: colors.textTertiary }]}>Speech-to-Text Provider:</Text>
                <Text style={[styles.diagValue, { color: colors.accent, fontWeight: '600' }]}>
                  {micDiagnostics?.speechProvider || 'On-Device Recognizer'}
                </Text>
              </View>

              {isMicTesting && (
                <View style={styles.liveMeterBox}>
                  <View style={styles.liveMeterHeader}>
                    <Volume2 size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={[styles.liveMeterTitle, { color: colors.textPrimary }]}>Live Audio Level: {audioLevel}%</Text>
                  </View>
                  <View style={[styles.meterTrack, { backgroundColor: colors.subtleBorder }]}>
                    <View style={[styles.meterFill, { width: `${audioLevel}%`, backgroundColor: colors.accent }]} />
                  </View>
                  {testSpeechResult ? (
                    <Text style={[styles.liveSpeechText, { color: colors.textPrimary }]}>
                      "{testSpeechResult}"
                    </Text>
                  ) : null}
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <View style={styles.btnRowWrap}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleRequestMicPerm}
                  style={[styles.smallActionBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.smallBtnText, { color: colors.textPrimary }]}>Request Permission</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleToggleMicTest}
                  style={[
                    styles.smallActionBtn,
                    { backgroundColor: isMicTesting ? colors.error : colors.accent },
                  ]}
                >
                  <Text style={[styles.smallBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                    {isMicTesting ? 'Stop Mic Test' : 'Test Microphone & Speech'}
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleCopyDiagnostics}
                  style={[styles.smallActionBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Copy size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.smallBtnText, { color: colors.textSecondary }]}>Copy Info</Text>
                </AnimatedPressable>
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
  pointText: {
    ...TypographyScale.caption1,
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    marginTop: Spacing.sm,
  },
  cardSection: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  diagLabel: {
    ...TypographyScale.caption1,
  },
  diagValue: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  liveMeterBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  liveMeterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  liveMeterTitle: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  liveSpeechText: {
    ...TypographyScale.body,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  btnRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  smallBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    ...TypographyScale.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleSub: {
    ...TypographyScale.caption1,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  actionBtnText: {
    ...TypographyScale.body,
    fontWeight: '600',
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  emptySub: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    marginTop: 2,
  },
  logCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
