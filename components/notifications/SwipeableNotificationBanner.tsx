import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Bell, X, Calendar, Clock } from 'lucide-react-native';
import { Task } from '../../models/task';
import { useTheme } from '../../store/ThemeContext';
import { haptics } from '../../services/haptics';
import { formatTaskTime } from '../../utils/timeFormatter';
import { Radii, Shadows, Spacing, TypographyScale } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

interface SwipeableNotificationBannerProps {
  task: Task;
  onDismiss: () => void;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_WIDTH * 0.35;

export const SwipeableNotificationBanner: React.FC<SwipeableNotificationBannerProps> = ({
  task,
  onDismiss,
  onPress,
}) => {
  const { colors, isDark, timeFormat } = useTheme();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const handleDismiss = () => {
    haptics.light();
    onDismiss();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Add slight drag resistance
      translateX.value = event.translationX * 0.85;
      const progress = Math.min(1, Math.abs(event.translationX) / DISMISS_THRESHOLD);
      opacity.value = 1 - progress * 0.5;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > DISMISS_THRESHOLD || Math.abs(event.velocityX) > 500) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(direction * (SCREEN_WIDTH + 50), { duration: 200 });
        opacity.value = withTiming(0, { duration: 180 }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        // Spring back if below threshold
        translateX.value = withSpring(0, SpringConfigs.bouncy);
        opacity.value = withSpring(1, SpringConfigs.snappy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: colors.accent + '30',
          },
          Shadows.floating,
          animatedStyle,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '20' }]}>
          <Bell size={18} color={colors.accent} />
        </View>

        <View style={styles.contentWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {task.dueTime ? (
              <View style={styles.metaItem}>
                <Clock size={11} color={colors.textTertiary} style={{ marginRight: 3 }} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {formatTaskTime(task.dueTime, timeFormat)}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.hintText, { color: colors.textTertiary }]}>Swipe to dismiss</Text>
          </View>
        </View>

        <View style={styles.dismissHint}>
          <X size={16} color={colors.textTertiary} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contentWrap: {
    flex: 1,
  },
  title: {
    ...TypographyScale.headline,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...TypographyScale.caption2,
  },
  hintText: {
    ...TypographyScale.caption2,
  },
  dismissHint: {
    padding: Spacing.xs,
  },
});
