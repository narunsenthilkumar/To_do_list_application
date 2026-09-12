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
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${st.name} background style`}
                style={[
                  styles.styleCard,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? colors.accent + '22'
                        : colors.accent + '15'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(0, 0, 0, 0.02)',
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
                      {
                        backgroundColor: isSelected
                          ? colors.accent + '30'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.05)',
                      },
                    ]}
                  >
                    <IconComp size={18} color={isSelected ? colors.accent : colors.textSecondary} />
                  </View>
                  {isSelected ? (
                    <View style={[styles.selectedCheck, { backgroundColor: colors.accent }]}>
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.unselectedPlaceholder} />
                  )}
                </View>
                <View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.styleCardTitle,
                      { color: isSelected ? colors.accent : colors.textPrimary },
                    ]}
                  >
                    {st.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.styleCardSub, { color: colors.textTertiary }]}>
                    {st.subtitle}
                  </Text>
                </View>
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
              <AnimatedPressable
                key={colorHex}
                profile="smallControl"
                accessibilityRole="button"
                accessibilityLabel={`Select color ${colorHex}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelectColor(colorHex)}
                style={[
                  styles.paletteTouchTarget,
                  isSelected && {
                    borderColor: isDark ? '#FFFFFF' : colors.accent,
                    borderWidth: 2.5,
                  },
                ]}
              >
                <View
                  style={[
                    styles.paletteInnerCircle,
                    { backgroundColor: colorHex },
                  ]}
                >
                  {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </AnimatedPressable>
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
          <View
            style={[
              styles.segmentedTrack,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {[30, 50, 70, 90].map((step) => {
              const isSelected = backgroundSettings.intensity === step;
              return (
                <AnimatedPressable
                  key={step}
                  profile="smallControl"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Intensity ${step}%`}
                  onPress={() => updateBackgroundSettings({ intensity: step })}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                      borderColor: isSelected
                        ? 'transparent'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    },
                    isSelected && styles.segmentBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {step}%
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Blur Control */}
        <View style={[styles.sliderRowCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)', marginTop: Spacing.sm }]}>
          <View style={styles.sliderInfoRow}>
            <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>Atmospheric Blur</Text>
            <Text style={[styles.sliderValue, { color: colors.accent }]}>{backgroundSettings.blur}%</Text>
          </View>
          <View
            style={[
              styles.segmentedTrack,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            {[20, 40, 60, 80].map((step) => {
              const isSelected = backgroundSettings.blur === step;
              return (
                <AnimatedPressable
                  key={step}
                  profile="smallControl"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Blur ${step}%`}
                  onPress={() => updateBackgroundSettings({ blur: step })}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : isDark
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.03)',
                      borderColor: isSelected
                        ? 'transparent'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    },
                    isSelected && styles.segmentBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '800' : '600',
                      },
                    ]}
                  >
                    {step}%
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Motion & Animation Controls */}
        <Text style={[styles.controlSectionHeader, { color: colors.textTertiary, marginTop: Spacing.xl }]}>
          ANIMATION & SPEED
        </Text>

        <View style={[styles.sliderRowCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)' }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>Live Motion</Text>
              <Text style={[styles.subToggleNote, { color: colors.textTertiary }]}>
                Smooth ambient background drift
              </Text>
            </View>
            <AnimatedToggle
              value={backgroundSettings.animationEnabled}
              onValueChange={(val) => updateBackgroundSettings({ animationEnabled: val })}
              accessibilityLabel="Toggle Live Motion animation"
            />
          </View>

          {backgroundSettings.animationEnabled && (
            <View style={{ marginTop: Spacing.md }}>
              <View style={styles.sliderInfoRow}>
                <Text style={[styles.subSliderLabel, { color: colors.textSecondary }]}>Motion Speed</Text>
                <Text style={[styles.sliderValue, { color: colors.accent }]}>
                  {backgroundSettings.motionSpeed <= 25 ? 'Slow' : backgroundSettings.motionSpeed <= 50 ? 'Medium' : backgroundSettings.motionSpeed <= 75 ? 'Fast' : 'Dynamic'}
                </Text>
              </View>
              <View
                style={[
                  styles.segmentedTrack,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                {[
                  { spd: 25, label: 'Slow' },
                  { spd: 50, label: 'Medium' },
                  { spd: 75, label: 'Fast' },
                  { spd: 100, label: 'Dynamic' },
                ].map(({ spd, label }) => {
                  const isSelected = backgroundSettings.motionSpeed === spd;
                  return (
                    <AnimatedPressable
                      key={spd}
                      profile="smallControl"
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Motion Speed ${label}`}
                      onPress={() => updateBackgroundSettings({ motionSpeed: spd })}
                      style={[
                        styles.segmentBtn,
                        {
                          backgroundColor: isSelected
                            ? colors.accent
                            : isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isSelected
                            ? 'transparent'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.06)',
                        },
                        isSelected && styles.segmentBtnActive,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.segmentBtnText,
                          {
                            color: isSelected ? '#FFFFFF' : colors.textSecondary,
                            fontWeight: isSelected ? '800' : '600',
                            fontSize: 12.5,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
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
    justifyContent: 'space-between',
  },
  styleCard: {
    width: '48%',
    minWidth: 130,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  styleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedPlaceholder: {
    width: 22,
    height: 22,
  },
  styleCardTitle: {
    ...TypographyScale.footnote,
    fontWeight: '700',
    fontSize: 13.5,
  },
  styleCardSub: {
    ...TypographyScale.caption2,
    marginTop: 2,
    fontSize: 11,
  },
  paletteScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  paletteTouchTarget: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  paletteInnerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderRowCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sliderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sliderLabel: {
    ...TypographyScale.subhead,
    fontWeight: '700',
  },
  subSliderLabel: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  sliderValue: {
    ...TypographyScale.footnote,
    fontWeight: '800',
  },
  segmentedTrack: {
    flexDirection: 'row',
    height: 48,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    alignItems: 'center',
  },
  segmentBtn: {
    flex: 1,
    height: '100%',
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentBtnText: {
    ...TypographyScale.caption1,
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  subToggleNote: {
    ...TypographyScale.caption2,
    marginTop: 2,
  },
});
