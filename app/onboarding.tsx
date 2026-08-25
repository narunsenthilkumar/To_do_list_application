import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Target, Bell, Clock, Radio, ArrowRight, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../components/common/PrimarySurface';
import { BrandLogo } from '../components/common/BrandLogo';
import { useTheme } from '../store/ThemeContext';
import { Repository } from '../services/storage/repository';
import { PermissionManager } from '../services/permissions/PermissionManager';
import { Radii, Spacing, TypographyScale } from '../theme/tokens';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);

  const SLIDES = [
    {
      icon: Sparkles,
      title: 'Organize your life.\nOne task at a time.',
      subtitle: 'Taskora brings Apple-inspired clarity, fluid gestures, and instant natural language task capture to your daily workflow.',
      color: colors.accent,
      permissionType: null,
      actionText: 'Get Started',
    },
    {
      icon: Bell,
      title: 'Timely Reminders.\nNever miss what matters.',
      subtitle: 'Allow Taskora to send you punctual notifications for upcoming tasks, daily reviews, and deadline reminders.',
      color: colors.accent,
      permissionType: 'notifications' as const,
      actionText: 'Enable Notifications',
    },
    {
      icon: Clock,
      title: 'Exact Alarms &\nDeep Focus Sessions.',
      subtitle: 'High-urgency exact alarms ensure critical tasks and Pomodoro timer intervals alert you reliably on time.',
      color: colors.warning,
      permissionType: 'alarms' as const,
      actionText: 'Enable Reliable Alarms',
    },
    {
      icon: Radio,
      title: 'Nearby Sync.\nInstant Device Sharing.',
      subtitle: 'Seamlessly discover and synchronize tasks with nearby Taskora devices using secure local Bluetooth transfer.',
      color: colors.success,
      permissionType: 'bluetooth' as const,
      actionText: 'Enable Nearby Sync',
    },
    {
      icon: Target,
      title: 'You are all set!\nWelcome to Taskora.',
      subtitle: 'Experience lightning-fast offline-first productivity, personalized themes, and powerful local-first synchronization.',
      color: colors.accent,
      permissionType: null,
      actionText: 'Enter Taskora',
    },
  ];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentSlide = SLIDES[step];

    // Contextual permission request for current step
    if (currentSlide.permissionType) {
      try {
        await PermissionManager.request(currentSlide.permissionType);
      } catch (e) {
        console.warn('[Onboarding] Permission request warning:', e);
      }
    }

    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await Repository.saveOnboardingDone(true);
      router.replace('/');
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await Repository.saveOnboardingDone(true);
      router.replace('/');
    }
  };

  const current = SLIDES[step];
  const IconComponent = current.icon;

  return (
    <PrimarySurface style={styles.container}>
      <View style={styles.content}>
        {/* Animated Brand Logo / Feature Icon */}
        {step === 0 ? (
          <BrandLogo size={88} animated withShadow style={{ marginBottom: Spacing.xl }} />
        ) : (
          <View style={[styles.iconWrapper, { backgroundColor: current.color + '20' }]}>
            <IconComponent size={64} color={current.color} />
          </View>
        )}

        <Text style={[styles.title, { color: colors.textPrimary }]}>{current.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{current.subtitle}</Text>
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {/* Step Indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === step ? colors.accent : colors.secondaryBackground,
                  width: idx === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.nextBtnText}>{current.actionText}</Text>
          <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </Pressable>

        {step > 0 && step < SLIDES.length - 1 && (
          <Pressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipBtnText, { color: colors.textTertiary }]}>Not Now</Text>
          </Pressable>
        )}
      </View>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    padding: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...TypographyScale.largeTitle,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...TypographyScale.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    height: 54,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  skipBtnText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
});
