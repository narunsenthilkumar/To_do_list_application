import React from 'react';
import { Pressable, ViewStyle, StyleProp, Insets } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { PressDepthProfiles, SpringConfigs } from '../../theme/animations';
import { safeHaptics, Haptics } from '../../utils/haptics';

type ProfileType = 'smallControl' | 'card' | 'primaryButton' | 'floatingButton' | 'destructiveAction';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  profile?: ProfileType;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  hitSlop?: Insets | number;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  profile = 'card',
  style,
  disabled = false,
  accessibilityLabel,
  hitSlop,
}) => {
  const scale = useSharedValue(1);
  const targetConfig = PressDepthProfiles[profile] || PressDepthProfiles.card;

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(targetConfig.scale, SpringConfigs.snappy);
    if (targetConfig.haptic === 'medium') {
      safeHaptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (targetConfig.haptic === 'warning') {
      safeHaptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (targetConfig.haptic === 'light') {
      safeHaptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1.0, SpringConfigs.snappy);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};
