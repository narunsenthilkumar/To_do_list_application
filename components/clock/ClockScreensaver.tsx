import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import Svg, { Circle, Line, Path, Rect, Defs, LinearGradient, RadialGradient, Stop, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';
import {
  X,
  Play,
  Pause,
  Globe,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sliders,
  RotateCw,
  Check,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../store/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { AnalogClock } from './AnalogClock';
import { DigitalClock } from './DigitalClock';
import { formatWorldCityTime } from '../../utils/timeFormatter';
import { Spacing, TypographyScale, Radii, Shadows } from '../../theme/tokens';
import { haptics } from '../../services/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ScreenSaverEnvironment =
  | 'aurora'
  | 'liquid_glass'
  | 'deep_space'
  | 'ocean'
  | 'sunset'
  | 'mist'
  | 'digital_city'
  | 'minimal_apple'
  | 'orbit'
  | 'custom_clock';

export type ClockStyle = 'both' | 'digital' | 'analog' | 'minimal';
export type AnimationIntensity = 'gentle' | 'standard' | 'dynamic';

export interface WorldCityConfig {
  id: string;
  city: string;
  country: string;
  timeZone: string;
  offsetLabel: string;
}

export const ALL_WORLD_CITIES: WorldCityConfig[] = [
  { id: 'london', city: 'London', country: 'UK', timeZone: 'Europe/London', offsetLabel: 'UTC+0/+1' },
  { id: 'new_york', city: 'New York', country: 'USA', timeZone: 'America/New_York', offsetLabel: 'UTC-5/-4' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', offsetLabel: 'UTC+9' },
  { id: 'dubai', city: 'Dubai', country: 'UAE', timeZone: 'Asia/Dubai', offsetLabel: 'UTC+4' },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', offsetLabel: 'UTC+8' },
  { id: 'sydney', city: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney', offsetLabel: 'UTC+10/+11' },
];

export const ENVIRONMENTS: { id: ScreenSaverEnvironment; name: string; description: string }[] = [
  { id: 'aurora', name: 'Aurora', description: 'Flowing northern light ribbons' },
  { id: 'liquid_glass', name: 'Liquid Glass', description: 'Translucent floating refraction forms' },
  { id: 'deep_space', name: 'Deep Space', description: 'Cosmic particle stars & nebula drift' },
  { id: 'ocean', name: 'Ocean Abyssal', description: 'Rhythmic deep oceanic wave sweeps' },
  { id: 'sunset', name: 'Sunset Glow', description: 'Golden amber & coral horizontal dusk' },
  { id: 'mist', name: 'Ethereal Mist', description: 'Soft drifting vapour fog sheets' },
  { id: 'digital_city', name: 'Digital City', description: 'Minimalist skyline with beacon pulses' },
  { id: 'minimal_apple', name: 'Minimal Apple', description: 'Monochrome spatial glass forms' },
  { id: 'orbit', name: 'Celestial Orbit', description: 'Glowing spheres in harmonic orbits' },
  { id: 'custom_clock', name: 'Precision Clock', description: 'High-contrast studio time display' },
];

interface ClockScreensaverProps {
  visible: boolean;
  onClose: () => void;
  timerMode?: string;
  timeLeftFormatted?: string;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
}

export const ClockScreensaver: React.FC<ClockScreensaverProps> = ({
  visible,
  onClose,
  timerMode = 'Focus',
  timeLeftFormatted,
  isTimerRunning = false,
  onToggleTimer,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const insets = useSafeAreaInsets();

  // Environment & Display State
  const [currentEnvIndex, setCurrentEnvIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showControls, setShowControls] = useState<boolean>(true);
  const [clockStyle, setClockStyle] = useState<ClockStyle>('both');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(1.0); // 0.3 - 1.0
  const [intensity, setIntensity] = useState<AnimationIntensity>('standard');
  const [activeCityIds, setActiveCityIds] = useState<string[]>([
    'london',
    'new_york',
    'tokyo',
    'dubai',
    'singapore',
  ]);
  const [settingsModalVisible, setSettingsModalVisible] = useState<boolean>(false);

  // Shared Animation Values
  const animProgress1 = useSharedValue(0);
  const animProgress2 = useSharedValue(0);
  const animOrbitAngle = useSharedValue(0);
  const crossfadeOpacity = useSharedValue(1);

  // Auto-hide controls timeout
  const controlsTimeoutRef = useRef<any>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4500);
  }, []);

  // Clock Ticker
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  // Master Animation Loops
  useEffect(() => {
    if (!visible) {
      cancelAnimation(animProgress1);
      cancelAnimation(animProgress2);
      cancelAnimation(animOrbitAngle);
      return;
    }

    const duration1 = intensity === 'gentle' ? 24000 : intensity === 'dynamic' ? 12000 : 18000;
    const duration2 = intensity === 'gentle' ? 32000 : intensity === 'dynamic' ? 16000 : 22000;
    const durationOrbit = intensity === 'gentle' ? 20000 : intensity === 'dynamic' ? 8000 : 14000;

    animProgress1.value = 0;
    animProgress1.value = withRepeat(
      withTiming(1, { duration: duration1, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    animProgress2.value = 0;
    animProgress2.value = withRepeat(
      withTiming(1, { duration: duration2, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );

    animOrbitAngle.value = 0;
    animOrbitAngle.value = withRepeat(
      withTiming(360, { duration: durationOrbit, easing: Easing.linear }),
      -1,
      false
    );

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [visible, intensity]);

  // Auto-Rotation Timer (Crossfade every 12 seconds if enabled)
  useEffect(() => {
    if (!visible || !autoRotate) return;

    const rotateInterval = setInterval(() => {
      crossfadeOpacity.value = withSequence(
        withTiming(0.1, { duration: 1200 }),
        withTiming(1, { duration: 1200 })
      );
      setTimeout(() => {
        setCurrentEnvIndex((prev) => (prev + 1) % ENVIRONMENTS.length);
      }, 1200);
    }, 12000);

    return () => clearInterval(rotateInterval);
  }, [visible, autoRotate]);

  if (!visible) return null;

  const currentEnv = ENVIRONMENTS[currentEnvIndex].id;

  const handleNextEnv = () => {
    haptics.selection();
    setCurrentEnvIndex((prev) => (prev + 1) % ENVIRONMENTS.length);
    resetControlsTimeout();
  };

  const handlePrevEnv = () => {
    haptics.selection();
    setCurrentEnvIndex((prev) => (prev - 1 + ENVIRONMENTS.length) % ENVIRONMENTS.length);
    resetControlsTimeout();
  };

  const toggleCity = (cityId: string) => {
    haptics.selection();
    setActiveCityIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  // Clock calculations
  const seconds = currentTime.getSeconds();
  const minutes = currentTime.getMinutes();
  const hours = currentTime.getHours();

  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = (minutes / 60) * 360 + (seconds / 60) * 6;
  const hourAngle = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;

  const digitalTimeStr = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const clockSize = 170;
  const radius = clockSize / 2;

  // Animated Environment Components
  const renderEnvironmentBackground = () => {
    switch (currentEnv) {
      case 'aurora':
        return <AuroraEnvironment p1={animProgress1} p2={animProgress2} />;
      case 'liquid_glass':
        return <LiquidGlassEnvironment p1={animProgress1} p2={animProgress2} isDark={isDark} />;
      case 'deep_space':
        return <DeepSpaceEnvironment p1={animProgress1} p2={animProgress2} />;
      case 'ocean':
        return <OceanEnvironment p1={animProgress1} p2={animProgress2} />;
      case 'sunset':
        return <SunsetEnvironment p1={animProgress1} p2={animProgress2} />;
      case 'mist':
        return <MistEnvironment p1={animProgress1} p2={animProgress2} isDark={isDark} />;
      case 'digital_city':
        return <DigitalCityEnvironment p1={animProgress1} p2={animProgress2} />;
      case 'minimal_apple':
        return <MinimalAppleEnvironment p1={animProgress1} isDark={isDark} />;
      case 'orbit':
        return <OrbitEnvironment angle={animOrbitAngle} />;
      case 'custom_clock':
      default:
        return <StudioClockEnvironment isDark={isDark} />;
    }
  };

  const selectedCities = ALL_WORLD_CITIES.filter((c) => activeCityIds.includes(c.id));

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        style={[styles.fullscreenTouch, { opacity: brightness }]}
        onPress={resetControlsTimeout}
        onLongPress={() => {
          haptics.medium();
          setSettingsModalVisible(true);
        }}
      >
        {/* Animated Background Canvas */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: crossfadeOpacity.value }]}>
          {renderEnvironmentBackground()}
        </Animated.View>

        {/* Top Controls Bar */}
        {showControls && (
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={[styles.envBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]}>
              <Sparkles size={14} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.envBadgeText, { color: colors.textPrimary }]}>
                {ENVIRONMENTS[currentEnvIndex].name}
              </Text>
            </View>

            <View style={styles.topRightActions}>
              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  haptics.light();
                  setSettingsModalVisible(true);
                }}
                style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]}
              >
                <Sliders size={18} color={colors.textPrimary} />
              </AnimatedPressable>

              <AnimatedPressable
                profile="smallControl"
                onPress={() => {
                  haptics.light();
                  onClose();
                }}
                style={[styles.headerIconBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]}
              >
                <X size={20} color={colors.textPrimary} />
              </AnimatedPressable>
            </View>
          </View>
        )}

        {/* Center Clock Visuals */}
        <View style={styles.centerStage}>
          {/* Analog Clock */}
          {(clockStyle === 'both' || clockStyle === 'analog') && (
            <AnalogClock
              size={Math.min(SCREEN_WIDTH * 0.55, 210)}
              isContinuous={true}
              style={{ marginBottom: clockStyle === 'both' ? Spacing.md : 0 }}
            />
          )}

          {/* Digital Time & Date */}
          {(clockStyle === 'both' || clockStyle === 'digital' || clockStyle === 'minimal') && (
            <DigitalClock
              showSeconds={true}
              showDate={clockStyle !== 'minimal'}
              timeTextStyle={{
                color: '#FFFFFF',
                fontSize: clockStyle === 'minimal' ? 56 : 38,
                lineHeight: clockStyle === 'minimal' ? 62 : 44,
              }}
              dateTextStyle={{ color: 'rgba(255, 255, 255, 0.75)' }}
            />
          )}

          {/* Focus Session Mini Pill */}
          {timeLeftFormatted && (
            <View
              style={[
                styles.focusPill,
                {
                  backgroundColor: isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.15)',
                  borderColor: colors.accent + '40',
                },
              ]}
            >
              <Text style={[styles.focusPillMode, { color: colors.accent }]}>{timerMode.toUpperCase()}:</Text>
              <Text style={[styles.focusPillValue, { color: colors.accent }]}>{timeLeftFormatted}</Text>
              {onToggleTimer && (
                <Pressable onPress={onToggleTimer} style={styles.focusPillToggle}>
                  {isTimerRunning ? <Pause size={13} color={colors.accent} /> : <Play size={13} color={colors.accent} />}
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* World Clocks Grid Footer */}
        {selectedCities.length > 0 && clockStyle !== 'minimal' && (
          <View style={[styles.worldClocksFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Text style={[styles.worldSectionTitle, { color: colors.textTertiary }]}>GLOBAL TIMEZONES</Text>
            <View style={styles.citiesRow}>
              {selectedCities.map((item) => {
                const cityTime = formatWorldCityTime(item.timeZone, timeFormat);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.cityBox,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.85)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      },
                    ]}
                  >
                    <Text style={[styles.cityName, { color: colors.textPrimary }]}>{item.city}</Text>
                    <Text style={[styles.cityOffset, { color: colors.textTertiary }]}>{item.offsetLabel}</Text>
                    <Text style={[styles.cityTime, { color: colors.accent }]}>{cityTime}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Lateral Floating Nav Arrows (Visible when controls shown) */}
        {showControls && (
          <>
            <AnimatedPressable profile="smallControl" onPress={handlePrevEnv} style={[styles.sideArrowLeft, { left: 16 }]}>
              <ChevronLeft size={24} color="#FFFFFF" />
            </AnimatedPressable>
            <AnimatedPressable profile="smallControl" onPress={handleNextEnv} style={[styles.sideArrowRight, { right: 16 }]}>
              <ChevronRight size={24} color="#FFFFFF" />
            </AnimatedPressable>
          </>
        )}
      </Pressable>

      {/* Ambient Settings Sheet Modal */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={[styles.settingsOverlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.settingsCard, { backgroundColor: colors.elevatedCard }, Shadows.floating]}>
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Ambient Screensaver Settings</Text>
              <AnimatedPressable profile="smallControl" onPress={() => setSettingsModalVisible(false)}>
                <X size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Select Environment */}
              <Text style={[styles.settingLabel, { color: colors.textTertiary }]}>ENVIRONMENT</Text>
              <View style={styles.envGrid}>
                {ENVIRONMENTS.map((env, idx) => (
                  <AnimatedPressable
                    key={env.id}
                    profile="card"
                    onPress={() => {
                      haptics.selection();
                      setCurrentEnvIndex(idx);
                    }}
                    style={[
                      styles.envSelectBtn,
                      {
                        backgroundColor: currentEnvIndex === idx ? colors.accent : colors.secondaryBackground,
                      },
                    ]}
                  >
                    <Text style={[styles.envSelectBtnText, { color: currentEnvIndex === idx ? '#FFFFFF' : colors.textPrimary }]}>
                      {env.name}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              {/* Clock Style */}
              <Text style={[styles.settingLabel, { color: colors.textTertiary }]}>CLOCK DISPLAY STYLE</Text>
              <View style={styles.segmentRow}>
                {(['both', 'digital', 'analog', 'minimal'] as ClockStyle[]).map((styleOpt) => (
                  <AnimatedPressable
                    key={styleOpt}
                    profile="smallControl"
                    onPress={() => {
                      haptics.selection();
                      setClockStyle(styleOpt);
                    }}
                    style={[
                      styles.segmentBtn,
                      { backgroundColor: clockStyle === styleOpt ? colors.accent : colors.secondaryBackground },
                    ]}
                  >
                    <Text style={[styles.segmentBtnText, { color: clockStyle === styleOpt ? '#FFFFFF' : colors.textPrimary }]}>
                      {styleOpt.charAt(0).toUpperCase() + styleOpt.slice(1)}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              {/* Auto-Rotation Toggle */}
              <Text style={[styles.settingLabel, { color: colors.textTertiary }]}>AUTO ROTATE (CROSSFADE)</Text>
              <AnimatedPressable
                profile="card"
                onPress={() => {
                  haptics.selection();
                  setAutoRotate(!autoRotate);
                }}
                style={[
                  styles.toggleRow,
                  { backgroundColor: autoRotate ? colors.accent + '20' : colors.secondaryBackground },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RotateCw size={18} color={autoRotate ? colors.accent : colors.textSecondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.toggleLabel, { color: autoRotate ? colors.accent : colors.textPrimary }]}>
                    Auto-Cycle Environments (Every 12s)
                  </Text>
                </View>
                {autoRotate && <Check size={18} color={colors.accent} />}
              </AnimatedPressable>

              {/* Animation Intensity */}
              <Text style={[styles.settingLabel, { color: colors.textTertiary }]}>ANIMATION INTENSITY</Text>
              <View style={styles.segmentRow}>
                {(['gentle', 'standard', 'dynamic'] as AnimationIntensity[]).map((level) => (
                  <AnimatedPressable
                    key={level}
                    profile="smallControl"
                    onPress={() => {
                      haptics.selection();
                      setIntensity(level);
                    }}
                    style={[
                      styles.segmentBtn,
                      { backgroundColor: intensity === level ? colors.accent : colors.secondaryBackground },
                    ]}
                  >
                    <Text style={[styles.segmentBtnText, { color: intensity === level ? '#FFFFFF' : colors.textPrimary }]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>

              {/* World Clocks Selector */}
              <Text style={[styles.settingLabel, { color: colors.textTertiary }]}>ENABLED WORLD CLOCKS</Text>
              <View style={styles.cityToggleGrid}>
                {ALL_WORLD_CITIES.map((c) => {
                  const isEnabled = activeCityIds.includes(c.id);
                  return (
                    <AnimatedPressable
                      key={c.id}
                      profile="smallControl"
                      onPress={() => toggleCity(c.id)}
                      style={[
                        styles.cityChip,
                        { backgroundColor: isEnabled ? colors.accent : colors.secondaryBackground },
                      ]}
                    >
                      <Text style={[styles.cityChipText, { color: isEnabled ? '#FFFFFF' : colors.textPrimary }]}>
                        {c.city}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </ScrollView>

            <AnimatedPressable
              profile="primaryButton"
              onPress={() => setSettingsModalVisible(false)}
              style={[styles.doneSettingsBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.doneSettingsBtnText}>Done</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// =============================================================================
// 10 RICH AMBIENT ENVIRONMENTS
// =============================================================================

// 1. AURORA
const AuroraEnvironment: React.FC<{ p1: any; p2: any }> = ({ p1, p2 }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#030712' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="auroraGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.7" />
          <Stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
        </LinearGradient>
        <RadialGradient id="auroraGlow" cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#030712" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="800" fill="url(#auroraGlow)" />
      <Path
        d="M-50,200 C80,100 220,350 450,180 L450,800 L-50,800 Z"
        fill="url(#auroraGrad1)"
        opacity={0.35}
      />
      <Path
        d="M-50,300 C120,400 280,150 450,280 L450,800 L-50,800 Z"
        fill="url(#auroraGrad1)"
        opacity={0.25}
      />
    </Svg>
  </View>
);

// 2. LIQUID GLASS
const LiquidGlassEnvironment: React.FC<{ p1: any; p2: any; isDark: boolean }> = ({ p1, p2, isDark }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#090D16' : '#E2E8F0' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800">
      <Defs>
        <RadialGradient id="glassOrb1" cx="40%" cy="30%" r="50%">
          <Stop offset="0%" stopColor="#38BDF8" stopOpacity={isDark ? '0.45' : '0.35'} />
          <Stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glassOrb2" cx="60%" cy="70%" r="60%">
          <Stop offset="0%" stopColor="#C084FC" stopOpacity={isDark ? '0.4' : '0.3'} />
          <Stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="120" cy="260" r="160" fill="url(#glassOrb1)" />
      <Circle cx="280" cy="540" r="180" fill="url(#glassOrb2)" />
    </Svg>
  </View>
);

// 3. DEEP SPACE
const DeepSpaceEnvironment: React.FC<{ p1: any; p2: any }> = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#02040A' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800">
      <Defs>
        <RadialGradient id="nebulaCore" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#6366F1" stopOpacity="0.28" />
          <Stop offset="50%" stopColor="#A855F7" stopOpacity="0.15" />
          <Stop offset="100%" stopColor="#02040A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="800" fill="url(#nebulaCore)" />
      {[...Array(36)].map((_, i) => {
        const cx = (i * 37) % 390 + 5;
        const cy = (i * 53) % 780 + 10;
        const r = (i % 3 === 0 ? 1.8 : 1.0);
        return <Circle key={i} cx={cx} cy={cy} r={r} fill="#FFFFFF" opacity={(i % 5 + 3) / 10} />;
      })}
    </Svg>
  </View>
);

// 4. OCEAN
const OceanEnvironment: React.FC<{ p1: any; p2: any }> = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#031726' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.35" />
          <Stop offset="50%" stopColor="#0369A1" stopOpacity="0.2" />
          <Stop offset="100%" stopColor="#031726" stopOpacity="0.9" />
        </LinearGradient>
      </Defs>
      <Path d="M0,450 Q100,400 200,450 T400,450 L400,800 L0,800 Z" fill="url(#oceanGrad)" />
      <Path d="M0,520 Q120,480 240,520 T400,520 L400,800 L0,800 Z" fill="url(#oceanGrad)" opacity={0.6} />
    </Svg>
  </View>
);

// 5. SUNSET
const SunsetEnvironment: React.FC<{ p1: any; p2: any }> = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A0B2E' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800">
      <Defs>
        <LinearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#3B0764" />
          <Stop offset="40%" stopColor="#BE185D" stopOpacity="0.75" />
          <Stop offset="75%" stopColor="#F97316" stopOpacity="0.6" />
          <Stop offset="100%" stopColor="#FBBF24" stopOpacity="0.4" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="800" fill="url(#sunsetGrad)" />
    </Svg>
  </View>
);

// 6. MIST
const MistEnvironment: React.FC<{ p1: any; p2: any; isDark: boolean }> = ({ isDark }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#0B0F19' : '#CBD5E1' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800">
      <Defs>
        <RadialGradient id="mistFog1" cx="30%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#94A3B8" stopOpacity={isDark ? '0.35' : '0.5'} />
          <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="mistFog2" cx="70%" cy="60%" r="60%">
          <Stop offset="0%" stopColor="#CBD5E1" stopOpacity={isDark ? '0.25' : '0.4'} />
          <Stop offset="100%" stopColor="#0B0F19" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="120" cy="400" r="220" fill="url(#mistFog1)" />
      <Circle cx="280" cy="500" r="240" fill="url(#mistFog2)" />
    </Svg>
  </View>
);

// 7. DIGITAL CITY
const DigitalCityEnvironment: React.FC<{ p1: any; p2: any }> = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05070E' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="cityGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#05070E" stopOpacity="0.9" />
        </LinearGradient>
      </Defs>
      {/* Skyline Silhouette */}
      <Path
        d="M0,600 L30,600 L30,520 L60,520 L60,600 L90,600 L90,470 L140,470 L140,600 L180,600 L180,410 L220,410 L220,600 L260,600 L260,500 L300,500 L300,600 L350,600 L350,440 L400,440 L400,800 L0,800 Z"
        fill="url(#cityGlow)"
      />
    </Svg>
  </View>
);

// 8. MINIMAL APPLE
const MinimalAppleEnvironment: React.FC<{ p1: any; isDark: boolean }> = ({ isDark }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800">
      <Circle cx="200" cy="400" r="140" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} strokeWidth={2} fill="transparent" />
      <Circle cx="200" cy="400" r="220" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'} strokeWidth={1.5} fill="transparent" />
    </Svg>
  </View>
);

// 9. ORBIT
const OrbitEnvironment: React.FC<{ angle: any }> = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#080914' }]}>
    <Svg width="100%" height="100%" viewBox="0 0 400 800">
      <Defs>
        <RadialGradient id="sunCore" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.7" />
          <Stop offset="100%" stopColor="#080914" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="200" cy="400" r="80" fill="url(#sunCore)" />
      <Circle cx="200" cy="400" r="120" stroke="rgba(255,255,255,0.12)" strokeWidth={1} fill="transparent" />
      <Circle cx="200" cy="400" r="180" stroke="rgba(255,255,255,0.08)" strokeWidth={1} fill="transparent" />
      {/* Orbiting Satellite */}
      <Circle cx="285" cy="315" r="5" fill="#38BDF8" />
      <Circle cx="100" cy="480" r="4" fill="#A855F7" />
    </Svg>
  </View>
);

// 10. STUDIO CLOCK
const StudioClockEnvironment: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]} />
);

const styles = StyleSheet.create({
  fullscreenTouch: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  envBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  envBadgeText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  analogClockPlate: {
    padding: Spacing.md,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  digitalTextWrap: {
    alignItems: 'center',
  },
  digitalTimeText: {
    ...TypographyScale.largeTitle,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  dateSubText: {
    ...TypographyScale.body,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  focusPillMode: {
    ...TypographyScale.caption2,
    fontWeight: '800',
  },
  focusPillValue: {
    ...TypographyScale.headline,
    fontWeight: '800',
  },
  focusPillToggle: {
    padding: 2,
  },
  worldClocksFooter: {
    width: '100%',
  },
  worldSectionTitle: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  citiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
  },
  cityBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 92,
  },
  cityName: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  cityOffset: {
    ...TypographyScale.caption2,
    fontSize: 10,
    marginTop: 1,
  },
  cityTime: {
    ...TypographyScale.footnote,
    fontWeight: '800',
    marginTop: 2,
  },
  sideArrowLeft: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  },
  sideArrowRight: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
  },
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsCard: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  settingsTitle: {
    ...TypographyScale.title3,
    fontWeight: '700',
  },
  settingLabel: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  envGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  envSelectBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radii.pill,
  },
  envSelectBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 3,
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  segmentBtnText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.lg,
  },
  toggleLabel: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  cityToggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  cityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  cityChipText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  doneSettingsBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.lg,
  },
  doneSettingsBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
