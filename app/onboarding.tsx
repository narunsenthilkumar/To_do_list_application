import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Target, Bell, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../components/common/PrimarySurface';
import { BrandLogo } from '../components/common/BrandLogo';
import { useTheme } from '../store/ThemeContext';
import { Repository } from '../services/storage/repository';
import { NotificationService } from '../services/notifications/notificationService';
import { Radii, Spacing, TypographyScale } from '../theme/tokens';

const { width } = Dimensions.get('window');

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
    },
    {
      icon: Target,
      title: 'Focus & Achieve\nYour Daily Goals.',
      subtitle: 'Build unstoppable momentum with Pomodoro focus sessions, daily productivity streaks, and instant smart list organization.',
      color: colors.warning,
    },
    {
      icon: Bell,
      title: 'Timely Reminders.\nNever miss what matters.',
      subtitle: 'Schedule precise task notifications and recurring reminders that stay seamlessly synchronized across your day.',
      color: colors.success,
    },
  ];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      await NotificationService.requestPermissions();
      await Repository.saveOnboardingDone(true);
      router.replace('/(tabs)');
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
          <Text style={styles.nextBtnText}>{step === SLIDES.length - 1 ? 'Get Started' : 'Continue'}</Text>
          <ArrowRight size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </Pressable>
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
    gap: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
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
});
