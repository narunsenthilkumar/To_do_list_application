import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, AccessibilityInfo, useWindowDimensions } from 'react-native';
import { UndoAction } from '../../store/TaskContext';
import { TaskActionToast } from './TaskActionToast';
import { Spacing } from '../../theme/tokens';

export interface TaskActionToastStackProps {
  action: UndoAction | null;
  onUndo: () => Promise<void> | void;
  onDismiss: () => void;
  maxVisible?: number;
}

export const TaskActionToastStack: React.FC<TaskActionToastStackProps> = ({
  action,
  onUndo,
  onDismiss,
  maxVisible = 2,
}) => {
  const { width } = useWindowDimensions();
  const [toasts, setToasts] = useState<UndoAction[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lastActionTimeRef = useRef<number>(0);

  // Check accessibility reduced motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });
  }, []);

  // Listen for incoming actions
  useEffect(() => {
    if (!action) return;

    const now = Date.now();
    const timeSinceLast = now - lastActionTimeRef.current;
    lastActionTimeRef.current = now;

    setToasts((prev) => {
      // 1. Rapid Action Grouping: If same action occurred within 600ms
      if (prev.length > 0 && timeSinceLast < 600) {
        const topToast = prev[0];
        if (
          topToast.actionType === action.actionType &&
          topToast.actionType !== undefined &&
          topToast.actionType !== 'TASK_UPDATED'
        ) {
          const currentCount = topToast.count || 1;
          const newCount = currentCount + (action.count || 1);
          let groupedMessage = `${newCount} tasks updated`;

          switch (topToast.actionType) {
            case 'PIN':
              groupedMessage = `${newCount} tasks pinned`;
              break;
            case 'UNPIN':
              groupedMessage = `${newCount} tasks unpinned`;
              break;
            case 'COMPLETE':
            case 'complete':
              groupedMessage = `${newCount} tasks completed`;
              break;
            case 'UNCOMPLETE':
              groupedMessage = `${newCount} tasks reopened`;
              break;
            case 'DELETE':
            case 'delete':
              groupedMessage = `${newCount} tasks deleted`;
              break;
            case 'FAVOURITE':
              groupedMessage = `${newCount} tasks added to Favorites`;
              break;
            case 'UNFAVOURITE':
              groupedMessage = `${newCount} tasks removed from Favorites`;
              break;
            case 'MOVE':
              groupedMessage = `${newCount} tasks moved`;
              break;
          }

          const groupedToast: UndoAction = {
            ...topToast,
            id: action.id,
            message: groupedMessage,
            count: newCount,
            previousTasks: topToast.previousTasks, // Preserves the original baseline snapshot before the batch
          };

          return [groupedToast, ...prev.slice(1)];
        }
      }

      // 2. Distinct action: Prepend and cap at maxVisible
      const filtered = prev.filter((t) => t.id !== action.id);
      return [action, ...filtered].slice(0, maxVisible);
    });
  }, [action, maxVisible]);

  const handleDismissToast = useCallback(
    (id: string) => {
      setToasts((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          onDismiss();
        }
        return next;
      });
    },
    [onDismiss]
  );

  const handleExecuteUndo = useCallback(
    async (targetAction: UndoAction) => {
      await onUndo();
    },
    [onUndo]
  );

  if (toasts.length === 0) return null;

  const isDesktop =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    (width >= 900 || Boolean((window as any).electronAPI?.isElectron));

  return (
    <View
      style={[
        styles.stackContainer,
        isDesktop ? styles.desktopBottomLeft : styles.mobileBottomCenter,
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <TaskActionToast
          key={toast.id}
          action={toast}
          onUndo={handleExecuteUndo}
          onDismiss={handleDismissToast}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stackContainer: {
    position: 'absolute',
    zIndex: 9999,
    pointerEvents: 'box-none',
  } as any,
  desktopBottomLeft: {
    bottom: 24, // Floats cleanly above the bottom-left sidebar area on Desktop
    left: 24,
    width: 380,
    maxWidth: 420,
    alignItems: 'flex-start',
  },
  mobileBottomCenter: {
    bottom: 96, // Floats above tab bar on Mobile
    left: Spacing.md,
    right: Spacing.md,
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
  },
});
