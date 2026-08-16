import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Check, Edit3, Calendar, Trash2 } from 'lucide-react-native';
import { TaskRow } from './TaskRow';
import { Task } from '../../models/task';
import { Project } from '../../models/project';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { haptics } from '../../services/haptics';

interface SwipeableTaskRowProps {
  task: Task;
  project?: Project;
  onPress: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onReschedule?: () => void;
  onLongPress?: () => void;
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const SwipeableTaskRow: React.FC<SwipeableTaskRowProps> = ({
  task,
  project,
  onPress,
  onToggleComplete,
  onDelete,
  onReschedule,
  onLongPress,
  isMultiSelectMode,
  isSelected,
  onSelect,
}) => {
  const { colors } = useTheme();
  const swipeableRef = useRef<any>(null);

  const renderLeftActions = () => {
    return (
      <Pressable
        onPress={() => {
          onToggleComplete();
          swipeableRef.current?.close();
        }}
        style={[styles.leftAction, { backgroundColor: colors.success }]}
      >
        <Check size={22} color="#FFFFFF" strokeWidth={3} />
        <Text style={styles.actionText}>{task.completed ? 'Reopen' : 'Complete'}</Text>
      </Pressable>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={styles.rightActionsContainer}>
        <Pressable
          onPress={() => {
            onPress();
            swipeableRef.current?.close();
          }}
          style={[styles.rightAction, { backgroundColor: colors.accent }]}
        >
          <Edit3 size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>

        {onReschedule && (
          <Pressable
            onPress={() => {
              onReschedule();
              swipeableRef.current?.close();
            }}
            style={[styles.rightAction, { backgroundColor: colors.warning }]}
          >
            <Calendar size={18} color="#FFFFFF" />
            <Text style={styles.actionText}>Defer</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            onDelete();
            swipeableRef.current?.close();
          }}
          style={[styles.rightAction, { backgroundColor: colors.error }]}
        >
          <Trash2 size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={1.8}
      leftThreshold={50}
      rightThreshold={50}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        haptics.light();
      }}
    >
      <TaskRow
        task={task}
        project={project}
        onPress={onPress}
        onToggleComplete={onToggleComplete}
        onLongPress={onLongPress}
        isMultiSelectMode={isMultiSelectMode}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  leftAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    borderRadius: Radii.lg,
    marginBottom: Spacing.sm,
    marginRight: Spacing.xs,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  rightAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 68,
    borderRadius: Radii.lg,
    marginLeft: 4,
  },
  actionText: {
    ...TypographyScale.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
});
