import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { AccountService } from '../../auth/AccountService';
import { useTheme } from '../../store/ThemeContext';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { CheckCircle2, Lock, User, ShieldCheck } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await AccountService.login({ identifier, password });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign In Failed', e.message || 'Could not log in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueOffline = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AccountService.continueOffline();
    router.replace('/(tabs)');
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
            { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.accent }]}>
              <CheckCircle2 size={36} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>TASKORA</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Local-First & Multi-Device Productivity
            </Text>
          </View>

          <ElevatedCard style={[styles.formCard, Shadows.card]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Welcome Back</Text>
            <Text style={[styles.cardSub, { color: colors.textTertiary }]}>
              Sign in to your local Taskora account
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
              onPress={() => router.push('/auth/register')}
              style={[styles.createAccountBtn, { backgroundColor: colors.secondaryBackground }]}
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
              100% Offline-First. No passwords transmitted to the cloud.
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
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
    maxWidth: 420,
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
  createAccountBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  offlineBtn: {
    marginTop: Spacing.xl,
    padding: Spacing.sm,
  },
  offlineText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
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
