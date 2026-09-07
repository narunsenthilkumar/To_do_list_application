import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  Smartphone,
  Check,
  Search,
  Lock,
  VolumeX,
  AlertCircle,
  X,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { AnimatedToggle } from '../../components/settings/AnimatedToggle';
import { useTheme, useFocusTimer } from '../../store/useTaskora';
import { FocusShieldService, InstalledAppInfo } from '../../services/focus/FocusShieldService';
import { FocusShieldSettings, DEFAULT_FOCUS_SHIELD_SETTINGS } from '../../models/focus';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';
import { haptics } from '../../services/haptics';

export default function FocusShieldSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useFocusTimer();

  const [shieldSettings, setShieldSettings] = useState<FocusShieldSettings>(
    settings.shieldSettings || DEFAULT_FOCUS_SHIELD_SETTINGS
  );

  const [isAccessibilityGranted, setIsAccessibilityGranted] = useState(false);
  const [isDndGranted, setIsDndGranted] = useState(true);

  const [appPickerVisible, setAppPickerVisible] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledAppInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<Set<String>>(
    new Set(shieldSettings.blockedPackages)
  );

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const accState = await FocusShieldService.isAccessibilityServiceEnabled();
    const dndState = await FocusShieldService.isDndAccessGranted();
    setIsAccessibilityGranted(accState);
    setIsDndGranted(dndState);
  };

  const updateShieldState = async (updates: Partial<FocusShieldSettings>) => {
    const updated: FocusShieldSettings = { ...shieldSettings, ...updates };
    setShieldSettings(updated);
    await updateSettings({ shieldSettings: updated });
    await FocusShieldService.syncShieldConfig(updated);
  };

  const handleToggleShield = async (val: boolean) => {
    haptics.medium();
    if (val && Platform.OS === 'android' && !isAccessibilityGranted) {
      Alert.alert(
        'Accessibility Permission Required',
        'Taskora Focus Shield requires Android Accessibility permission to detect when distracting apps are opened during a focus session.\n\nWould you like to open Settings now?',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: async () => {
              await FocusShieldService.openAccessibilitySettings();
            },
          },
        ]
      );
    }
    await updateShieldState({ enabled: val });
  };

  const handleOpenAppPicker = async () => {
    haptics.light();
    const apps = await FocusShieldService.fetchInstalledApps();
    setInstalledApps(apps);
    setSelectedPackages(new Set(shieldSettings.blockedPackages));
    setAppPickerVisible(true);
  };

  const handleToggleAppSelection = (pkgName: string) => {
    haptics.selection();
    const next = new Set(selectedPackages);
    if (next.has(pkgName)) {
      next.delete(pkgName);
    } else {
      next.add(pkgName);
    }
    setSelectedPackages(next);
  };

  const handleSelectAll = () => {
    haptics.selection();
    const allPkgs = new Set(filteredApps.map((a) => a.packageName));
    setSelectedPackages(allPkgs);
  };

  const handleClearAll = () => {
    haptics.selection();
    setSelectedPackages(new Set());
  };

  const handleSaveAppSelection = async () => {
    haptics.medium();
    const blockedList = Array.from(selectedPackages) as string[];
    await updateShieldState({ blockedPackages: blockedList });
    setAppPickerVisible(false);
  };

  const filteredApps = installedApps.filter(
    (app) =>
      app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Focus Shield</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Guide Card */}
            <ElevatedCard style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <ShieldAlert size={22} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>Distraction Blocker</Text>
              </View>
              <Text style={[styles.guideDesc, { color: colors.textSecondary }]}>
                Focus Shield prevents distracting apps from being opened during your active Pomodoro sessions, helping you stay 100% focused.
              </Text>
            </ElevatedCard>

            {/* Main Toggle */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>FOCUS SHIELD MODE</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Shield size={20} color={colors.accent} />}
                title="Enable Focus Shield"
                subtitle="Automatically block selected apps during focus"
                trailing={
                  <AnimatedToggle
                    value={shieldSettings.enabled}
                    onValueChange={handleToggleShield}
                  />
                }
              />
            </ElevatedCard>

            {/* Android Permissions Status */}
            {Platform.OS === 'android' && (
              <>
                <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>ANDROID PERMISSIONS</Text>
                <ElevatedCard style={styles.cardSection}>
                  <SettingsRow
                    icon={
                      <Smartphone
                        size={20}
                        color={isAccessibilityGranted ? colors.success : colors.warning}
                      />
                    }
                    title="Accessibility Service"
                    subtitle={
                      isAccessibilityGranted
                        ? 'Granted — Active app window detection enabled'
                        : 'Required — Tap to open Accessibility Settings'
                    }
                    showChevron={!isAccessibilityGranted}
                    onPress={
                      !isAccessibilityGranted
                        ? async () => {
                            await FocusShieldService.openAccessibilitySettings();
                          }
                        : undefined
                    }
                  />

                  <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

                  <SettingsRow
                    icon={
                      <VolumeX
                        size={20}
                        color={isDndGranted ? colors.success : colors.warning}
                      />
                    }
                    title="Do Not Disturb Access"
                    subtitle={
                      isDndGranted
                        ? 'Allowed — Auto-silence notifications during focus'
                        : 'Tap to grant Notification Policy Access'
                    }
                    showChevron={!isDndGranted}
                    onPress={
                      !isDndGranted
                        ? async () => {
                            await FocusShieldService.openDndSettings();
                          }
                        : undefined
                    }
                  />
                </ElevatedCard>
              </>
            )}

            {/* Blocked Apps Management */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>BLOCKED APPLICATIONS</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Lock size={20} color={colors.accent} />}
                title="Manage Blocked Apps"
                subtitle={`${shieldSettings.blockedPackages.length} application${shieldSettings.blockedPackages.length === 1 ? '' : 's'} selected`}
                showChevron
                onPress={handleOpenAppPicker}
              />
            </ElevatedCard>

            {/* Advanced Settings */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>SHIELD BEHAVIOR</Text>
            <ElevatedCard style={styles.cardSection}>
              <SettingsRow
                icon={<Lock size={20} color={colors.accent} />}
                title="Strict Focus Mode"
                subtitle="Disables early unlock during sessions"
                trailing={
                  <AnimatedToggle
                    value={shieldSettings.strictMode}
                    onValueChange={(val) => updateShieldState({ strictMode: val })}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<VolumeX size={20} color={colors.accent} />}
                title="Auto Do Not Disturb"
                subtitle="Enable system DND while focus is active"
                trailing={
                  <AnimatedToggle
                    value={shieldSettings.dndEnabled}
                    onValueChange={async (val) => {
                      if (val && Platform.OS === 'android' && !isDndGranted) {
                        await FocusShieldService.openDndSettings();
                      }
                      updateShieldState({ dndEnabled: val });
                    }}
                  />
                }
              />

              <View style={[styles.divider, { backgroundColor: colors.subtleBorder }]} />

              <SettingsRow
                icon={<Sparkles size={20} color={colors.accent} />}
                title="Allow Emergency Unlock"
                subtitle="Grants a 5-minute temporary unlock option"
                trailing={
                  <AnimatedToggle
                    value={shieldSettings.emergencyUnlockAllowed}
                    onValueChange={(val) => updateShieldState({ emergencyUnlockAllowed: val })}
                  />
                }
              />
            </ElevatedCard>
          </ScrollView>
        </View>
      </View>

      {/* App Picker Modal */}
      <Modal visible={appPickerVisible} animationType="slide" transparent onRequestClose={() => setAppPickerVisible(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.elevatedCard }, Shadows.floating]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Blocked Apps</Text>
              <AnimatedPressable profile="smallControl" onPress={() => setAppPickerVisible(false)}>
                <X size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: colors.secondaryBackground }]}>
              <Search size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search installed apps..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsRow}>
              <AnimatedPressable profile="smallControl" onPress={handleSelectAll} style={styles.quickActionLink}>
                <Text style={[styles.quickActionText, { color: colors.accent }]}>Select Visible</Text>
              </AnimatedPressable>
              <Text style={{ color: colors.textTertiary }}>•</Text>
              <AnimatedPressable profile="smallControl" onPress={handleClearAll} style={styles.quickActionLink}>
                <Text style={[styles.quickActionText, { color: colors.error }]}>Clear All</Text>
              </AnimatedPressable>
            </View>

            {/* Apps List */}
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {filteredApps.map((app) => {
                const isSelected = selectedPackages.has(app.packageName);
                return (
                  <AnimatedPressable
                    key={app.packageName}
                    profile="card"
                    onPress={() => handleToggleAppSelection(app.packageName)}
                    style={[
                      styles.appRow,
                      {
                        backgroundColor: isSelected ? colors.accent + '15' : colors.secondaryBackground,
                        borderColor: isSelected ? colors.accent : colors.subtleBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.appNameText, { color: colors.textPrimary }]}>{app.appName}</Text>
                      <Text style={[styles.appPkgText, { color: colors.textTertiary }]}>{app.packageName}</Text>
                    </View>
                    {isSelected ? (
                      <CheckSquare size={20} color={colors.accent} />
                    ) : (
                      <Square size={20} color={colors.textTertiary} />
                    )}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* CTA */}
            <AnimatedPressable
              profile="primaryButton"
              onPress={handleSaveAppSelection}
              style={[styles.saveAppsBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.saveAppsBtnText}>
                Done ({selectedPackages.size} Blocked)
              </Text>
            </AnimatedPressable>
          </View>
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
  innerWrapper: {
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
  guideCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  guideTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  guideDesc: {
    ...TypographyScale.footnote,
    lineHeight: 18,
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs + 2,
    marginLeft: Spacing.xs,
    letterSpacing: 0.8,
  },
  cardSection: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.md,
    marginBottom: Spacing.xs,
  },
  searchInput: {
    ...TypographyScale.body,
    flex: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  quickActionLink: {
    paddingVertical: 2,
  },
  quickActionText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
  },
  appNameText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  appPkgText: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  saveAppsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.md,
  },
  saveAppsBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
