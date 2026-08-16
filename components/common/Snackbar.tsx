import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutDown,
  Layout,
} from 'react-native-reanimated';
import { Undo2, CheckCircle2, Trash2, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { UndoAction } from '../../store/TaskContext';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { haptics } from '../../services/haptics';

interface SnackbarProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ action, onUndo, onDismiss }) => {
  const { colors, isDark } = useTheme();

  if (!action) return null;

  const handleUndo = () => {
    haptics.medium();
    onUndo();
  };

  const getActionIcon = () => {
    switch (action.type) {
      case 'complete':
      case 'bulk_complete':
        return <CheckCircle2 size={17} color={colors.success} style={{ marginRight: 8 }} />;
      case 'delete':
      case 'bulk_delete':
        return <Trash2 size={17} color={colors.error} style={{ marginRight: 8 }} />;
      default:
        return <Sparkles size={17} color={colors.accent} style={{ marginRight: 8 }} />;
    }
  };

  return (
    <Animated.View
      layout={Layout.springify().damping(22)}
      entering={FadeInUp.springify().damping(20).stiffness(280)}
      exiting={FadeOutDown.duration(180)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        },
        Shadows.floating,
      ]}
    >
      <View style={styles.leftRow}>
        {getActionIcon()}
        <Text style={[styles.messageText, { color: colors.textPrimary }]} numberOfLines={1}>
          {action.message}
        </Text>
      </View>

      <Pressable
        onPress={handleUndo}
        style={({ pressed }) => [
          styles.undoButton,
          { backgroundColor: colors.accent + '20' },
          pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
        ]}
      >
        <Undo2 size={15} color={colors.accent} style={{ marginRight: 4 }} />
        <Text style={[styles.undoText, { color: colors.accent }]}>Undo</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96, // Floats cleanly above the bottom tab bar
    left: Spacing.lg,
    right: Spacing.lg,
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md + 2,
    borderRadius: Radii.xl,
    borderWidth: 1,
    zIndex: 9999,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  messageText: {
    ...TypographyScale.callout,
    fontWeight: '600',
    flex: 1,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radii.pill,
  },
  undoText: {
    ...TypographyScale.footnote,
    fontWeight: '700',
  },
});
