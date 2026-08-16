import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../store/ThemeContext';
import { PriorityLevel } from '../../models/task';
import { SpringConfigs } from '../../theme/animations';
import { haptics } from '../../services/haptics';

interface TaskCheckboxProps {
  completed: boolean;
  onToggle: () => void;
  priority?: PriorityLevel;
  size?: number;
}

export const TaskCheckbox: React.FC<TaskCheckboxProps> = ({
  completed,
  onToggle,
  priority = 'none',
  size = 24,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    if (completed) {
      scale.value = withSequence(
        withSpring(1.18, SpringConfigs.bouncy),
        withSpring(1.0, SpringConfigs.snappy)
      );
      checkScale.value = withSpring(1.0, SpringConfigs.bouncy);
    } else {
      scale.value = withSpring(1.0, SpringConfigs.snappy);
      checkScale.value = withTiming(0, { duration: 150 });
    }
  }, [completed]);

  const getPriorityColor = () => {
    switch (priority) {
      case 'urgent':
        return colors.priorityUrgent;
      case 'high':
        return colors.priorityHigh;
      case 'medium':
        return colors.priorityMedium;
      case 'low':
        return colors.priorityLow;
      case 'none':
      default:
        return colors.textTertiary;
    }
  };

  const priorityColor = getPriorityColor();

  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedCheckStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkScale.value }],
      opacity: checkScale.value,
    };
  });

  const handlePress = () => {
    if (!completed) {
      haptics.success();
    } else {
      haptics.selection();
    }
    onToggle();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={10} style={styles.touchTarget}>
      <Animated.View
        style={[
          styles.checkbox,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: completed ? colors.success : priorityColor,
            backgroundColor: completed ? colors.success : 'transparent',
            borderWidth: completed ? 0 : 2,
          },
          animatedCircleStyle,
        ]}
      >
        <Animated.View style={animatedCheckStyle}>
          <Check size={size * 0.65} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
