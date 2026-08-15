import React, { useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Sun, Inbox, Folder, Calendar, Target } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Shadows, Spacing } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';
import { MaterialLayers, TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_OFFSET } from '../../theme/materials';
import { TabBarItem } from './TabBarItem';

const TAB_ICONS: Record<string, any> = {
  index: Sun,
  inbox: Inbox,
  projects: Folder,
  calendar: Calendar,
  focus: Target,
};

const TAB_LABELS: Record<string, string> = {
  index: 'Today',
  inbox: 'Inbox',
  projects: 'Projects',
  calendar: 'Calendar',
  focus: 'Focus',
};

const PRIMARY_TAB_NAMES = ['index', 'inbox', 'projects', 'calendar', 'focus'];

interface FloatingTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  navigation,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);

  const visibleRoutes = state.routes.filter((route: any) =>
    PRIMARY_TAB_NAMES.includes(route.name)
  );

  const activeRouteName = state.routes[state.index]?.name;
  const currentActiveIndex = visibleRoutes.findIndex(
    (route: any) => route.name === activeRouteName
  );
  const safeActiveIndex = currentActiveIndex >= 0 ? currentActiveIndex : 0;

  const bottomInset = Math.max(insets.bottom, 12);
  const horizontalPadding = Spacing.xs;
  const tabWidth =
    containerWidth > 0 ? (containerWidth - horizontalPadding * 2) / visibleRoutes.length : 0;

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      translateX.value = withSpring(safeActiveIndex * tabWidth, SpringConfigs.tabSlide);
    }
  }, [safeActiveIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: tabWidth,
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const isWideScreen = windowWidth > 600;
  const wrapperMarginHorizontal = isWideScreen ? Spacing.xl : Spacing.md;

  return (
    <View
      style={[
        styles.wrapper,
        {
          left: wrapperMarginHorizontal,
          right: wrapperMarginHorizontal,
          bottom: TAB_BAR_BOTTOM_OFFSET + (Platform.OS === 'ios' ? bottomInset / 2 : 0),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.floatingContainer} onLayout={handleLayout}>
        <BlurView
          intensity={MaterialLayers.glass.blurMedium}
          tint={isDark ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: Radii.xl,
              backgroundColor: isDark ? MaterialLayers.glass.dark : MaterialLayers.glass.light,
            },
          ]}
        />

        {/* Sliding Active Pill Indicator */}
        {containerWidth > 0 && tabWidth > 0 && (
          <Animated.View
            style={[
              styles.activeIndicatorPill,
              { backgroundColor: isDark ? colors.accent + '25' : colors.accent + '15' },
              indicatorStyle,
            ]}
          />
        )}

        {/* 5 Equal-Width Flexbox Tab Items */}
        {visibleRoutes.map((route: any, index: number) => {
          const isFocused = safeActiveIndex === index;
          const Icon = TAB_ICONS[route.name] || Sun;
          const label = TAB_LABELS[route.name] || route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarItem
              key={route.key}
              routeKey={route.key}
              name={route.name}
              label={label}
              IconComponent={Icon}
              isFocused={isFocused}
              onPress={onPress}
              colors={colors}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  floatingContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 560,
    height: TAB_BAR_HEIGHT,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Shadows.card,
  },
  activeIndicatorPill: {
    position: 'absolute',
    height: TAB_BAR_HEIGHT - Spacing.xs * 2,
    top: Spacing.xs,
    left: Spacing.xs,
    borderRadius: Radii.lg,
  },
});
