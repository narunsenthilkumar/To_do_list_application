import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Check, Pin, Star, Edit3, Calendar, Trash2, X, Clock, CalendarDays } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Task } from '../../models/task';
import { useTheme } from '../../store/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { MaterialLayers } from '../../theme/materials';
import { haptics } from '../../services/haptics';
import { getTodayDateString, getTomorrowDateString } from '../../services/storage/repository';

interface TaskActionSheetProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onToggleComplete: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onReschedule?: (dueDate: string, dueTime?: string) => void;
  onDelete: () => void;
}

export const TaskActionSheet: React.FC<TaskActionSheetProps> = ({
  visible,
  task,
  onClose,
  onToggleComplete,
  onTogglePin,
  onToggleFavorite,
  onEdit,
  onReschedule,
  onDelete,
}) => {
  const { colors, isDark } = useTheme();
  const [showDeferOptions, setShowDeferOptions] = useState(false);

  const starScale = useSharedValue(1);
  const pinScale = useSharedValue(1);

  if (!task) return null;

  const handleFavoritePress = () => {
    haptics.light();
    starScale.value = withSequence(
      withTiming(0.75, { duration: 60 }),
      withSpring(1.2, { damping: 14, stiffness: 280, mass: 0.7 }),
      withSpring(1.0, { damping: 20, stiffness: 240, mass: 0.7 })
    );
    onToggleFavorite();
  };

  const handlePinPress = () => {
    haptics.medium();
    pinScale.value = withSequence(
      withTiming(0.75, { duration: 60 }),
      withSpring(1.15, { damping: 14, stiffness: 280, mass: 0.7 }),
      withSpring(1.0, { damping: 20, stiffness: 240, mass: 0.7 })
    );
    onTogglePin();
  };

  const handleDeferSelect = (type: 'later_today' | 'tomorrow' | 'next_week') => {
    haptics.warning();
    if (!onReschedule) return;

    if (type === 'later_today') {
      const today = getTodayDateString();
      const now = new Date();
      now.setHours(now.getHours() + 3);
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      onReschedule(today, `${h}:${m}`);
    } else if (type === 'tomorrow') {
      onReschedule(getTomorrowDateString());
    } else if (type === 'next_week') {
      const nextW = new Date();
      nextW.setDate(nextW.getDate() + 7);
      const y = nextW.getFullYear();
      const mo = String(nextW.getMonth() + 1).padStart(2, '0');
      const d = String(nextW.getDate()).padStart(2, '0');
      onReschedule(`${y}-${mo}-${d}`);
    }

    setShowDeferOptions(false);
    onClose();
  };

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const pinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinScale.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.modalBackdrop }]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={() => {
            setShowDeferOptions(false);
            onClose();
          }}
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? MaterialLayers.elevated.dark : colors.elevatedCard,
              borderColor: isDark ? MaterialLayers.elevated.borderDark : MaterialLayers.elevated.borderLight,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, marginRight: Spacing.md }}>
              <Text style={[styles.sheetSubtitle, { color: colors.textTertiary }]}>Task Actions</Text>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {task.title}
              </Text>
            </View>
            <AnimatedPressable
              profile="smallControl"
              onPress={() => {
                setShowDeferOptions(false);
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={20} color={colors.textTertiary} />
            </AnimatedPressable>
          </View>

          {/* Action List */}
          {!showDeferOptions ? (
            <View style={styles.actionsList}>
              {/* Complete / Reopen */}
              <Pressable
                onPress={() => {
                  onToggleComplete();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.success + '18' }]}>
                  <Check size={18} color={colors.success} strokeWidth={2.5} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                  {task.completed ? 'Reopen Task' : 'Complete Task'}
                </Text>
              </Pressable>

              {/* Pin / Unpin */}
              <Pressable
                onPress={handlePinPress}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <Animated.View style={[styles.iconCircle, { backgroundColor: colors.accent + '18' }, pinAnimatedStyle]}>
                  <Pin
                    size={18}
                    color={colors.accent}
                    fill={task.isPinned ? colors.accent : 'transparent'}
                  />
                </Animated.View>
                <View style={styles.actionTextCol}>
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                    {task.isPinned ? 'Unpin Task' : 'Pin to Top'}
                  </Text>
                  <Text style={[styles.actionHint, { color: colors.textTertiary }]}>
                    {task.isPinned ? 'Remove from top of list' : 'Keep prominently visible at top'}
                  </Text>
                </View>
              </Pressable>

              {/* Favorite / Unfavorite */}
              <Pressable
                onPress={handleFavoritePress}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <Animated.View style={[styles.iconCircle, { backgroundColor: '#FFCC0025' }, starAnimatedStyle]}>
                  <Star
                    size={18}
                    color="#FFCC00"
                    fill={task.isFavorite ? '#FFCC00' : 'transparent'}
                  />
                </Animated.View>
                <View style={styles.actionTextCol}>
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                    {task.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Text>
                  <Text style={[styles.actionHint, { color: colors.textTertiary }]}>
                    {task.isFavorite ? 'Remove from favorites list' : 'Mark as special and important'}
                  </Text>
                </View>
              </Pressable>

              {/* Edit */}
              <Pressable
                onPress={() => {
                  onClose();
                  onEdit();
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.secondaryBackground }]}>
                  <Edit3 size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Edit Task Details</Text>
              </Pressable>

              {/* Defer Button */}
              {onReschedule && (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setShowDeferOptions(true);
                  }}
                  style={({ pressed }) => [
                    styles.actionItem,
                    { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.warning + '18' }]}>
                    <Calendar size={18} color={colors.warning} />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Defer / Reschedule</Text>
                    <Text style={[styles.actionHint, { color: colors.textTertiary }]}>
                      Move to later today, tomorrow, or next week
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Delete */}
              <Pressable
                onPress={() => {
                  onClose();
                  onDelete();
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  styles.destructiveItem,
                  { backgroundColor: pressed ? colors.error + '12' : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.error + '18' }]}>
                  <Trash2 size={18} color={colors.error} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.error }]}>Delete Task</Text>
              </Pressable>
            </View>
          ) : (
            /* Defer Options Menu */
            <View style={styles.actionsList}>
              <Text style={[styles.deferHeading, { color: colors.textSecondary }]}>Defer Task Until:</Text>

              <Pressable
                onPress={() => handleDeferSelect('later_today')}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.warning + '18' }]}>
                  <Clock size={18} color={colors.warning} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Later Today (+3 Hours)</Text>
              </Pressable>

              <Pressable
                onPress={() => handleDeferSelect('tomorrow')}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.accent + '18' }]}>
                  <Calendar size={18} color={colors.accent} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Tomorrow</Text>
              </Pressable>

              <Pressable
                onPress={() => handleDeferSelect('next_week')}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.secondaryBackground }]}>
                  <CalendarDays size={18} color={colors.textPrimary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Next Week (+7 Days)</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowDeferOptions(false);
                  onClose();
                  onEdit();
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.secondaryBackground : 'transparent' },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.secondaryBackground }]}>
                  <Edit3 size={18} color={colors.textSecondary} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Custom Date / Time...</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl + 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: Spacing.sm,
  },
  sheetSubtitle: {
    ...TypographyScale.caption2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sheetTitle: {
    ...TypographyScale.headline,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  actionsList: {
    marginTop: Spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    marginVertical: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionTextCol: {
    flex: 1,
  },
  actionLabel: {
    ...TypographyScale.body,
    fontWeight: '500',
  },
  actionHint: {
    ...TypographyScale.caption2,
    marginTop: 1,
  },
  destructiveItem: {
    marginTop: Spacing.xs,
  },
  deferHeading: {
    ...TypographyScale.footnote,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
