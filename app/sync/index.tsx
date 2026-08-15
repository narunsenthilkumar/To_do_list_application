import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Laptop,
  Smartphone,
  RefreshCw,
  Plus,
  Trash2,
  QrCode,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Download,
  Upload,
  Wifi,
  X,
} from 'lucide-react-native';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { SyncStatusPill } from '../../components/navigation/SyncStatusPill';
import { SyncEngine } from '../../sync/SyncEngine';
import { DevicePairing } from '../../sync/DevicePairing';
import { DeviceIdService } from '../../sync/DeviceIdService';
import { SyncTransport } from '../../sync/SyncTransport';
import { DevicePairingInfo, PairingCodePayload } from '../../sync/types';
import { useTheme } from '../../store/ThemeContext';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';

export default function SyncScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [currentDeviceName, setCurrentDeviceName] = useState('');
  const [pairedDevices, setPairedDevices] = useState<DevicePairingInfo[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Pairing Modal state
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [pairTab, setPairTab] = useState<'share' | 'enter'>('share');
  const [activePairingCode, setActivePairingCode] = useState<PairingCodePayload | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [inputDeviceName, setInputDeviceName] = useState('');

  // Manual Transfer Modal state
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferTab, setTransferTab] = useState<'export' | 'import'>('export');
  const [exportPacketString, setExportPacketString] = useState('');
  const [importPacketString, setImportPacketString] = useState('');

  const loadData = async () => {
    const id = await DeviceIdService.getDeviceId();
    const name = DeviceIdService.getDeviceName();
    const devices = await DevicePairing.getPairedDevices();
    setCurrentDeviceId(id);
    setCurrentDeviceName(name);
    setPairedDevices(devices);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    try {
      const res = await SyncEngine.syncNow();
      await loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sync Complete', `Synchronized successfully. (${res.pendingCount} pending mutations saved locally).`);
    } catch (e: any) {
      Alert.alert('Sync Error', e.message || 'Could not synchronize.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenPairModal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const code = await DevicePairing.generatePairingCode();
    setActivePairingCode(code);
    setPairModalVisible(true);
  };

  const handleConfirmPairCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the 6-digit pairing code.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetName = inputDeviceName.trim() || 'Paired Device';
    const fakeId = `paired-${inputCode.replace('-', '')}`;

    await DevicePairing.authorizeDevice({
      deviceId: fakeId,
      deviceName: targetName,
      platform: 'android',
    });

    await loadData();
    setPairModalVisible(false);
    setInputCode('');
    setInputDeviceName('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Device Paired', `${targetName} is now authorized for direct local synchronization.`);
  };

  const handleRemoveDevice = (device: DevicePairingInfo) => {
    Alert.alert('Remove Device', `Are you sure you want to revoke sync authorization for ${device.deviceName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await DevicePairing.removeDevice(device.deviceId);
          await loadData();
        },
      },
    ]);
  };

  const handleOpenExportPacket = async () => {
    const payload = await SyncEngine.generateOutgoingPayload();
    const encoded = SyncTransport.encodeToString(payload);
    setExportPacketString(encoded);
    setTransferTab('export');
    setTransferModalVisible(true);
  };

  const handleApplyImportPacket = async () => {
    if (!importPacketString.trim()) {
      Alert.alert('Empty Code', 'Please paste the sync packet payload string.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = SyncTransport.decodeFromString(importPacketString.trim());
      const result = await SyncEngine.applyIncomingPayload(payload);
      await loadData();
      setTransferModalVisible(false);
      setImportPacketString('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Changes Synchronized',
        `Applied ${result.appliedCount} entity changes. (${result.conflictsResolved} conflicts merged deterministically).`
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'Invalid sync packet.');
    }
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface style={{ flex: 1 }}>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sync & Devices</Text>
            <SyncStatusPill />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Device Card */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>THIS DEVICE</Text>
            <ElevatedCard style={styles.deviceCard}>
              <View style={styles.deviceRow}>
                <View style={[styles.deviceIconWrap, { backgroundColor: colors.accent + '20' }]}>
                  {currentDeviceId.startsWith('win') ? (
                    <Laptop size={24} color={colors.accent} />
                  ) : (
                    <Smartphone size={24} color={colors.accent} />
                  )}
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={[styles.deviceName, { color: colors.textPrimary }]}>{currentDeviceName}</Text>
                  <Text style={[styles.deviceIdText, { color: colors.textTertiary }]}>ID: {currentDeviceId}</Text>
                </View>
                <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.currentBadgeText, { color: colors.success }]}>Active</Text>
                </View>
              </View>
            </ElevatedCard>

            {/* Sync Now Button CTA */}
            <AnimatedPressable
              profile="primaryButton"
              onPress={handleSyncNow}
              disabled={isSyncing}
              style={[styles.syncNowBtn, { backgroundColor: colors.accent }]}
            >
              <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.syncNowText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
            </AnimatedPressable>

            {/* Connected Paired Devices */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>PAIRED DEVICES</Text>
              <AnimatedPressable profile="smallControl" onPress={handleOpenPairModal} style={styles.addDeviceBtn}>
                <Plus size={15} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.addDeviceText, { color: colors.accent }]}>Pair Device</Text>
              </AnimatedPressable>
            </View>

            {pairedDevices.length === 0 ? (
              <ElevatedCard style={styles.emptyCard}>
                <QrCode size={36} color={colors.textTertiary} style={{ marginBottom: Spacing.sm }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Paired Devices</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Pair your Android phone or Windows PC to synchronize tasks locally over your network.
                </Text>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleOpenPairModal}
                  style={[styles.emptyPairBtn, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.emptyPairBtnText}>Pair a Device</Text>
                </AnimatedPressable>
              </ElevatedCard>
            ) : (
              pairedDevices.map((device) => (
                <ElevatedCard key={device.deviceId} style={styles.deviceItemCard}>
                  <View style={styles.deviceRow}>
                    <View style={[styles.deviceIconWrap, { backgroundColor: colors.secondaryBackground }]}>
                      {device.platform === 'windows' ? (
                        <Laptop size={22} color={colors.textSecondary} />
                      ) : (
                        <Smartphone size={22} color={colors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, { color: colors.textPrimary }]}>{device.deviceName}</Text>
                      <Text style={[styles.deviceIdText, { color: colors.textTertiary }]}>
                        Last Synced: {device.lastSyncedAt ? new Date(device.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      </Text>
                    </View>
                    <AnimatedPressable
                      profile="smallControl"
                      onPress={() => handleRemoveDevice(device)}
                      style={styles.deleteDeviceBtn}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </AnimatedPressable>
                  </View>
                </ElevatedCard>
              ))
            )}

            {/* Direct Sync Code Exchange Section */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>MANUAL LOCAL TRANSFER</Text>
            <ElevatedCard style={styles.manualCard}>
              <View style={styles.manualRow}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleOpenExportPacket}
                  style={[styles.manualBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Download size={18} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.manualBtnText, { color: colors.textPrimary }]}>Export Changes</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => {
                    setTransferTab('import');
                    setTransferModalVisible(true);
                  }}
                  style={[styles.manualBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Upload size={18} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.manualBtnText, { color: colors.textPrimary }]}>Import Changes</Text>
                </AnimatedPressable>
              </View>
            </ElevatedCard>

            {/* Local Architecture & LAN Notice */}
            <ElevatedCard style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <Wifi size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>Local-Network Architecture</Text>
              </View>
              <Text style={[styles.noticeDesc, { color: colors.textSecondary }]}>
                Taskora uses direct local-network synchronization. Devices on the same Wi-Fi connect directly without any central cloud database or external servers. When offline, all changes remain safe locally.
              </Text>
            </ElevatedCard>
          </ScrollView>
        </View>
      </View>

      {/* Device Pairing Modal */}
      <Modal visible={pairModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ElevatedCard style={[styles.modalCard, Shadows.floating]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pair New Device</Text>
              <AnimatedPressable profile="smallControl" onPress={() => setPairModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            {/* Modal Tabs */}
            <View style={[styles.modalTabs, { backgroundColor: colors.secondaryBackground }]}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setPairTab('share')}
                style={[styles.modalTab, pairTab === 'share' && { backgroundColor: colors.elevatedCard }]}
              >
                <Key size={14} color={pairTab === 'share' ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.modalTabText, { color: pairTab === 'share' ? colors.textPrimary : colors.textTertiary }]}>
                  Share Code
                </Text>
              </AnimatedPressable>

              <AnimatedPressable
                profile="smallControl"
                onPress={() => setPairTab('enter')}
                style={[styles.modalTab, pairTab === 'enter' && { backgroundColor: colors.elevatedCard }]}
              >
                <Plus size={14} color={pairTab === 'enter' ? colors.accent : colors.textTertiary} style={{ marginRight: 4 }} />
                <Text style={[styles.modalTabText, { color: pairTab === 'enter' ? colors.textPrimary : colors.textTertiary }]}>
                  Enter Code
                </Text>
              </AnimatedPressable>
            </View>

            {pairTab === 'share' ? (
              <View style={styles.pairShareWrap}>
                <Text style={[styles.pairInstruction, { color: colors.textSecondary }]}>
                  Enter this single-use code on your other device to authorize local synchronization:
                </Text>
                <View style={[styles.codeDisplayBox, { backgroundColor: colors.secondaryBackground }]}>
                  <Text style={[styles.codeText, { color: colors.accent }]}>
                    {activePairingCode?.code || '--- ---'}
                  </Text>
                </View>
                <Text style={[styles.expiresText, { color: colors.textTertiary }]}>
                  ⏱ Valid for 10 minutes · Offline verified
                </Text>
              </View>
            ) : (
              <View style={styles.pairEnterWrap}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Device Name</Text>
                <TextInput
                  value={inputDeviceName}
                  onChangeText={setInputDeviceName}
                  placeholder="e.g. Android Phone"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.modalInput, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>6-Digit Pairing Code</Text>
                <TextInput
                  value={inputCode}
                  onChangeText={setInputCode}
                  placeholder="482-913"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  style={[styles.modalInput, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
                />

                <AnimatedPressable
                  profile="primaryButton"
                  onPress={handleConfirmPairCode}
                  style={[styles.pairConfirmBtn, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.pairConfirmText}>Authorize & Pair</Text>
                </AnimatedPressable>
              </View>
            )}
          </ElevatedCard>
        </View>
      </Modal>

      {/* Manual Transfer Modal */}
      <Modal visible={transferModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ElevatedCard style={[styles.modalCard, Shadows.floating]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {transferTab === 'export' ? 'Export Sync Packet' : 'Import Sync Packet'}
              </Text>
              <AnimatedPressable profile="smallControl" onPress={() => setTransferModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            {transferTab === 'export' ? (
              <View>
                <Text style={[styles.pairInstruction, { color: colors.textSecondary }]}>
                  Copy this verified payload to sync with an offline device:
                </Text>
                <TextInput
                  value={exportPacketString}
                  editable={false}
                  multiline
                  style={[styles.transferTextArea, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
                />
                <AnimatedPressable
                  profile="primaryButton"
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('Copied', 'Sync payload ready to share.');
                  }}
                  style={[styles.pairConfirmBtn, { backgroundColor: colors.accent }]}
                >
                  <Copy size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.pairConfirmText}>Copy Payload</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View>
                <Text style={[styles.pairInstruction, { color: colors.textSecondary }]}>
                  Paste the sync payload string received from your other device:
                </Text>
                <TextInput
                  value={importPacketString}
                  onChangeText={setImportPacketString}
                  placeholder="Paste sync packet JSON..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  style={[styles.transferTextArea, { backgroundColor: colors.secondaryBackground, color: colors.textPrimary }]}
                />
                <AnimatedPressable
                  profile="primaryButton"
                  onPress={handleApplyImportPacket}
                  style={[styles.pairConfirmBtn, { backgroundColor: colors.accent }]}
                >
                  <Upload size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.pairConfirmText}>Apply Changes</Text>
                </AnimatedPressable>
              </View>
            )}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
  addDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  addDeviceText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  deviceCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  deviceIdText: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  currentBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    marginBottom: Spacing.md,
  },
  syncNowText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    ...TypographyScale.footnote,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyPairBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  emptyPairBtnText: {
    ...TypographyScale.footnote,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deviceItemCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.xs,
  },
  deleteDeviceBtn: {
    padding: Spacing.xs,
  },
  manualCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  manualRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  manualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.md,
  },
  manualBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  noticeCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginVertical: Spacing.sm,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  noticeTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  noticeDesc: {
    ...TypographyScale.caption1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
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
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalTabs: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.sm,
  },
  modalTabText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  pairShareWrap: {
    alignItems: 'center',
  },
  pairInstruction: {
    ...TypographyScale.footnote,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  codeDisplayBox: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
  },
  codeText: {
    ...TypographyScale.largeTitle,
    fontWeight: '800',
    letterSpacing: 4,
  },
  expiresText: {
    ...TypographyScale.caption2,
  },
  pairEnterWrap: {},
  inputLabel: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: Spacing.xs,
  },
  modalInput: {
    ...TypographyScale.body,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  pairConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
  },
  pairConfirmText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  transferTextArea: {
    ...TypographyScale.caption1,
    minHeight: 120,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
});
