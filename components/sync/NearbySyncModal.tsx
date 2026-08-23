import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  AccessibilityInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Sliders } from 'lucide-react-native';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { useTheme } from '../../store/ThemeContext';
import {
  NearbySessionState,
  NearbyDevice,
  NearbyVerificationContext,
  NearbySessionSummary,
  NearbySimulationScenario,
  ProximityLevel,
  TransferDirection,
} from '../../sync/nearby/types';
import { NearbySession } from '../../sync/nearby/NearbySession';
import { NearbySimulation } from '../../sync/nearby/NearbySimulation';
import { NearbySyncAnimation } from '../nearby/NearbySyncAnimation';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export function NearbySyncModal({ visible, onClose, onSyncComplete }: Props) {
  const { colors, isDark } = useTheme();
  const sessionRef = useRef<NearbySession | null>(null);

  const [sessionState, setSessionState] = useState<NearbySessionState>('IDLE');
  const [targetDevice, setTargetDevice] = useState<NearbyDevice | null>(null);
  const [proximity, setProximity] = useState<ProximityLevel>('UNKNOWN');
  const [verificationContext, setVerificationContext] = useState<NearbyVerificationContext | null>(null);
  const [summary, setSummary] = useState<NearbySessionSummary | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [stageName, setStageName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [isSimMode, setIsSimMode] = useState<boolean>(false);
  const [simScenario, setSimScenario] = useState<NearbySimulationScenario>('SUCCESS_WITH_BUMP');
  const [direction, setDirection] = useState<TransferDirection>('BIDIRECTIONAL');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });
  }, []);

  // Initialize and tear down session
  useEffect(() => {
    if (visible) {
      const session = new NearbySession();
      sessionRef.current = session;

      const unsubState = session.onStateChange((state, detail) => {
        setSessionState(state);
        if (state === 'ERROR') {
          setErrorMessage(detail || session.getErrorMessage() || 'An error occurred during Nearby Sync.');
        }
      });

      const unsubProgress = session.onProgress((percent, stage) => {
        setProgressPercent(percent);
        setStageName(stage);
      });

      const unsubDevice = session.onDevice((dev) => {
        setTargetDevice(dev);
        if (dev) {
          setProximity(dev.proximity);
        }
      });

      const unsubProximity = session.onProximityChange((prox) => {
        setProximity(prox);
      });

      const unsubVerification = session.onVerification((ctx) => {
        setVerificationContext(ctx);
      });

      const unsubSummary = session.onSummary((sum) => {
        setSummary(sum);
        if (sum && onSyncComplete) {
          onSyncComplete();
        }
      });

      setDirection(session.getTransferDirection());

      // Auto start session
      session.startSession(isSimMode);

      return () => {
        unsubState();
        unsubProgress();
        unsubDevice();
        unsubProximity();
        unsubVerification();
        unsubSummary();
        session.cleanup();
      };
    }
  }, [visible, isSimMode]);

  const handleRestart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    NearbySimulation.setScenario(simScenario);
    sessionRef.current?.startSession(isSimMode);
  };

  const handleConnectTarget = () => {
    if (targetDevice && sessionRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      sessionRef.current.connectToDevice(targetDevice);
    }
  };

  const handleConfirmVerification = () => {
    if (sessionRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      sessionRef.current.confirmVerification();
    }
  };

  const handleTriggerBump = () => {
    if (sessionRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      sessionRef.current.triggerBump();
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sessionRef.current?.cancelSession();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.container, { backgroundColor: isDark ? '#12161F' : '#FFFFFF' }]}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Nearby Sync</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Bump to share tasks & projects
              </Text>
            </View>
            <AnimatedPressable profile="smallControl" onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>

          {/* MASTER BUMP-TO-SHARE ANIMATION CANVAS */}
          <NearbySyncAnimation
            sessionState={sessionState}
            proximity={proximity}
            transferProgress={progressPercent}
            direction={direction}
            verificationCode={verificationContext?.code}
            summary={summary}
            errorMessage={errorMessage}
            targetDeviceName={targetDevice?.deviceName || 'Nearby Device'}
            stageName={stageName}
            onCancel={handleClose}
            onRetry={handleRestart}
            onConfirmVerification={handleConfirmVerification}
            onConnect={handleConnectTarget}
            onTriggerBump={handleTriggerBump}
            reduceMotion={reduceMotion}
          />

          {/* SIMULATION CONTROLS FOR DEVELOPMENT / DEMONSTRATION */}
          <View style={[styles.simBar, { borderTopColor: colors.separator }]}>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                const next = !isSimMode;
                setIsSimMode(next);
                NearbySimulation.setSimulationActive(next);
                if (next) {
                  NearbySimulation.setScenario(simScenario);
                  sessionRef.current?.startSession(true);
                }
              }}
              style={[
                styles.simToggleBtn,
                { backgroundColor: isSimMode ? colors.accent + '25' : colors.secondaryBackground },
              ]}
            >
              <Sliders size={13} color={isSimMode ? colors.accent : colors.textTertiary} style={{ marginRight: 5 }} />
              <Text style={[styles.simToggleText, { color: isSimMode ? colors.accent : colors.textTertiary }]}>
                {isSimMode ? 'Simulation: Active' : 'Enable Dev Simulation'}
              </Text>
            </AnimatedPressable>

            {isSimMode && (
              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  const scenarios: NearbySimulationScenario[] = [
                    'SUCCESS_WITH_BUMP',
                    'SUCCESS_WITH_VERIFY',
                    'SUCCESS_INSTANT',
                    'WRONG_CODE',
                    'TIMEOUT',
                    'PROTOCOL_MISMATCH',
                    'MALFORMED_PAYLOAD',
                  ];
                  const nextIdx = (scenarios.indexOf(simScenario) + 1) % scenarios.length;
                  const nextScen = scenarios[nextIdx];
                  setSimScenario(nextScen);
                  NearbySimulation.setScenario(nextScen);
                  sessionRef.current?.startSession(true);
                }}
                style={[styles.simScenarioBtn, { backgroundColor: colors.secondaryBackground }]}
              >
                <Text style={[styles.simScenarioText, { color: colors.textSecondary }]}>{simScenario}</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radii.pill,
  },
  simBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  simToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  simToggleText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  simScenarioBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radii.pill,
  },
  simScenarioText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
});
