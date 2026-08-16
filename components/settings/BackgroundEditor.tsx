import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  Eye,
  Check,
  Zap,
  Droplet,
  Compass,
} from 'lucide-react-native';
import {
  useTheme,
  BackgroundStyle,
  BackgroundSettings,
} from '../../store/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { AnimatedToggle } from './AnimatedToggle';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

const BACKGROUND_STYLES: {
  id: BackgroundStyle;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  colors: string[];
}[] = [
  {
    id: 'ambient',
    name: 'Ambient',
    subtitle: 'Soft moving glow',
    icon: Sparkles,
    colors: ['#007AFF', '#5856D6'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    subtitle: 'Flowing aurora field',
    icon: Compass,
    colors: ['#34C759', '#00C7BE', '#5856D6'],
  },
  {
    id: 'liquid',
    name: 'Liquid',
    subtitle: 'Slow fluid movement',
    icon: Droplet,
    colors: ['#00C7BE', '#007AFF', '#AF52DE'],
  },
  {
    id: 'mesh',
    name: 'Mesh',
    subtitle: 'Soft gradient mesh',
    icon: Layers,
    colors: ['#AF52DE', '#FF2D55', '#FF9500'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    subtitle: 'Clean static backdrop',
    icon: Minimize2,
    colors: ['#8E8E93', '#636366'],
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    subtitle: 'Animated energy field',
    icon: Zap,
    colors: ['#FF9500', '#FF3B30', '#5856D6'],
  },
];

const PRESET_PALETTES = [
  '#007AFF', // System Blue
  '#5856D6', // Purple
  '#AF52DE', // Violet
  '#FF2D55', // Pink
  '#FF9500', // Orange
  '#34C759', // Green
  '#00C7BE', // Teal
  '#30B0C7', // Cyan
  '#8E8E93', // Monochromatic Silver
];

export const BackgroundEditor: React.FC = () => {
  const { colors, isDark, backgroundSettings, updateBackgroundSettings } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  // Live preview animation values
  const animProgress = useSharedValue(0);

  useEffect(() => {
    if (backgroundSettings.animationEnabled) {
      const duration = Math.max(1500, 8000 - (backgroundSettings.motionSpeed / 100) * 5000);
      animProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      animProgress.value = withTiming(0.5, { duration: 400 });
    }
  }, [backgroundSettings.animationEnabled, backgroundSettings.motionSpeed]);

  const animatedOrbStyle1 = useAnimatedStyle(() => {
    const scale = 0.9 + animProgress.value * 0.25;
    const translateX = (animProgress.value - 0.5) * 40;
    const translateY = (animProgress.value - 0.5) * -30;
    return {
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  const animatedOrbStyle2 = useAnimatedStyle(() => {
    const scale = 1.15 - animProgress.value * 0.25;
    const translateX = (animProgress.value - 0.5) * -35;
    const translateY = (animProgress.value - 0.5) * 35;
    return {
      transform: [{ translateX }, { translateY }, { scale }],
    };
  });

  const isWideScreen = containerWidth >= 640;

  const handleSelectStyle = (styleId: BackgroundStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateBackgroundSettings({ style: styleId });
  };

  const handleSelectColor = (colorHex: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateBackgroundSettings({ accentColor: colorHex });
  };

  const renderLivePreview = () => {
    const opacity = (backgroundSettings.intensity / 100) * (isDark ? 0.75 : 0.6);
    const activeColor = backgroundSettings.accentColor;

    return (
      <View
        style={[
          styles.previewContainer,
          {
            backgroundColor: isDark ? '#0B0F19' : '#F2F4F8',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
          Shadows.floating,
        ]}
      >
        {/* Animated Orbs */}
        <Animated.View
          style={[
            styles.previewOrb,
            {
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: activeColor,
              opacity,
              top: '15%',
              left: '10%',
            },
            animatedOrbStyle1,
          ]}
        />
        <Animated.View
          style={[
            styles.previewOrb,
            {
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: backgroundSettings.style === 'aurora' ? '#34C759' : '#AF52DE',
              opacity: opacity * 0.8,
              bottom: '10%',
              right: '10%',
            },
            animatedOrbStyle2,
          ]}
        />

        {/* Central Glass Plate */}
        <View
          style={[
            styles.previewBadge,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.1)',
            },
            Shadows.card,
          ]}
        >
          <View style={[styles.stylePill, { backgroundColor: activeColor + '20' }]}>
            <Sparkles size={14} color={activeColor} style={{ marginRight: 6 }} />
            <Text style={[styles.stylePillText, { color: activeColor }]}>
              {backgroundSettings.style.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.badgeTitle, { color: colors.textPrimary }]}>
            Live Background Preview
          </Text>
          <Text style={[styles.badgeMeta, { color: colors.textTertiary }]}>
            Intensity: {backgroundSettings.intensity}% · Blur: {backgroundSettings.blur}% · Speed: {backgroundSettings.motionSpeed}%
          </Text>
        </View>
      </View>
    );
  };

  const renderControls = () => {
    return (
      <View style={styles.controlsWrapper}>
        {/* Style Selection Cards */}
        <Text style={[styles.controlSectionHeader, { color: colors.textTertiary }]}>
          BACKGROUND STYLE
        </Text>
        <View style={styles.styleGrid}>
          {BACKGROUND_STYLES.map((st) => {
            const isSelected = backgroundSettings.style === st.id;
            const IconComp = st.icon;

            return (
              <AnimatedPressable
                key={st.id}
                profile="card"
                onPress={() => handleSelectStyle(st.id)}
                style={[
                  styles.styleCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isSelected
                      ? colors.accent
                      : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.06)',
                    borderWidth: isSelected ? 2 : 1,
                  },
                  isSelected && Shadows.card,
                ]}
              >
                <View style={styles.styleCardHeader}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isSelected ? colors.accent + '20' : colors.secondaryBackground },
                    ]}
                  >
                    <IconComp size={18} color={isSelected ? colors.accent : colors.textSecondary} />
                  </View>
                  {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: colors.accent }]}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.styleCardTitle,
                    { color: isSelected ? colors.accent : colors.textPrimary },
                  ]}
                >
                  {st.name}
                </Text>
                <Text style={[styles.styleCardSub, { color: colors.textTertiary }]}>
                  {st.subtitle}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Color Palette Row */}
        <Text style={[styles.controlSectionHeader, { color: colors.textTertiary, marginTop: Spacing.xl }]}>
          COLOR ACCENT
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteScroll}
        >
          {PRESET_PALETTES.map((colorHex) => {
            const isSelected = backgroundSettings.accentColor.toLowerCase() === colorHex.toLowerCase();
            return (
              <Pressable
                key={colorHex}
                accessibilityRole="button"
                accessibilityLabel={`Select color ${colorHex}`}
                onPress={() => handleSelectColor(colorHex)}
                style={[
                  styles.paletteCircle,
                  {
                    backgroundColor: colorHex,
                    borderColor: isSelected ? (isDark ? '#FFFFFF' : '#000000') : 'transparent',
                    borderWidth: isSelected ? 3 : 0,
                    transform: [{ scale: isSelected ? 1.15 : 1 }],
                  },
                ]}
              >
                {isSelected && <Check size={14} color="#FFFFFF" />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Continuous Sliders with Generous Touch Targets */}
        <Text style={[styles.controlSectionHeader, { color: colors.textTertiary, marginTop: Spacing.xl }]}>
          INTENSITY & BLUR
        </Text>

        {/* Intensity Control */}
        <View style={[styles.sliderRowCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)' }]}>
          <View style={styles.sliderInfoRow}>
            <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>Intensity</Text>
            <Text style={[styles.sliderValue, { color: colors.accent }]}>{backgroundSettings.intensity}%</Text>
          </View>
          <View style={styles.stepperRow}>
            {[30, 50, 70, 90].map((step) => (
              <AnimatedPressable
                key={step}
                profile="smallControl"
                onPress={() => updateBackgroundSettings({ intensity: step })}
                style={[
                  styles.stepPill,
                  {
                    backgroundColor:
                      backgroundSettings.intensity === step
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    {
                      color:
                        backgroundSettings.intensity === step ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {step}%
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Blur Control */}
        <View style={[styles.sliderRowCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', marginTop: Spacing.sm }]}>
          <View style={styles.sliderInfoRow}>
            <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>Atmospheric Blur</Text>
            <Text style={[styles.sliderValue, { color: colors.accent }]}>{backgroundSettings.blur}%</Text>
          </View>
          <View style={styles.stepperRow}>
            {[20, 40, 60, 80].map((step) => (
              <AnimatedPressable
                key={step}
                profile="smallControl"
                onPress={() => updateBackgroundSettings({ blur: step })}
                style={[
                  styles.stepPill,
                  {
                    backgroundColor:
                      backgroundSettings.blur === step
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stepPillText,
                    {
                      color:
                        backgroundSettings.blur === step ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {step}%
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Motion & Animation Controls */}
        <Text style={[styles.controlSectionHeader, { color: colors.textTertiary, marginTop: Spacing.xl }]}>
          ANIMATION & SPEED
        </Text>

        <View style={[styles.sliderRowCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)' }]}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>Live Motion</Text>
              <Text style={[styles.subToggleNote, { color: colors.textTertiary }]}>
                Smooth ambient background drift
              </Text>
            </View>
            <AnimatedToggle
              value={backgroundSettings.animationEnabled}
              onValueChange={(val) => updateBackgroundSettings({ animationEnabled: val })}
            />
          </View>

          {backgroundSettings.animationEnabled && (
            <View style={{ marginTop: Spacing.md }}>
              <View style={styles.sliderInfoRow}>
                <Text style={[styles.subSliderLabel, { color: colors.textSecondary }]}>Motion Speed</Text>
                <Text style={[styles.sliderValue, { color: colors.accent }]}>
                  {backgroundSettings.motionSpeed}%
                </Text>
              </View>
              <View style={styles.stepperRow}>
                {[25, 50, 75, 100].map((spd) => (
                  <AnimatedPressable
                    key={spd}
                    profile="smallControl"
                    onPress={() => updateBackgroundSettings({ motionSpeed: spd })}
                    style={[
                      styles.stepPill,
                      {
                        backgroundColor:
                          backgroundSettings.motionSpeed === spd
                            ? colors.accent
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepPillText,
                        {
                          color:
                            backgroundSettings.motionSpeed === spd
                              ? '#FFFFFF'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {spd === 25 ? 'Slow' : spd === 50 ? 'Medium' : spd === 75 ? 'Fast' : 'Dynamic'}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
      style={styles.mainContainer}
    >
      {isWideScreen ? (
        <View style={styles.twoColumnLayout}>
          <View style={styles.leftColumn}>{renderLivePreview()}</View>
          <View style={styles.rightColumn}>{renderControls()}</View>
        </View>
      ) : (
        <View style={styles.singleColumnLayout}>
          {renderLivePreview()}
          <View style={{ marginTop: Spacing.xl }}>{renderControls()}</View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    width: '100%',
  },
  twoColumnLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xl,
  },
  leftColumn: {
    flex: 1.1,
    position: 'relative',
  },
  rightColumn: {
    flex: 1.3,
  },
  singleColumnLayout: {
    flexDirection: 'column',
  },
  previewContainer: {
    width: '100%',
    height: 230,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  previewOrb: {
    position: 'absolute',
    filter: 'blur(32px)',
  },
  previewBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  stylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    marginBottom: 4,
  },
  stylePillText: {
    ...TypographyScale.caption2,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  badgeMeta: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
  controlsWrapper: {
    width: '100%',
  },
  controlSectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  styleCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 100,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  styleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleCardTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  styleCardSub: {
    ...TypographyScale.caption2,
    marginTop: 1,
  },
  paletteScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  paletteCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderRowCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sliderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sliderLabel: {
    ...TypographyScale.subhead,
    fontWeight: '600',
  },
  subSliderLabel: {
    ...TypographyScale.caption1,
    fontWeight: '500',
  },
  sliderValue: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  stepPill: {
    flex: 1,
    height: 34,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subToggleNote: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
});
