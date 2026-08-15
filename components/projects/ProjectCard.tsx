import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Icons from 'lucide-react-native';
import { Project } from '../../models/project';
import { ElevatedCard } from '../common/ElevatedCard';
import { useTheme } from '../../store/ThemeContext';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

interface ProjectCardProps {
  project: Project;
  activeTaskCount: number;
  completedTaskCount: number;
  onPress: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  activeTaskCount,
  completedTaskCount,
  onPress,
}) => {
  const { colors } = useTheme();

  const total = activeTaskCount + completedTaskCount;
  const progressPercent = total > 0 ? Math.round((completedTaskCount / total) * 100) : 0;

  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withSpring(progressPercent, SpringConfigs.snappy);
  }, [progressPercent]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
    };
  });

  // Resolve Lucide Icon dynamically with alias fallback
  const getIconComponent = (name: string) => {
    if (!name) return Icons.Folder;
    if ((Icons as any)[name]) return (Icons as any)[name];
    const aliases: Record<string, any> = {
      Home: (Icons as any).House || Icons.Folder,
      CheckSquare: (Icons as any).SquareCheck || (Icons as any).CheckSquare || Icons.Folder,
      CheckCircle2: (Icons as any).CircleCheck || (Icons as any).CheckCircle2 || Icons.Folder,
      Cart: (Icons as any).ShoppingCart || Icons.Folder,
      Shopping: (Icons as any).ShoppingCart || Icons.Folder,
      Travel: (Icons as any).Plane || Icons.Folder,
      List: (Icons as any).ListTodo || (Icons as any).ListChecks || Icons.Folder,
    };
    return aliases[name] || Icons.Folder;
  };

  const IconComponent = getIconComponent(project.icon);

  return (
    <ElevatedCard onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: project.color + '20' }]}>
          <IconComponent size={22} color={project.color} />
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {activeTaskCount} active
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {project.name}
      </Text>

      {project.description ? (
        <Text style={[styles.description, { color: colors.textTertiary }]} numberOfLines={1}>
          {project.description}
        </Text>
      ) : null}

      <View style={styles.progressContainer}>
        <View style={[styles.progressBarTrack, { backgroundColor: colors.secondaryBackground }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: project.color },
              animatedProgressStyle,
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textTertiary }]}>
          {progressPercent}%
        </Text>
      </View>
    </ElevatedCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  countText: {
    ...TypographyScale.caption1,
    fontWeight: '600',
  },
  title: {
    ...TypographyScale.headline,
    marginBottom: 2,
  },
  description: {
    ...TypographyScale.footnote,
    marginBottom: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
});

