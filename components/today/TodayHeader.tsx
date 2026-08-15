import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { TodayHeaderActions } from './TodayHeaderActions';
import { useTheme } from '../../store/ThemeContext';
import { useResponsive } from '../../theme/responsive';
import { Spacing, TypographyScale } from '../../theme/tokens';

interface TodayHeaderProps {
  greeting: string;
  dateString: string;
  animatedTitleStyle?: AnimatedStyle<any>;
  onOpenThemePopover: () => void;
}

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  greeting,
  dateString,
  animatedTitleStyle,
  onOpenThemePopover,
}) => {
  const { colors } = useTheme();
  const { isMobile, width } = useResponsive();

  const isVeryNarrow = width < 360;

  return (
    <View style={styles.headerContainer}>
      <Animated.View style={[styles.titleContainer, animatedTitleStyle]}>
        <Text style={[styles.greetingText, { color: colors.textSecondary }]}>{greeting}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[
            styles.dateText,
            {
              color: colors.textPrimary,
              fontSize: isVeryNarrow ? 24 : isMobile ? 28 : 34,
            },
          ]}
        >
          {dateString}
        </Text>
      </Animated.View>

      <TodayHeaderActions onOpenThemePopover={onOpenThemePopover} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    width: '100%',
  },
  titleContainer: {
    flexShrink: 1,
    marginRight: Spacing.sm,
  },
  greetingText: {
    ...TypographyScale.footnote,
    fontWeight: '600',
  },
  dateText: {
    ...TypographyScale.largeTitle,
    fontWeight: '800',
    marginTop: 2,
  },
});
