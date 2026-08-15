import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { CheckCircle2, Inbox, Calendar, Search, Sparkles, Star, Pin, Folder } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { Spacing, TypographyScale } from '../../theme/tokens';

interface EmptyStateProps {
  icon?: 'check' | 'inbox' | 'calendar' | 'search' | 'sparkles' | 'star' | 'pin' | 'folder';
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'sparkles', title, subtitle, style }) => {
  const { colors } = useTheme();

  const renderIcon = () => {
    const size = 44;
    const color = colors.textTertiary;

    switch (icon) {
      case 'check':
        return <CheckCircle2 size={size} color={colors.success} />;
      case 'inbox':
        return <Inbox size={size} color={color} />;
      case 'calendar':
        return <Calendar size={size} color={color} />;
      case 'search':
        return <Search size={size} color={color} />;
      case 'star':
        return <Star size={size} color="#FFCC00" fill="#FFCC00" />;
      case 'pin':
        return <Pin size={size} color={colors.accent} fill={colors.accent} />;
      case 'folder':
        return <Folder size={size} color={colors.accent} />;
      case 'sparkles':
      default:
        return <Sparkles size={size} color={colors.accent} />;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.secondaryBackground }]}>
        {renderIcon()}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginVertical: Spacing.xxl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...TypographyScale.title3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...TypographyScale.callout,
    textAlign: 'center',
  },
});
