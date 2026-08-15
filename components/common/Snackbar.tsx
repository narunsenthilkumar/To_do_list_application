import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Undo2 } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { UndoAction } from '../../store/TaskContext';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';

interface SnackbarProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ action, onUndo, onDismiss }) => {
  const { colors } = useTheme();

  if (!action) return null;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutDown.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: colors.elevatedCard,
          borderColor: colors.subtleBorder,
        },
      ]}
    >
      <Text style={[styles.messageText, { color: colors.textPrimary }]} numberOfLines={1}>
        {action.message}
      </Text>
      <Pressable
        onPress={onUndo}
        style={({ pressed }) => [
          styles.undoButton,
          { backgroundColor: colors.accent + '15' },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Undo2 size={16} color={colors.accent} style={{ marginRight: 4 }} />
        <Text style={[styles.undoText, { color: colors.accent }]}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    ...Shadows.card,
    zIndex: 999,
  },
  messageText: {
    ...TypographyScale.callout,
    fontWeight: '500',
    flex: 1,
    marginRight: Spacing.md,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
  },
  undoText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
});
