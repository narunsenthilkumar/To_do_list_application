import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Lock,
  User,
  ShieldCheck,
  Smartphone,
  Copy,
  X,
  Key,
} from 'lucide-react-native';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { BrandLogo } from '../../components/common/BrandLogo';
import { AccountService } from '../../auth/AccountService';
import { DevicePairing } from '../../sync/DevicePairing';
import { ClipboardService } from '../../services/clipboard/ClipboardService';
import { useTheme } from '../../store/ThemeContext';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pair Modal State
  const [pairModalVisible, setPairModalVisible] = useState(false);
  const [inputPayload, setInputPayload] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const handleSignIn = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await AccountService.login({ identifier: identifier.trim(), password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign In Failed', e.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueOffline = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AccountService.continueOffline();
    router.replace('/(tabs)');
  };

  const handlePastePayload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = await ClipboardService.getString();
    if (text) {
      setInputPayload(text);
    } else {
      Alert.alert('Clipboard Empty', 'No text found in clipboard.');
    }
  };

  const handlePairAccount = async () => {
    if (!inputPayload.trim()) {
      Alert.alert('Missing Payload', 'Please paste the pairing payload JSON from your existing device.');
      return;
    }
    if (!inputCode.trim()) {
      Alert.alert('Missing 6-Digit Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsPairingLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const validation = DevicePairing.validatePairingPayload(inputPayload.trim(), inputCode.trim());
      if (!validation.isValid || !validation.payload) {
        throw new Error(validation.errorMessage || 'Invalid pairing payload or code.');
      }

      const result = await DevicePairing.commitPairingPayload(validation.payload);
      setPairModalVisible(false);
      setInputPayload('');
      setInputCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Account Connected & Synced',
        `Welcome ${validation.payload.accountName}! Restored ${result.tasksImported} tasks and ${result.projectsImported} projects from ${validation.payload.senderDeviceName}.`,
        [
          {
            text: 'Open KIVENTA',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Pairing Failed', e.message || 'Could not connect account.');
    } finally {
      setIsPairingLoading(false);
    }
  };

  return (
    <PrimarySurface style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <BrandLogo size={68} animated withShadow style={{ marginBottom: Spacing.sm }} />
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>KIVENTA</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Local-First & Multi-Device Productivity
            </Text>
          </View>

          <ElevatedCard style={[styles.formCard, Shadows.card]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Welcome Back</Text>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
              Sign in to your local KIVENTA account
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username or Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <User size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="e.g. narun@example.com"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <Lock size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <AnimatedPressable
              profile="primaryButton"
              onPress={handleSignIn}
              disabled={isLoading}
              style={[styles.signInBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.signInText}>{isLoading ? 'Signing In...' : 'Sign In'}</Text>
            </AnimatedPressable>

            <AnimatedPressable
              profile="smallControl"
              onPress={() => setPairModalVisible(true)}
              style={[styles.pairDeviceBtn, { backgroundColor: colors.secondaryBackground }]}
            >
              <Smartphone size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.pairDeviceText, { color: colors.textPrimary }]}>
                Connect Existing Account (Pair Device)
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              profile="smallControl"
              onPress={() => router.push('/auth/register')}
              style={[styles.createAccountBtn, { backgroundColor: 'transparent' }]}
            >
              <Text style={[styles.createAccountText, { color: colors.accent }]}>Create New Account</Text>
            </AnimatedPressable>
          </ElevatedCard>

          <AnimatedPressable
            profile="smallControl"
            onPress={handleContinueOffline}
            style={styles.offlineBtn}
          >
            <Text style={[styles.offlineText, { color: colors.textTertiary }]}>
              Continue Offline without Account →
            </Text>
          </AnimatedPressable>

          <View style={styles.privacyNote}>
            <ShieldCheck size={14} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={[styles.privacyText, { color: colors.textTertiary }]}>
              100% Offline-First. No passwords transmitted to external servers.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Connect / Pair Account Modal */}
      <Modal visible={pairModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ElevatedCard style={[styles.modalCard, Shadows.floating]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Key size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Connect Existing Account</Text>
              </View>
              <AnimatedPressable profile="smallControl" onPress={() => setPairModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              On your other device, go to <Text style={{ fontWeight: '700' }}>Settings → Sync & Devices → Connect Device</Text> to get your pairing payload & 6-digit code.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
              Pairing Payload JSON
            </Text>
            <TextInput
              value={inputPayload}
              onChangeText={setInputPayload}
              placeholder="Paste pairing payload JSON here..."
              placeholderTextColor={colors.textTertiary}
              multiline
              style={[
                styles.modalTextArea,
                { backgroundColor: colors.secondaryBackground, color: colors.textPrimary },
              ]}
            />
            <AnimatedPressable profile="smallControl" onPress={handlePastePayload} style={styles.pasteBtn}>
              <Copy size={14} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.pasteBtnText, { color: colors.accent }]}>Paste from Clipboard</Text>
            </AnimatedPressable>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
              6-Digit Verification Code
            </Text>
            <TextInput
              value={inputCode}
              onChangeText={setInputCode}
              placeholder="e.g. 482-913"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              style={[
                styles.modalInput,
                { backgroundColor: colors.secondaryBackground, color: colors.textPrimary },
              ]}
            />

            <AnimatedPressable
              profile="primaryButton"
              onPress={handlePairAccount}
              disabled={isPairingLoading}
              style={[styles.pairConfirmBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.pairConfirmText}>
                {isPairingLoading ? 'Connecting & Restoring...' : 'Pair & Restore Account'}
              </Text>
            </AnimatedPressable>
          </ElevatedCard>
        </View>
      </Modal>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandTitle: {
    ...TypographyScale.largeTitle,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 4,
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    padding: Spacing.xl,
    borderRadius: Radii.xl,
  },
  cardTitle: {
    ...TypographyScale.title2,
    fontWeight: '700',
  },
  cardSub: {
    ...TypographyScale.footnote,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...TypographyScale.caption1,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    ...TypographyScale.body,
    flex: 1,
  },
  signInBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  signInText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pairDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    marginBottom: Spacing.sm,
  },
  pairDeviceText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  createAccountBtn: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  offlineBtn: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  offlineText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  privacyText: {
    ...TypographyScale.caption2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    padding: Spacing.lg,
    borderRadius: Radii.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modalTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  modalSub: {
    ...TypographyScale.caption1,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalTextArea: {
    borderRadius: Radii.md,
    padding: Spacing.md,
    height: 90,
    ...TypographyScale.caption2,
    fontFamily: 'monospace',
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: Spacing.xs,
    paddingVertical: 2,
  },
  pasteBtnText: {
    ...TypographyScale.caption2,
    fontWeight: '600',
  },
  modalInput: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    ...TypographyScale.body,
  },
  pairConfirmBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  pairConfirmText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
