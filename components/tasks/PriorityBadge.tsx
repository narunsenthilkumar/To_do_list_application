import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, Flag, ArrowUp, Circle } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { PriorityLevel } from '../../models/task';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';

interface PriorityBadgeProps {
  priority: PriorityLevel;
  showText?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showText = true }) => {
  const { colors } = useTheme();

  if (priority === 'none') return null;

  const getConfig = () => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Urgent',
          color: colors.priorityUrgent,
          Icon: AlertCircle,
        };
      case 'high':
        return {
          label: 'High',
          color: colors.priorityHigh,
          Icon: Flag,
        };
      case 'medium':
        return {
          label: 'Medium',
          color: colors.priorityMedium,
          Icon: ArrowUp,
        };
      case 'low':
        return {
          label: 'Low',
          color: colors.priorityLow,
          Icon: Circle,
        };
      default:
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  const { label, color, Icon } = config;

  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Icon size={12} color={color} style={{ marginRight: showText ? 3 : 0 }} />
      {showText && <Text style={[styles.text, { color }]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  text: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
});
