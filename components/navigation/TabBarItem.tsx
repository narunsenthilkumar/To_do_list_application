import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ThemeColors } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';
import { haptics } from '../../services/haptics';

interface TabBarItemProps {
  routeKey: string;
  name: string;
  label: string;
  IconComponent: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  isFocused: boolean;
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
}

export const TabBarItem: React.FC<TabBarItemProps> = React.memo(({
  label,
  IconComponent,
  isFocused,
  onPress,
  colors,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const scale = useSharedValue(1);

  const isSmallDevice = windowWidth < 360;
  const iconSize = isSmallDevice ? 20 : 22;
  const fontSize = isSmallDevice ? 10 : 11;

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.06 : 1.0, SpringConfigs.snappy);
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withSpring(0.94, SpringConfigs.snappy);
    haptics.light();
  };

  const handlePressOut = () => {
    scale.value = withSpring(isFocused ? 1.06 : 1.0, SpringConfigs.snappy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={`${label} tab`}
      style={styles.tabItemContainer}
    >
      <Animated.View style={[styles.itemContent, animatedStyle]}>
        <IconComponent
          size={iconSize}
          color={isFocused ? colors.accent : colors.textTertiary}
          strokeWidth={isFocused ? 2.5 : 1.8}
        />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.label,
            {
              fontSize,
              color: isFocused ? colors.accent : colors.textTertiary,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabItemContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
