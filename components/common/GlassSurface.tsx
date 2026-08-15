import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../store/ThemeContext';
import { Radii } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  borderRadius?: number;
  borderWidth?: number;
  opacity?: number;
  elevation?: number;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  intensity = 65,
  borderRadius = Radii.lg,
  borderWidth = 1,
  opacity = 1,
  elevation = 0,
}) => {
  const { colors, isDark } = useTheme();

  const containerStyle: ViewStyle = {
    borderRadius,
    backgroundColor: isDark ? MaterialLayers.glass.dark : MaterialLayers.glass.light,
    borderColor: isDark ? MaterialLayers.glass.borderDark : MaterialLayers.glass.borderLight,
    borderWidth,
    opacity,
    elevation,
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

