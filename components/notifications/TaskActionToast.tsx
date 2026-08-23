import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Undo2, Check, X } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { UndoAction, TaskActionType } from '../../store/TaskContext';
import { TaskActionIcon } from './TaskActionIcon';
import { ToastProgress } from './ToastProgress';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { haptics } from '../../services/haptics';

export interface TaskActionToastProps {
  action: UndoAction;
  onUndo: (action: UndoAction) => Promise<void> | void;
  onDismiss: (id: string) => void;
  reduceMotion?: boolean;
  duration?: number;
}

export const TaskActionToast: React.FC<TaskActionToastProps> = ({
  action,
  onUndo,
  onDismiss,
  reduceMotion = false,
  duration = 4200,
}) => {
  const { colors, isDark } = useTheme();

  // State
  const [isHovered, setIsHovered] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoStatusText, setUndoStatusText] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Animation values for spring entry/exit
  const translateX = useSharedValue(reduceMotion ? 0 : -24);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.96);

  // Undo button slide-in
  const undoTranslateX = useSharedValue(reduceMotion ? 0 : 8);
  const undoOpacity = useSharedValue(reduceMotion ? 1 : 0);

  // Entrance animation
  useEffect(() => {
    if (reduceMotion) {
      translateX.value = 0;
      opacity.value = 1;
      scale.value = 1;
      undoTranslateX.value = 0;
      undoOpacity.value = 1;
      return;
    }

    // Spring entrance
    translateX.value = withSpring(0, { damping: 14, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });

    // Staggered Undo button entrance
    const undoTimer = setTimeout(() => {
      undoTranslateX.value = withSpring(0, { damping: 12, stiffness: 200 });
      undoOpacity.value = withTiming(1, { duration: 200 });
    }, 120);

    return () => {
      clearTimeout(undoTimer);
    };
  }, [reduceMotion]);

  // Exit trigger
  const triggerExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);

    if (reduceMotion) {
      opacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => onDismiss(action.id), 160);
      return;
    }

    translateX.value = withTiming(-24, { duration: 220, easing: Easing.in(Easing.ease) });
    opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
    scale.value = withTiming(0.97, { duration: 220 });

    setTimeout(() => {
      onDismiss(action.id);
    }, 230);
  }, [action.id, isExiting, onDismiss, reduceMotion]);

  // Handle real undo with two-phase feedback transition
  const handleUndoPress = async () => {
    if (isUndoing || isExiting) return;
    haptics.medium();
    setIsUndoing(true);
    setUndoStatusText('Restoring...');

    try {
      await onUndo(action);
      setUndoStatusText('Task restored');

      // Auto dismiss after brief confirmation
      setTimeout(() => {
        triggerExit();
      }, 1000);
    } catch (e) {
      setUndoStatusText('Failed to restore');
      setTimeout(() => {
        triggerExit();
      }, 1200);
    }
  };

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const undoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: undoTranslateX.value }],
    opacity: undoOpacity.value,
  }));

  // Clean formatted display message
  const displayMessage = undoStatusText || action.message;
  const actionType: TaskActionType = action.actionType || action.type || 'TASK_UPDATED';

  // Desktop hover props
  const hoverProps =
    Platform.OS === 'web'
      ? {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        containerAnimatedStyle,
      ]}
      {...hoverProps}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.glassCard,
          {
            backgroundColor: isDark
              ? isHovered
                ? 'rgba(22, 27, 38, 0.95)'
                : 'rgba(18, 22, 31, 0.90)'
              : isHovered
              ? 'rgba(255, 255, 255, 0.98)'
              : 'rgba(250, 250, 254, 0.94)',
            borderColor: isDark
              ? isHovered
                ? 'rgba(255, 255, 255, 0.20)'
                : 'rgba(255, 255, 255, 0.12)'
              : isHovered
              ? 'rgba(0, 0, 0, 0.12)'
              : 'rgba(0, 0, 0, 0.07)',
          },
          Shadows.floating,
        ]}
      >
        {/* Left Row: Action Icon + Text Message */}
        <View style={styles.contentRow}>
          <View style={styles.iconWrap}>
            <TaskActionIcon
              action={isUndoing ? 'RESTORE' : actionType}
              reduceMotion={reduceMotion}
            />
          </View>

          <Text
            style={[
              styles.messageText,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayMessage}
          </Text>
        </View>

        {/* Right Row: Undo Button or Confirmation */}
        <Animated.View style={[styles.rightActions, undoAnimatedStyle]}>
          {action.undoAvailable !== false && !undoStatusText && (
            <Pressable
              onPress={handleUndoPress}
              accessibilityRole="button"
              accessibilityLabel="Undo task action"
              style={({ pressed, hovered }: any) => [
                styles.undoButton,
                {
                  backgroundColor: hovered
                    ? colors.accent + '28'
                    : colors.accent + '18',
                },
                pressed && styles.undoButtonPressed,
              ]}
            >
              <Undo2 size={13} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.undoText, { color: colors.accent }]}>Undo</Text>
            </Pressable>
          )}

          {undoStatusText === 'Task restored' && (
            <View style={[styles.restoredPill, { backgroundColor: colors.success + '20' }]}>
              <Check size={13} color={colors.success} style={{ marginRight: 3 }} />
              <Text style={[styles.restoredText, { color: colors.success }]}>Restored</Text>
            </View>
          )}
        </Animated.View>

        {/* Depleting Lifetime Progress Bar */}
        {!isUndoing && !isExiting && (
          <ToastProgress
            duration={duration}
            isPaused={isHovered || isUndoing}
            onComplete={triggerExit}
            reduceMotion={reduceMotion}
          />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    marginVertical: 4,
    maxWidth: 460,
    width: '100%',
  },
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radii.lg,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    minWidth: 0, // Enables flex-shrink for truncation
  },
  iconWrap: {
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    ...TypographyScale.subhead,
    fontWeight: '600',
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    cursor: 'pointer',
  } as any,
  undoButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  undoText: {
    ...TypographyScale.caption1,
    fontWeight: '700',
  },
  restoredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  restoredText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
  },
});
