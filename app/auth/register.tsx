import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { BrandLogo } from '../../components/common/BrandLogo';
import { AccountService } from '../../auth/AccountService';
import { useTheme } from '../../store/ThemeContext';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { UserPlus, ArrowLeft, Lock, Mail, User, ShieldCheck } from 'lucide-react-native';
import { safeGoBack } from '../../utils/navigation';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await AccountService.register({
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Account Created', 'Your local Taskora account is ready and protected by offline encryption.', [
        {
          text: 'Get Started',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message || 'Could not create account.');
    } finally {
      setIsLoading(false);
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
            { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router, '/auth/login')} style={styles.backBtn} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
          </View>

          <View style={styles.header}>
            <BrandLogo size={68} animated withShadow style={{ marginBottom: Spacing.sm }} />
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your identity across paired devices
            </Text>
          </View>

          <ElevatedCard style={[styles.formCard, Shadows.card]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Your Full Name</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <User size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Narun JS"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <User size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="e.g. narun"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address (Optional)</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <Mail size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. narun@example.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
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
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.secondaryBackground }]}>
                <Lock size={18} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <AnimatedPressable
              profile="primaryButton"
              onPress={handleRegister}
              disabled={isLoading}
              style={[styles.registerBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.registerText}>{isLoading ? 'Creating...' : 'Create Account'}</Text>
            </AnimatedPressable>
          </ElevatedCard>

          <View style={styles.privacyNote}>
            <ShieldCheck size={14} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={[styles.privacyText, { color: colors.textTertiary }]}>
              Stored safely with salted cryptographic derivation.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  brandTitle: {
    ...TypographyScale.title1,
    fontWeight: '800',
  },
  subtitle: {
    ...TypographyScale.footnote,
    marginTop: 2,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.xl,
    borderRadius: Radii.xl,
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
  registerBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  registerText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  privacyText: {
    ...TypographyScale.caption2,
  },
});
