import React, { useEffect } from 'react';
import { StyleSheet, View, Image, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { BrandAssets } from '../../constants/branding';
import { Radii, Shadows } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

interface BrandLogoProps {
  size?: number;
  variant?: 'icon' | 'logo' | 'splash';
  animated?: boolean;
  withShadow?: boolean;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 40,
  variant = 'icon',
  animated = false,
  withShadow = false,
  style,
  borderRadius,
}) => {
  const opacity = useSharedValue(animated ? 0 : 1);
  const scale = useSharedValue(animated ? 0.94 : 1);

  useEffect(() => {
    if (animated) {
      opacity.value = withTiming(1, {
        duration: 350,
        easing: Easing.out(Easing.quad),
      });
      scale.value = withSpring(1, SpringConfigs.snappy);
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const getImageSource = () => {
    switch (variant) {
      case 'splash':
        return BrandAssets.splash;
      case 'logo':
      case 'icon':
      default:
        return BrandAssets.icon;
    }
  };

  const calculatedRadius = borderRadius !== undefined ? borderRadius : Math.round(size * 0.22);

  const imageElement = (
    <Image
      source={getImageSource()}
      style={{
        width: size,
        height: size,
        borderRadius: calculatedRadius,
      }}
      resizeMode="contain"
    />
  );

  if (animated) {
    return (
      <Animated.View
        style={[
          styles.container,
          withShadow && Shadows.card,
          animatedStyle,
          style,
        ]}
      >
        {imageElement}
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, withShadow && Shadows.card, style]}>
      {imageElement}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
