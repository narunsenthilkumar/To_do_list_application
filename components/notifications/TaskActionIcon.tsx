import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Pin,
  PinOff,
  Star,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Folder,
  ArrowRight,
  Sparkles,
  Calendar,
  Flag,
  Edit3,
  Radio,
  Plus,
} from 'lucide-react-native';
import { TaskActionType } from '../../store/TaskContext';
import { useTheme } from '../../store/ThemeContext';

export interface TaskActionIconProps {
  action: TaskActionType;
  color?: string;
  size?: number;
  reduceMotion?: boolean;
}

export const TaskActionIcon: React.FC<TaskActionIconProps> = ({
  action,
  color,
  size = 16,
  reduceMotion = false,
}) => {
  const { colors } = useTheme();

  // Animation values
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  const rotateDeg = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      rotateDeg.value = 0;
      translateX.value = 0;
      return;
    }

    // Action-specific micro-animation sequences
    switch (action) {
      case 'PIN':
      case 'UNPIN':
        // Elastic scale impact 0.7 -> 1.25 -> 1.0
        scale.value = withSequence(
          withTiming(0.7, { duration: 50 }),
          withSpring(1.22, { damping: 6, stiffness: 260 }),
          withSpring(1.0, { damping: 12, stiffness: 180 })
        );
        rotateDeg.value = withSequence(
          withTiming(-12, { duration: 100 }),
          withSpring(0, { damping: 8, stiffness: 200 })
        );
        break;

      case 'FAVOURITE':
      case 'UNFAVOURITE':
        // Star rotation and expand 0.6 -> 1.2 -> 1.0
        scale.value = withSequence(
          withTiming(0.6, { duration: 50 }),
          withSpring(1.25, { damping: 8, stiffness: 220 }),
          withSpring(1.0, { damping: 12, stiffness: 180 })
        );
        rotateDeg.value = withTiming(360, { duration: 400, easing: Easing.out(Easing.back(1.4)) });
        break;

      case 'COMPLETE':
      case 'complete':
      case 'bulk_complete':
        // Checkmark drawing / scale in
        scale.value = withSpring(1.0, { damping: 10, stiffness: 220 });
        break;

      case 'UNCOMPLETE':
        scale.value = withSpring(1.0, { damping: 12, stiffness: 200 });
        rotateDeg.value = withTiming(-180, { duration: 350, easing: Easing.out(Easing.ease) });
        break;

      case 'DELETE':
      case 'delete':
      case 'bulk_delete':
        // Trash horizontal wiggle
        scale.value = withSpring(1.0, { damping: 12, stiffness: 200 });
        translateX.value = withSequence(
          withTiming(-3, { duration: 60 }),
          withTiming(3, { duration: 60 }),
          withTiming(-2, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        break;

      case 'RESTORE':
        // Circular restore spin
        scale.value = withSpring(1.0, { damping: 10, stiffness: 200 });
        rotateDeg.value = withTiming(-360, { duration: 450, easing: Easing.out(Easing.cubic) });
        break;

      case 'MOVE':
      case 'ASSIGN_PROJECT':
      case 'REMOVE_PROJECT':
        // Directional slide
        scale.value = withSpring(1.0, { damping: 12, stiffness: 200 });
        translateX.value = withSequence(
          withTiming(-6, { duration: 80 }),
          withSpring(0, { damping: 10, stiffness: 190 })
        );
        break;

      case 'CREATE':
        // Pop expand
        scale.value = withSpring(1.0, { damping: 8, stiffness: 240 });
        break;

      default:
        scale.value = withSpring(1.0, { damping: 12, stiffness: 180 });
        break;
    }

    return () => {
      cancelAnimation(scale);
      cancelAnimation(rotateDeg);
      cancelAnimation(translateX);
    };
  }, [action, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotateDeg.value}deg` },
        { translateX: translateX.value },
      ],
    };
  });

  const iconColor = color || getActionDefaultColor(action, colors);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {renderIcon(action, iconColor, size)}
    </Animated.View>
  );
};

function getActionDefaultColor(action: TaskActionType, colors: any): string {
  switch (action) {
    case 'COMPLETE':
    case 'complete':
    case 'bulk_complete':
    case 'RESTORE':
      return colors.success;
    case 'DELETE':
    case 'delete':
    case 'bulk_delete':
      return colors.error;
    case 'PIN':
    case 'UNPIN':
      return '#FF9500'; // Amber/Orange for pins
    case 'FAVOURITE':
    case 'UNFAVOURITE':
      return '#FFD60A'; // Warm Gold for favorites
    case 'CREATE':
    case 'MOVE':
    case 'ASSIGN_PROJECT':
    case 'REMOVE_PROJECT':
    case 'SYNC':
    default:
      return colors.accent;
  }
}

function renderIcon(action: TaskActionType, color: string, size: number) {
  switch (action) {
    case 'PIN':
      return <Pin size={size} color={color} fill={color} />;
    case 'UNPIN':
      return <PinOff size={size} color={color} />;
    case 'FAVOURITE':
      return <Star size={size} color={color} fill={color} />;
    case 'UNFAVOURITE':
      return <Star size={size} color={color} />;
    case 'COMPLETE':
    case 'complete':
    case 'bulk_complete':
      return <CheckCircle2 size={size} color={color} />;
    case 'UNCOMPLETE':
      return <RotateCcw size={size} color={color} />;
    case 'DELETE':
    case 'delete':
    case 'bulk_delete':
      return <Trash2 size={size} color={color} />;
    case 'RESTORE':
      return <RotateCcw size={size} color={color} />;
    case 'MOVE':
      return <ArrowRight size={size} color={color} />;
    case 'ASSIGN_PROJECT':
      return <Folder size={size} color={color} />;
    case 'REMOVE_PROJECT':
      return <Folder size={size} color={color} />;
    case 'CREATE':
      return <Sparkles size={size} color={color} />;
    case 'DUE_DATE_CHANGED':
      return <Calendar size={size} color={color} />;
    case 'PRIORITY_CHANGED':
      return <Flag size={size} color={color} />;
    case 'TASK_UPDATED':
      return <Edit3 size={size} color={color} />;
    case 'SYNC':
      return <Radio size={size} color={color} />;
    default:
      return <Sparkles size={size} color={color} />;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
  },
});
