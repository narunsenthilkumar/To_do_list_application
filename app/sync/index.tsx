import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Laptop,
  Smartphone,
  Globe,
  RefreshCw,
  Plus,
  Trash2,
  QrCode,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Upload,
  Wifi,
  X,
  RotateCcw,
  LogOut,
  Edit2,
  AlertTriangle,
} from 'lucide-react-native';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { SyncStatusPill } from '../../components/navigation/SyncStatusPill';
import { SyncEngine } from '../../sync/SyncEngine';
import { DevicePairing } from '../../sync/DevicePairing';
import { DeviceIdService } from '../../sync/DeviceIdService';
import { SyncTransport } from '../../sync/SyncTransport';
import { DevicePairingInfo, PairingPayload, SyncStatus } from '../../sync/types';
import { ClipboardService } from '../../services/clipboard/ClipboardService';
import { SessionService } from '../../auth/SessionService';
import { useTheme } from '../../store/ThemeContext';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';

export default function SyncScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [currentDeviceName, setCurrentDeviceName] = useState('');
  const [currentPlatform, setCurrentPlatform] = useState<'android' | 'windows' | 'web' | 'ios'>('web');
  const [pairedDevices, setPairedDevices] = useState<DevicePairingInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimeStr, setLastSyncTimeStr] = useState<string | null>(null);

  // Pairing Modal state
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [pairTab, setPairTab] = useState<'share' | 'enter'>('share');
  const [activePayload, setActivePayload] = useState<PairingPayload | null>(null);
  const [activePayloadString, setActivePayloadString] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [isCopiedPayload, setIsCopiedPayload] = useState(false);

  // Enter Code State
  const [inputPayloadText, setInputPayloadText] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isPairingProcessing, setIsPairingProcessing] = useState(false);

  // Manual Transfer Modal state
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferTab, setTransferTab] = useState<'export' | 'import'>('export');
  const [exportPacketString, setExportPacketString] = useState('');
  const [importPacketString, setImportPacketString] = useState('');
  const [isCopiedExport, setIsCopiedExport] = useState(false);

  // Confirmation Modals
  const [deviceToRemove, setDeviceToRemove] = useState<DevicePairingInfo | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [renamingDevice, setRenamingDevice] = useState<DevicePairingInfo | null>(null);
  const [newDeviceNameInput, setNewDeviceNameInput] = useState('');

  const countdownTimerRef = useRef<any>(null);

  const loadData = async () => {
    const id = await DeviceIdService.getDeviceId();
    const name = DeviceIdService.getDeviceName();
    const plat = DeviceIdService.getPlatformType();
    const devices = await DevicePairing.getPairedDevices();

    setCurrentDeviceId(id);
    setCurrentDeviceName(name);
    setCurrentPlatform(plat);
    // Filter out current device from paired devices list for clean display
    setPairedDevices(devices.filter((d) => d.deviceId !== id));
    setLastSyncTimeStr(SyncEngine.getLastSyncTime());
    setSyncStatus(SyncEngine.getStatus());
  };

  useEffect(() => {
    loadData();
    const unsub = SyncEngine.addStatusListener((status) => {
      setSyncStatus(status);
      setLastSyncTimeStr(SyncEngine.getLastSyncTime());
    });

    return () => {
      unsub();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const startCountdown = (expiresAt: number) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0 && countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
    update();
    countdownTimerRef.current = setInterval(update, 1000);
  };

  const handleSyncNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSyncing(true);
    try {
      const res = await SyncEngine.syncNow();
      await loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sync Complete', `Synchronized successfully. (${res.pendingCount} pending mutations saved locally).`);
    } catch (e: any) {
      if (e.message?.includes('DEVICE_REVOKED')) {
        Alert.alert(
          'Device Revoked',
          'This device synchronization authorization has been revoked. Please re-pair from Settings → Sync & Devices.'
        );
      } else {
        Alert.alert('Sync Status', e.message || 'Offline: All changes remain safely saved locally.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenPairModal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refreshPairingPayload();
    setPairModalVisible(true);
  };

  const refreshPairingPayload = async () => {
    try {
      const { payload, encodedString, code } = await DevicePairing.generatePairingPayload();
      setActivePayload(payload);
      setActivePayloadString(encodedString);
      setActiveCode(code);
      startCountdown(payload.expiresAt);
    } catch (err: any) {
      Alert.alert('Pairing Error', err.message || 'Could not generate pairing payload.');
    }
  };

  const handleCopyPayload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!activePayloadString) return;

    const success = await ClipboardService.setString(activePayloadString);
    if (success) {
      setIsCopiedPayload(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setIsCopiedPayload(false), 2500);
    } else {
      Alert.alert('Notice', 'Please select and copy the payload text manually.');
    }
  };

  const handleApplyEnteredPairing = async () => {
    if (!inputPayloadText.trim()) {
      Alert.alert('Empty Payload', 'Please paste the complete pairing payload JSON string.');
      return;
    }
    if (!inputCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the 6-digit pairing code shown on the host device.');
      return;
    }

    setIsPairingProcessing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const validation = DevicePairing.validatePairingPayload(inputPayloadText.trim(), inputCode.trim());
      if (!validation.isValid || !validation.payload) {
        throw new Error(validation.errorMessage || 'Invalid payload or code.');
      }

      const result = await DevicePairing.commitPairingPayload(validation.payload);
      await loadData();

      setPairModalVisible(false);
      setInputPayloadText('');
      setInputCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Device Paired & Synchronized',
        `Successfully paired with ${validation.payload.senderDeviceName}! Imported ${result.tasksImported} tasks, ${result.projectsImported} projects, and ${result.tagsImported} tags.`
      );
    } catch (e: any) {
      Alert.alert('Pairing Failed', e.message || 'Could not pair device.');
    } finally {
      setIsPairingProcessing(false);
    }
  };

  const handleConfirmRemoveDevice = async () => {
    if (!deviceToRemove) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await DevicePairing.revokeDevice(deviceToRemove.deviceId);
      setDeviceToRemove(null);
      await loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not remove device.');
    }
  };

  const handleConfirmSignOut = async () => {
    setShowSignOutConfirm(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await SessionService.logout();
      router.replace('/auth/login' as any);
    } catch (e: any) {
      Alert.alert('Sign Out Error', e.message || 'Could not sign out.');
    }
  };

  const handleSaveRename = async () => {
    if (!renamingDevice || !newDeviceNameInput.trim()) {
      setRenamingDevice(null);
      return;
    }
    await DevicePairing.updateDeviceName(renamingDevice.deviceId, newDeviceNameInput.trim());
    setRenamingDevice(null);
    await loadData();
  };

  const handleOpenExportPacket = async () => {
    const payload = await SyncEngine.generateOutgoingPayload();
    const encoded = SyncTransport.encodeToString(payload);
    setExportPacketString(encoded);
    setTransferTab('export');
    setTransferModalVisible(true);
  };

  const handleCopyExportPacket = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!exportPacketString) return;

    const success = await ClipboardService.setString(exportPacketString);
    if (success) {
      setIsCopiedExport(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setIsCopiedExport(false), 2000);
    } else {
      Alert.alert('Notice', 'Please select and copy the text manually.');
    }
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
        'Changes Applied',
        `Successfully applied ${result.appliedCount} mutations (${result.conflictsResolved} conflicts resolved).`
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'Could not parse or apply sync packet.');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getPlatformIcon = (plat: string, size = 22, color = colors.textPrimary) => {
    if (plat === 'windows') return <Laptop size={size} color={color} />;
    if (plat === 'android' || plat === 'ios') return <Smartphone size={size} color={color} />;
    return <Globe size={size} color={color} />;
  };

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface style={styles.container}>
      <View style={[styles.innerContainer, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </AnimatedPressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Sync & Devices</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
              Local & Cross-Device Synchronization
            </Text>
          </View>
          <SyncStatusPill />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
        >
          {/* THIS DEVICE CARD */}
          <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>THIS DEVICE</Text>
          <ElevatedCard style={styles.deviceCard}>
            <View style={styles.deviceRow}>
              <View style={[styles.deviceIconWrap, { backgroundColor: colors.accent + '20' }]}>
                {getPlatformIcon(currentPlatform, 24, colors.accent)}
              </View>
              <View style={styles.deviceInfo}>
                <Text style={[styles.deviceName, { color: colors.textPrimary }]}>{currentDeviceName}</Text>
                <Text style={[styles.deviceIdText, { color: colors.textTertiary }]} numberOfLines={1}>
                  ID: {currentDeviceId}
                </Text>
              </View>
              <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.currentBadgeText, { color: colors.success }]}>Active</Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.separator }]} />

            <View style={styles.deviceActionsRow}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => setShowSignOutConfirm(true)}
                style={[styles.deviceActionBtn, { backgroundColor: colors.error + '12' }]}
              >
                <LogOut size={15} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={[styles.deviceActionBtnText, { color: colors.error }]}>Sign Out & Disconnect</Text>
              </AnimatedPressable>
            </View>
          </ElevatedCard>

          {/* SYNC NOW CTA */}
          <AnimatedPressable
            profile="primaryButton"
            onPress={handleSyncNow}
            disabled={isSyncing}
            style={[styles.syncNowBtn, { backgroundColor: colors.accent }]}
          >
            <RefreshCw size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.syncNowText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </AnimatedPressable>

          {/* PAIRED DEVICES LIST */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>
              PAIRED DEVICES ({pairedDevices.length})
            </Text>
            <AnimatedPressable profile="smallControl" onPress={handleOpenPairModal} style={styles.addDeviceBtn}>
              <Plus size={15} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.addDeviceText, { color: colors.accent }]}>Connect Device</Text>
            </AnimatedPressable>
          </View>

          {pairedDevices.length === 0 ? (
            <ElevatedCard style={styles.emptyCard}>
              <QrCode size={36} color={colors.textTertiary} style={{ marginBottom: Spacing.sm }} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Paired Devices</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Connect your Android phone, Windows PC, or Web browser to securely synchronize your Taskora account.
              </Text>
              <AnimatedPressable
                profile="smallControl"
                onPress={handleOpenPairModal}
                style={[styles.emptyPairBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.emptyPairBtnText}>Connect a Device</Text>
              </AnimatedPressable>
            </ElevatedCard>
          ) : (
            pairedDevices.map((device) => (
              <ElevatedCard key={device.deviceId} style={styles.deviceItemCard}>
                <View style={styles.deviceRow}>
                  <View style={[styles.deviceIconWrap, { backgroundColor: colors.secondaryBackground }]}>
                    {getPlatformIcon(device.platform, 22, colors.textSecondary)}
                  </View>
                  <View style={styles.deviceInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.deviceName, { color: colors.textPrimary, marginRight: 6 }]}>
                        {device.deviceName}
                      </Text>
                      <AnimatedPressable
                        profile="smallControl"
                        onPress={() => {
                          setRenamingDevice(device);
                          setNewDeviceNameInput(device.deviceName);
                        }}
                      >
                        <Edit2 size={12} color={colors.textTertiary} />
                      </AnimatedPressable>
                    </View>
                    <Text style={[styles.deviceIdText, { color: colors.textTertiary }]}>
                      Last Synced:{' '}
                      {device.lastSyncedAt
                        ? new Date(device.lastSyncedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never'}
                    </Text>
                  </View>
                  <AnimatedPressable
                    profile="smallControl"
                    onPress={() => setDeviceToRemove(device)}
                    style={styles.deleteDeviceBtn}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </AnimatedPressable>
                </View>
              </ElevatedCard>
            ))
          )}

          {/* MANUAL LOCAL TRANSFER */}
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

          {/* ARCHITECTURE NOTICE */}
          <ElevatedCard style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Wifi size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>Offline-First Architecture</Text>
            </View>
            <Text style={[styles.noticeDesc, { color: colors.textSecondary }]}>
              Taskora uses an offline-first architecture. All task operations are saved locally immediately and queued
              for deterministic synchronization. No third-party cloud database or server tracking is used.
            </Text>
          </ElevatedCard>
        </ScrollView>

        {/* ---------------------------------------------------- */}
        {/* PAIRING MODAL */}
        {/* ---------------------------------------------------- */}
        <Modal visible={pairModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.elevatedCard,
                  borderColor: colors.subtleBorder,
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Connect Device</Text>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setPairModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color={colors.textTertiary} />
                </AnimatedPressable>
              </View>

              {/* Segment Tabs */}
              <View style={[styles.tabBar, { backgroundColor: colors.secondaryBackground }]}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setPairTab('share')}
                  style={[
                    styles.tabItem,
                    pairTab === 'share' && [styles.tabItemActive, { backgroundColor: colors.elevatedCard }],
                  ]}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      { color: pairTab === 'share' ? colors.textPrimary : colors.textTertiary },
                    ]}
                  >
                    Share Code
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setPairTab('enter')}
                  style={[
                    styles.tabItem,
                    pairTab === 'enter' && [styles.tabItemActive, { backgroundColor: colors.elevatedCard }],
                  ]}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      { color: pairTab === 'enter' ? colors.textPrimary : colors.textTertiary },
                    ]}
                  >
                    Enter Code
                  </Text>
                </AnimatedPressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                {pairTab === 'share' ? (
                  <View style={styles.shareTabContent}>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                      Enter this 6-digit verification code on your other device:
                    </Text>

                    {/* 6-Digit Code Display */}
                    <View
                      style={[
                        styles.codeBox,
                        {
                          backgroundColor: colors.secondaryBackground,
                          borderColor: colors.accent + '30',
                        },
                      ]}
                    >
                      <Key size={22} color={colors.accent} style={{ marginRight: 10 }} />
                      <Text style={[styles.codeText, { color: colors.accent }]}>
                        {activeCode || '--- ---'}
                      </Text>
                    </View>

                    {/* Expiration Timer */}
                    <View style={styles.timerRow}>
                      <Text
                        style={[
                          styles.timerText,
                          { color: remainingSeconds > 60 ? colors.textTertiary : colors.error },
                        ]}
                      >
                        {remainingSeconds > 0
                          ? `Code expires in ${formatSeconds(remainingSeconds)}`
                          : 'Pairing code expired. Please generate a new code.'}
                      </Text>
                      <AnimatedPressable
                        profile="smallControl"
                        onPress={refreshPairingPayload}
                        style={styles.refreshBtn}
                      >
                        <RotateCcw size={14} color={colors.accent} style={{ marginRight: 4 }} />
                        <Text style={[styles.refreshText, { color: colors.accent }]}>Regenerate</Text>
                      </AnimatedPressable>
                    </View>

                    {/* Copy Payload Button */}
                    <Text style={[styles.payloadSectionTitle, { color: colors.textTertiary }]}>
                      PAIRING PAYLOAD SNAPSHOT
                    </Text>
                    <AnimatedPressable
                      profile="primaryButton"
                      onPress={handleCopyPayload}
                      style={[
                        styles.copyPayloadBtn,
                        { backgroundColor: isCopiedPayload ? colors.success : colors.accent },
                      ]}
                    >
                      {isCopiedPayload ? (
                        <>
                          <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.copyPayloadText}>Pairing Payload Copied!</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.copyPayloadText}>Copy Pairing Payload</Text>
                        </>
                      )}
                    </AnimatedPressable>

                    <Text style={[styles.helperFootnote, { color: colors.textTertiary }]}>
                      The payload contains your account identity and initial task snapshot, protected with SHA-256
                      integrity verification.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.enterTabContent}>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                      Paste the pairing payload string from the host device:
                    </Text>

                    <TextInput
                      style={[
                        styles.payloadTextInput,
                        {
                          backgroundColor: colors.secondaryBackground,
                          color: colors.textPrimary,
                          borderColor: colors.subtleBorder,
                        },
                      ]}
                      placeholder="Paste pairing payload JSON string here..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      value={inputPayloadText}
                      onChangeText={setInputPayloadText}
                    />

                    <Text style={[styles.stepDesc, { color: colors.textSecondary, marginTop: Spacing.md }]}>
                      Enter the 6-digit verification code:
                    </Text>

                    <TextInput
                      style={[
                        styles.codeTextInput,
                        {
                          backgroundColor: colors.secondaryBackground,
                          color: colors.textPrimary,
                          borderColor: colors.accent + '40',
                        },
                      ]}
                      placeholder="e.g. 482-910"
                      placeholderTextColor={colors.textTertiary}
                      value={inputCode}
                      onChangeText={setInputCode}
                      maxLength={7}
                      keyboardType="number-pad"
                    />

                    <AnimatedPressable
                      profile="primaryButton"
                      onPress={handleApplyEnteredPairing}
                      disabled={isPairingProcessing}
                      style={[styles.pairSubmitBtn, { backgroundColor: colors.accent }]}
                    >
                      <ShieldCheck size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.pairSubmitText}>
                        {isPairingProcessing ? 'Pairing...' : 'Pair & Synchronize'}
                      </Text>
                    </AnimatedPressable>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* MANUAL TRANSFER MODAL */}
        {/* ---------------------------------------------------- */}
        <Modal visible={transferModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: colors.elevatedCard,
                  borderColor: colors.subtleBorder,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Manual Mutation Transfer</Text>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setTransferModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={20} color={colors.textTertiary} />
                </AnimatedPressable>
              </View>

              <View style={[styles.tabBar, { backgroundColor: colors.secondaryBackground }]}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setTransferTab('export')}
                  style={[
                    styles.tabItem,
                    transferTab === 'export' && [styles.tabItemActive, { backgroundColor: colors.elevatedCard }],
                  ]}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      { color: transferTab === 'export' ? colors.textPrimary : colors.textTertiary },
                    ]}
                  >
                    Export
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setTransferTab('import')}
                  style={[
                    styles.tabItem,
                    transferTab === 'import' && [styles.tabItemActive, { backgroundColor: colors.elevatedCard }],
                  ]}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      { color: transferTab === 'import' ? colors.textPrimary : colors.textTertiary },
                    ]}
                  >
                    Import
                  </Text>
                </AnimatedPressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
                {transferTab === 'export' ? (
                  <View style={styles.shareTabContent}>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                      Copy this mutation packet to transfer your recent offline changes to another device:
                    </Text>

                    <TextInput
                      style={[
                        styles.payloadTextInput,
                        {
                          backgroundColor: colors.secondaryBackground,
                          color: colors.textPrimary,
                          borderColor: colors.subtleBorder,
                        },
                      ]}
                      editable={false}
                      multiline
                      value={exportPacketString}
                    />

                    <AnimatedPressable
                      profile="primaryButton"
                      onPress={handleCopyExportPacket}
                      style={[
                        styles.copyPayloadBtn,
                        { backgroundColor: isCopiedExport ? colors.success : colors.accent },
                      ]}
                    >
                      {isCopiedExport ? (
                        <>
                          <Check size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.copyPayloadText}>Packet Copied!</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.copyPayloadText}>Copy Mutation Packet</Text>
                        </>
                      )}
                    </AnimatedPressable>
                  </View>
                ) : (
                  <View style={styles.enterTabContent}>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                      Paste the exported mutation packet string from another device:
                    </Text>

                    <TextInput
                      style={[
                        styles.payloadTextInput,
                        {
                          backgroundColor: colors.secondaryBackground,
                          color: colors.textPrimary,
                          borderColor: colors.subtleBorder,
                        },
                      ]}
                      placeholder="Paste sync packet string here..."
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      value={importPacketString}
                      onChangeText={setImportPacketString}
                    />

                    <AnimatedPressable
                      profile="primaryButton"
                      onPress={handleApplyImportPacket}
                      style={[styles.pairSubmitBtn, { backgroundColor: colors.accent }]}
                    >
                      <Upload size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.pairSubmitText}>Apply Changes</Text>
                    </AnimatedPressable>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* REMOVE DEVICE CONFIRMATION MODAL */}
        {/* ---------------------------------------------------- */}
        <Modal visible={!!deviceToRemove} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.confirmDialog,
                {
                  backgroundColor: colors.elevatedCard,
                  borderColor: colors.subtleBorder,
                },
              ]}
            >
              <View style={[styles.confirmIconWrap, { backgroundColor: colors.error + '20' }]}>
                <AlertTriangle size={24} color={colors.error} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>Remove this device?</Text>
              <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                This will disconnect{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{deviceToRemove?.deviceName}</Text> from
                your Taskora account. Local data on that device will not be deleted.
              </Text>
              <View style={styles.confirmBtnRow}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setDeviceToRemove(null)}
                  style={[styles.confirmCancelBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.confirmCancelText, { color: colors.textPrimary }]}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleConfirmRemoveDevice}
                  style={[styles.confirmDeleteBtn, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.confirmDeleteText}>Remove Device</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* SIGN OUT CONFIRMATION MODAL */}
        {/* ---------------------------------------------------- */}
        <Modal visible={showSignOutConfirm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.confirmDialog,
                {
                  backgroundColor: colors.elevatedCard,
                  borderColor: colors.subtleBorder,
                },
              ]}
            >
              <View style={[styles.confirmIconWrap, { backgroundColor: colors.error + '20' }]}>
                <LogOut size={24} color={colors.error} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>
                Sign Out & Disconnect This Device?
              </Text>
              <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                This will sign out this installation from your Taskora account. Local tasks and data on this device will
                remain intact.
              </Text>
              <View style={styles.confirmBtnRow}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setShowSignOutConfirm(false)}
                  style={[styles.confirmCancelBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.confirmCancelText, { color: colors.textPrimary }]}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleConfirmSignOut}
                  style={[styles.confirmDeleteBtn, { backgroundColor: colors.error }]}
                >
                  <Text style={styles.confirmDeleteText}>Sign Out & Disconnect</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* RENAME DEVICE MODAL */}
        {/* ---------------------------------------------------- */}
        <Modal visible={!!renamingDevice} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.confirmDialog,
                {
                  backgroundColor: colors.elevatedCard,
                  borderColor: colors.subtleBorder,
                },
              ]}
            >
              <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>Rename Device</Text>
              <TextInput
                style={[
                  styles.renameInput,
                  {
                    backgroundColor: colors.secondaryBackground,
                    color: colors.textPrimary,
                    borderColor: colors.subtleBorder,
                  },
                ]}
                value={newDeviceNameInput}
                onChangeText={setNewDeviceNameInput}
                autoFocus
              />
              <View style={styles.confirmBtnRow}>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={() => setRenamingDevice(null)}
                  style={[styles.confirmCancelBtn, { backgroundColor: colors.secondaryBackground }]}
                >
                  <Text style={[styles.confirmCancelText, { color: colors.textPrimary }]}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  profile="smallControl"
                  onPress={handleSaveRename}
                  style={[styles.confirmDeleteBtn, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.confirmDeleteText}>Save</Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
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
  scrollContent: {
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  deviceCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    ...TypographyScale.body,
    fontWeight: '600',
  },
  deviceIdText: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  currentBadgeText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.md,
  },
  deviceActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deviceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  deviceActionBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radii.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  syncNowText: {
    ...TypographyScale.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addDeviceText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    ...TypographyScale.caption1,
    textAlign: 'center',
    marginBottom: Spacing.md,
    maxWidth: 300,
  },
  emptyPairBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  emptyPairBtnText: {
    ...TypographyScale.callout,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deviceItemCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
  },
  deleteDeviceBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
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
    ...TypographyScale.callout,
    fontWeight: '600',
  },
  noticeCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  noticeTitle: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  noticeDesc: {
    ...TypographyScale.caption1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: '90%',
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
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radii.pill,
    marginBottom: Spacing.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  tabItemActive: {
    ...Shadows.subtle,
  },
  tabItemText: {
    ...TypographyScale.callout,
    fontWeight: '600',
  },
  shareTabContent: {
    paddingTop: Spacing.xs,
  },
  stepDesc: {
    ...TypographyScale.callout,
    marginBottom: Spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  codeText: {
    ...TypographyScale.largeTitle,
    fontWeight: '700',
    letterSpacing: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  timerText: {
    ...TypographyScale.caption1,
    fontWeight: '500',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  payloadSectionTitle: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  copyPayloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radii.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  copyPayloadText: {
    ...TypographyScale.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helperFootnote: {
    ...TypographyScale.caption2,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
  enterTabContent: {
    paddingTop: Spacing.xs,
  },
  payloadTextInput: {
    height: 120,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlignVertical: 'top',
  },
  codeTextInput: {
    height: 50,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: Spacing.lg,
  },
  pairSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radii.lg,
    ...Shadows.subtle,
  },
  pairSubmitText: {
    ...TypographyScale.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmDialog: {
    margin: Spacing.lg,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...Shadows.floating,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  confirmTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  confirmMessage: {
    ...TypographyScale.callout,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    ...TypographyScale.callout,
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    ...TypographyScale.callout,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  renameInput: {
    width: '100%',
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginVertical: Spacing.md,
  },
});
