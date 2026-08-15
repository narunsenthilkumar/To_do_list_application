import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../store/ThemeContext';
import { AmbientBackground } from './AmbientBackground';

interface PrimarySurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
  useAmbientBg?: boolean;
}

export const PrimarySurface: React.FC<PrimarySurfaceProps> = ({
  children,
  style,
  safeArea = true,
  useAmbientBg = true,
}) => {
  const { colors } = useTheme();

  const content = useAmbientBg ? (
    <AmbientBackground>{children}</AmbientBackground>
  ) : (
    children
  );

  if (safeArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.primaryBackground }, style]}>
        {content}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.primaryBackground }, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
