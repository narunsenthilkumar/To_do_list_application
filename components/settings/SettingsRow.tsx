import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { useTheme } from '../../store/ThemeContext';
import { Spacing, TypographyScale } from '../../theme/tokens';

interface SettingsRowProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  isDestructive?: boolean;
  style?: ViewStyle;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  trailing,
  showChevron = false,
  onPress,
  isDestructive = false,
  style,
}) => {
  const { colors } = useTheme();

  const content = (
    <View style={[styles.rowContainer, style]}>
      {/* Icon Section */}
      {icon && <View style={styles.iconWrapper}>{icon}</View>}

      {/* Main Title & Subtitle Section */}
      <View style={styles.contentSection}>
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[
            styles.titleText,
            { color: isDestructive ? colors.error : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.subtitleText, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Trailing Control Section */}
      {(trailing || showChevron) && (
        <View style={styles.trailingWrapper}>
          {trailing}
          {showChevron && (
            <ChevronRight size={18} color={colors.textTertiary} style={{ marginLeft: 4 }} />
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        profile={isDestructive ? 'destructiveAction' : 'card'}
        onPress={onPress}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    width: '100%',
  },
  iconWrapper: {
    marginRight: Spacing.md,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
    flexShrink: 1,
    marginRight: Spacing.sm,
  },
  titleText: {
    ...TypographyScale.body,
  },
  subtitleText: {
    ...TypographyScale.caption1,
    marginTop: 2,
  },
  trailingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
});
