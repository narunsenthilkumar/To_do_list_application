import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Clock } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { TimeFormat, formatClockTime } from '../../utils/timeFormatter';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

interface TimeFormatSelectorProps {
  timeFormat: TimeFormat;
  onSelectFormat: (format: TimeFormat) => void;
}

const FORMAT_OPTIONS: { key: TimeFormat; label: string; example: string }[] = [
  { key: '12h', label: '12-hour', example: '5:42 PM' },
  { key: '24h', label: '24-hour', example: '17:42' },
];

export const TimeFormatSelector: React.FC<TimeFormatSelectorProps> = ({
  timeFormat,
  onSelectFormat,
}) => {
  const { colors, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  // Live preview clock demo
  const [previewDate, setPreviewDate] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedIndex = FORMAT_OPTIONS.findIndex((f) => f.key === timeFormat);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const segmentWidth = containerWidth > 8 ? (containerWidth - 8) / 2 : 0;
  const translateX = useSharedValue(0);
  const previewOpacity = useSharedValue(1);
  const previewTranslateY = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(safeIndex * segmentWidth, SpringConfigs.tabSlide);
    }
  }, [safeIndex, segmentWidth]);

  const animatedCapsuleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: segmentWidth > 0 ? segmentWidth : '50%',
    };
  });

  const animatedPreviewStyle = useAnimatedStyle(() => {
    return {
      opacity: previewOpacity.value,
      transform: [{ translateY: previewTranslateY.value }],
    };
  });

  const handleSelect = (format: TimeFormat) => {
    if (format === timeFormat) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Subtle transition animation on switch
    previewOpacity.value = withTiming(0.3, { duration: 100 }, () => {
      previewOpacity.value = withTiming(1, { duration: 180 });
    });
    previewTranslateY.value = withTiming(-4, { duration: 100 }, () => {
      previewTranslateY.value = withSpring(0, SpringConfigs.tabSlide);
    });

    onSelectFormat(format);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const previewFormatted = formatClockTime(previewDate, timeFormat).formatted;

  return (
    <View style={styles.wrapper}>
      {/* Segmented Control Container */}
      <View
        onLayout={handleLayout}
        style={[
          styles.segmentedContainer,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {/* Sliding Selection Pill */}
        {segmentWidth > 0 && (
          <Animated.View
            style={[
              styles.activeCapsule,
              { backgroundColor: colors.accent },
              Shadows.card,
              animatedCapsuleStyle,
            ]}
          />
        )}

        {/* Option Items */}
        {FORMAT_OPTIONS.map((opt) => {
          const isSelected = timeFormat === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${opt.label} time format`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelect(opt.key)}
              style={styles.segmentItem}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Live Animated Time Preview Box */}
      <View
        style={[
          styles.previewBox,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
          },
        ]}
      >
        <View style={styles.previewHeader}>
          <Clock size={13} color={colors.accent} style={{ marginRight: 5 }} />
          <Text style={[styles.previewTitle, { color: colors.textTertiary }]}>LIVE PREVIEW</Text>
        </View>
        <Animated.View style={[styles.previewTextWrapper, animatedPreviewStyle]}>
          <Text style={[styles.previewTimeText, { color: colors.textPrimary }]}>
            {previewFormatted}
          </Text>
          <Text style={[styles.previewFormatBadge, { color: colors.accent, backgroundColor: colors.accent + '15' }]}>
            {timeFormat === '12h' ? '12-Hour Format' : '24-Hour Military Format'}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  segmentedContainer: {
    position: 'relative',
    flexDirection: 'row',
    height: 44,
    borderRadius: Radii.pill,
    padding: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  activeCapsule: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: Radii.pill,
  },
  segmentItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  segmentLabel: {
    ...TypographyScale.subhead,
  },
  previewBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  previewTitle: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  previewTextWrapper: {
    alignItems: 'center',
  },
  previewTimeText: {
    ...TypographyScale.title1,
    fontWeight: '800',
    letterSpacing: 1,
    marginVertical: 2,
  },
  previewFormatBadge: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
});
