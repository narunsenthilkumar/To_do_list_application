import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Shadows, Spacing } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';
import { AnimatedPressable } from './AnimatedPressable';

interface ElevatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  noPadding?: boolean;
}

export const ElevatedCard: React.FC<ElevatedCardProps> = ({ children, style, onPress, noPadding = false }) => {
  const { colors, isDark } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.elevatedCard,
    borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: noPadding ? 0 : Spacing.lg,
    ...Shadows.subtle,
  };

  const combinedStyle = style
    ? Array.isArray(style)
      ? [cardStyle, ...style]
      : [cardStyle, style]
    : cardStyle;


  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} profile="card" style={combinedStyle}>
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={combinedStyle}>{children}</View>;
};

