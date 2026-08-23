import React from 'react';
import { UndoAction } from '../../store/TaskContext';
import { TaskActionToastStack } from '../notifications/TaskActionToastStack';

interface SnackbarProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ action, onUndo, onDismiss }) => {
  return (
    <TaskActionToastStack
      action={action}
      onUndo={onUndo}
      onDismiss={onDismiss}
      maxVisible={3}
    />
  );
};
