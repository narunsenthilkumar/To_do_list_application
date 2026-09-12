import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import {
  RefreshCw,
  Smartphone,
  Laptop,
  Globe,
  QrCode,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Radio,
  Wifi,
} from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { SyncEngine } from '../../sync/SyncEngine';
import { DevicePairing } from '../../sync/DevicePairing';
import { DeviceIdService } from '../../sync/DeviceIdService';
import { DevicePairingInfo, PairingPayload, SyncStatus } from '../../sync/types';
import { ExportService } from '../../backup/ExportService';
import { ImportDataSheet } from '../settings/ImportDataSheet';
import { Radii, Spacing, TypographyScale, Shadows } from '../../theme/tokens';
import { ClipboardService } from '../../services/clipboard/ClipboardService';

export const WindowsDesktopSync: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [currentDeviceName, setCurrentDeviceName] = useState('');
  const [pairedDevices, setPairedDevices] = useState<DevicePairingInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [importSheetVisible, setImportSheetVisible] = useState(false);

  // Pairing state
  const [activeCode, setActiveCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [inputPayload, setInputPayload] = useState('');
  const [isPairingProcessing, setIsPairingProcessing] = useState(false);
  const [pairSuccessMsg, setPairSuccessMsg] = useState('');

  useEffect(() => {
    async function loadDeviceInfo() {
      const devId = await DeviceIdService.getDeviceId();
      const devName = await DeviceIdService.getDeviceName();
      setCurrentDeviceId(devId);
      setCurrentDeviceName(devName);

      const devices = await DevicePairing.getPairedDevices();
      setPairedDevices(devices);
    }
    loadDeviceInfo();

    const unsubscribe = SyncEngine.addStatusListener((newStatus) => {
      setSyncStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await SyncEngine.syncNow();
    } catch (e) {
      console.warn('[Sync] Manual sync failed:', e);
    } finally {
      setIsSyncing(false);
      setSyncStatus(SyncEngine.getStatus());
    }
  };

  const handleGeneratePairCode = async () => {
    try {
      const payload = await DevicePairing.generatePairingPayload();
      setActiveCode(payload.code);
    } catch (e) {
      console.warn('Pairing payload error:', e);
    }
  };

  const handleCopyDeviceId = async () => {
    await ClipboardService.setString(currentDeviceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportJSON = async () => {
    await ExportService.exportJSON();
  };

  const handleRevokeDevice = async (devId: string) => {
    await DevicePairing.revokeDevice(devId);
    const devices = await DevicePairing.getPairedDevices();
    setPairedDevices(devices);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Device Synchronization</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            Local-first, encrypted CRDT synchronization & offline pairing
          </Text>
        </View>

        <Pressable
          style={({ hovered }: any) => [
            styles.syncNowBtn,
            { backgroundColor: colors.accent },
            hovered && { opacity: 0.9 },
            Shadows.subtle,
          ]}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.syncNowBtnText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
        </Pressable>
      </View>

      {/* Sync Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <View style={styles.statusLeft}>
          <View style={[styles.statusIconCircle, { backgroundColor: colors.success + '15' }]}>
            <ShieldCheck size={20} color={colors.success} />
          </View>
          <View>
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
              {syncStatus === 'synced' ? 'All Changes Saved Locally & Synced' : syncStatus === 'offline' ? 'Offline — Local Persistence Active' : 'Sync Engine Ready'}
            </Text>
            <Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>
              Local-first Conflict-Free Replicated Data Type (CRDT) engine with Lamport Timestamps
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: colors.success + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusBadgeText, { color: colors.success }]}>
            {syncStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* This Device Profile */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>Current Desktop Device</Text>

        <View style={styles.deviceInfoRow}>
          <View style={styles.deviceIconWrapper}>
            <Laptop size={28} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deviceName, { color: colors.textPrimary }]}>{currentDeviceName || 'Windows Desktop'}</Text>
            <Text style={[styles.deviceId, { color: colors.textTertiary }]}>ID: {currentDeviceId}</Text>
          </View>
          <Pressable
            style={({ hovered }: any) => [
              styles.copyBtn,
              hovered && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
            ]}
            onPress={handleCopyDeviceId}
          >
            {copiedId ? <Check size={14} color={colors.success} /> : <Copy size={14} color={colors.textSecondary} />}
            <Text style={[styles.copyBtnText, { color: copiedId ? colors.success : colors.textSecondary }]}>
              {copiedId ? 'Copied' : 'Copy ID'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Device Pairing Section */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>Pair New Device (Mobile / Tablet)</Text>
        <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
          Generate a 6-digit one-time pairing code to connect your iOS or Android KIVENTA app.
        </Text>

        <View style={styles.pairingActionRow}>
          {activeCode ? (
            <View style={[styles.codeDisplayBox, { borderColor: colors.accent, backgroundColor: colors.accent + '10' }]}>
              <Key size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.codeDigits, { color: colors.accent }]}>{activeCode}</Text>
              <Text style={[styles.codeExpireHint, { color: colors.textTertiary }]}>Valid for 5 minutes</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.generateCodeBtn, { backgroundColor: colors.accent }]}
              onPress={handleGeneratePairCode}
            >
              <Key size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.generateCodeBtnText}>Generate Pairing Code</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Paired Devices List */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>
          Paired Devices ({pairedDevices.length})
        </Text>

        {pairedDevices.length === 0 ? (
          <Text style={[styles.emptyDevicesText, { color: colors.textTertiary }]}>
            No other devices currently paired. Use pairing to sync between your phone and PC.
          </Text>
        ) : (
          <View style={styles.devicesList}>
            {pairedDevices.map((dev) => (
              <View
                key={dev.deviceId}
                style={[
                  styles.deviceRow,
                  { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                ]}
              >
                <Smartphone size={20} color={colors.accent} style={{ marginRight: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pairedName, { color: colors.textPrimary }]}>{dev.deviceName}</Text>
                  <Text style={[styles.pairedMeta, { color: colors.textTertiary }]}>
                    ID: {dev.deviceId.slice(0, 16)}... • Paired {new Date(dev.pairedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable
                  style={styles.revokeBtn}
                  onPress={() => handleRevokeDevice(dev.deviceId)}
                >
                  <Trash2 size={14} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* JSON Backup & Import */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          Shadows.subtle,
        ]}
      >
        <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>Offline JSON Backup & Restore</Text>
        <Text style={[styles.cardSubtext, { color: colors.textTertiary }]}>
          Export a complete encrypted or standard JSON backup of all tasks, projects, settings, and focus history.
        </Text>

        <View style={styles.backupButtonsRow}>
          <Pressable
            style={[styles.backupBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={handleExportJSON}
          >
            <Download size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.backupBtnText, { color: colors.accent }]}>Export Backup File</Text>
          </Pressable>

          <Pressable
            style={[styles.backupBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            onPress={() => setImportSheetVisible(true)}
          >
            <Upload size={16} color="#34C759" style={{ marginRight: 6 }} />
            <Text style={[styles.backupBtnText, { color: '#34C759' }]}>Import Backup File</Text>
          </Pressable>
        </View>
      </View>

      {/* Import Sheet Modal */}
      <ImportDataSheet
        visible={importSheetVisible}
        onClose={() => setImportSheetVisible(false)}
        onSuccess={() => setImportSheetVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl * 2,
    maxWidth: 840,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  title: {
    ...TypographyScale.title2,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    cursor: 'pointer' as any,
  },
  syncNowBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  statusSubtitle: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  cardHeading: {
    ...TypographyScale.headline,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtext: {
    ...TypographyScale.caption1,
    marginBottom: Spacing.md,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  deviceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  deviceName: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  deviceId: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  copyBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    marginLeft: 4,
  },
  pairingActionRow: {
    marginTop: Spacing.sm,
  },
  generateCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.xs,
    cursor: 'pointer' as any,
  },
  generateCodeBtnText: {
    ...TypographyScale.subhead,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  codeDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  codeDigits: {
    ...TypographyScale.title2,
    fontWeight: '800',
    letterSpacing: 4,
    marginRight: Spacing.lg,
  },
  codeExpireHint: {
    ...TypographyScale.caption2,
  },
  emptyDevicesText: {
    ...TypographyScale.footnote,
    paddingVertical: Spacing.sm,
  },
  devicesList: {
    marginTop: Spacing.sm,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  pairedName: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  pairedMeta: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  revokeBtn: {
    padding: 6,
    cursor: 'pointer' as any,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radii.xs,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  backupBtnText: {
    ...TypographyScale.subhead,
    fontWeight: '600',
  },
});
