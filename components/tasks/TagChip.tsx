import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';

interface TagChipProps {
  name: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
}

export const TagChip: React.FC<TagChipProps> = ({ name, color, selected, onPress }) => {
  const { colors } = useTheme();
  const chipColor = color || colors.accent;

  const content = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? chipColor : colors.secondaryBackground,
          borderColor: selected ? chipColor : colors.subtleBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? '#FFFFFF' : colors.textSecondary },
        ]}
      >
        #{name}
      </Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  text: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
});
