import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Monitor, Sun, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeMode, useTheme } from '../../store/ThemeContext';
import { Radii, Shadows, TypographyScale } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

interface ThemeSegmentedControlProps {
  mode: ThemeMode;
  onSelectMode: (mode: ThemeMode) => void;
}

interface SegmentItem {
  key: ThemeMode;
  label: string;
  IconComponent: React.ComponentType<{ size: number; color: string }>;
}

const SEGMENTS: SegmentItem[] = [
  { key: 'system', label: 'System', IconComponent: Monitor },
  { key: 'light', label: 'Light', IconComponent: Sun },
  { key: 'dark', label: 'Dark', IconComponent: Moon },
];

export const ThemeSegmentedControl: React.FC<ThemeSegmentedControlProps> = ({
  mode,
  onSelectMode,
}) => {
  const { colors, isDark } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  const selectedIndex = SEGMENTS.findIndex((s) => s.key === mode);
  const safeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const segmentWidth = containerWidth > 8 ? (containerWidth - 8) / 3 : 0;
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    if (segmentWidth > 0) {
      translateX.value = withSpring(safeIndex * segmentWidth, SpringConfigs.tabSlide);
    }
  }, [safeIndex, segmentWidth]);

  const animatedCapsuleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: segmentWidth > 0 ? segmentWidth : '33.33%',
    };
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={handleLayout}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        {/* Floating Active Selection Capsule */}
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

        {/* Segments Row */}
        {SEGMENTS.map((segment) => {
          const isSelected = mode === segment.key;
          const { IconComponent } = segment;

          return (
            <SegmentPressable
              key={segment.key}
              segment={segment}
              isSelected={isSelected}
              colors={colors}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectMode(segment.key);
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

interface SegmentPressableProps {
  segment: SegmentItem;
  isSelected: boolean;
  colors: any;
  onPress: () => void;
}

const SegmentPressable: React.FC<SegmentPressableProps> = ({
  segment,
  isSelected,
  colors,
  onPress,
}) => {
  const { IconComponent } = segment;
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  React.useEffect(() => {
    if (isSelected) {
      iconScale.value = withTiming(1.08, { duration: 150 }, () => {
        iconScale.value = withTiming(1.0, { duration: 150 });
      });
    }
  }, [isSelected]);

  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1.0, { duration: 150 });
      }}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${segment.label} theme`}
      style={styles.segmentPressable}
    >
      <Animated.View style={[styles.segmentContent, animatedPressStyle]}>
        <Animated.View style={animatedIconStyle}>
          <IconComponent
            size={19}
            color={isSelected ? '#FFFFFF' : colors.textSecondary}
          />
        </Animated.View>
        <Text
          numberOfLines={1}
          style={[
            styles.segmentText,
            {
              color: isSelected ? '#FFFFFF' : colors.textPrimary,
              fontWeight: isSelected ? '700' : '500',
            },
          ]}
        >
          {segment.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    height: 48,
    borderRadius: Radii.lg,
    padding: 4,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  activeCapsule: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 38,
    borderRadius: Radii.md - 2,
    zIndex: 1,
  },
  segmentPressable: {
    flex: 1,
    height: '100%',
    zIndex: 2,
  },
  segmentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  segmentText: {
    ...TypographyScale.callout,
  },
});
