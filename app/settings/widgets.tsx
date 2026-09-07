import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, LayoutGrid, Smartphone, RefreshCw, CheckCircle2, Sparkles, Plus, ExternalLink, HelpCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PrimarySurface } from '../../components/common/PrimarySurface';
import { ElevatedCard } from '../../components/common/ElevatedCard';
import { AnimatedPressable } from '../../components/common/AnimatedPressable';
import { InteractiveWidgetCard } from '../../components/widgets/InteractiveWidgetCard';
import { WidgetDataService } from '../../services/widgets/WidgetDataService';
import { WidgetCapability } from '../../services/widgets/WidgetCapability';
import { WidgetSize, WidgetSnapshotData, DEFAULT_WIDGET_SNAPSHOT } from '../../services/widgets/WidgetState';
import { useTheme } from '../../store/ThemeContext';
import { MAX_CONTENT_WIDTH } from '../../theme/responsive';
import { Spacing, TypographyScale, Radii } from '../../theme/tokens';
import { getBottomContentInset } from '../../theme/materials';
import { safeGoBack } from '../../utils/navigation';
import { haptics } from '../../services/haptics';

export default function WidgetsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [selectedSize, setSelectedSize] = useState<WidgetSize>('medium');
  const [snapshotData, setSnapshotData] = useState<WidgetSnapshotData>(DEFAULT_WIDGET_SNAPSHOT);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const capability = WidgetCapability.getCapability();

  useEffect(() => {
    WidgetDataService.init();
    const unsubscribe = WidgetDataService.subscribe((data) => {
      setSnapshotData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    haptics.light();
    const fresh = await WidgetDataService.refreshSnapshot();
    setSnapshotData(fresh);
    setIsRefreshing(false);
  };

  const handleAddWidgetGuide = async () => {
    haptics.medium();

    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.TaskoraWidgetModule?.pinWidget) {
          const pinned = await NativeModules.TaskoraWidgetModule.pinWidget();
          if (pinned) return;
        }
      } catch {}
    }

    Alert.alert(
      `Add Taskora Widget (${selectedSize.toUpperCase()})`,
      `${capability.instructions.join('\n\n')}`,
      [{ text: 'Got it', style: 'default' }]
    );
  };


  const bottomInset = getBottomContentInset(insets);

  return (
    <PrimarySurface>
      <View style={styles.outerContainer}>
        <View style={styles.innerContentWrapper}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable profile="smallControl" onPress={() => safeGoBack(router)} style={styles.backBtn} accessibilityLabel="Go back">
              <ArrowLeft size={22} color={colors.textPrimary} />
            </AnimatedPressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Widgets Studio</Text>
            <AnimatedPressable profile="smallControl" onPress={handleManualRefresh} style={styles.backBtn} accessibilityLabel="Refresh widget data">
              <RefreshCw size={18} color={isRefreshing ? colors.accent : colors.textSecondary} />
            </AnimatedPressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Platform Guide Card */}
            <ElevatedCard style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <Smartphone size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={[styles.guideTitle, { color: colors.textPrimary }]}>{capability.title}</Text>
              </View>
              <Text style={[styles.guideDesc, { color: colors.textSecondary }]}>
                {capability.description}
              </Text>
            </ElevatedCard>

            {/* Size Selector Tabs */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>WIDGET SIZE PREVIEW</Text>
            <View
              style={[
                styles.segmentedWrapper,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                },
              ]}
            >
              {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <AnimatedPressable
                    key={size}
                    profile="smallControl"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSize(size);
                    }}
                    style={[
                      styles.segmentButton,
                      isSelected && [styles.segmentButtonActive, { backgroundColor: colors.accent }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textSecondary,
                          fontWeight: isSelected ? '800' : '600',
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {size} {size === 'small' ? '(2x2)' : size === 'medium' ? '(4x2)' : '(4x4)'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Live Interactive Widget Card Stage */}
            <View style={styles.stageContainer}>
              <InteractiveWidgetCard
                size={selectedSize}
                data={snapshotData}
                onRefresh={handleManualRefresh}
              />
            </View>

            {/* Add Widget CTA */}
            <AnimatedPressable
              profile="primaryButton"
              onPress={handleAddWidgetGuide}
              style={[styles.addWidgetBtn, { backgroundColor: colors.accent }]}
            >
              <LayoutGrid size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.addWidgetBtnText}>Add Taskora Widget</Text>
            </AnimatedPressable>

            {/* How to add widgets instructions */}
            <Text style={[styles.sectionHeader, { color: colors.textTertiary, marginTop: Spacing.xl }]}>
              SETUP INSTRUCTIONS
            </Text>
            <ElevatedCard style={styles.instructionsCard}>
              {capability.instructions.map((inst, index) => (
                <View key={index} style={styles.instructionRow}>
                  <View style={[styles.instructionStepBadge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.instructionStepNumber, { color: colors.accent }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: colors.textPrimary }]}>{inst}</Text>
                </View>
              ))}
            </ElevatedCard>
          </ScrollView>
        </View>
      </View>
    </PrimarySurface>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  innerContentWrapper: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...TypographyScale.headline,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  guideCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  guideTitle: {
    ...TypographyScale.headline,
    fontWeight: '700',
  },
  guideDesc: {
    ...TypographyScale.footnote,
    lineHeight: 18,
  },
  sectionHeader: {
    ...TypographyScale.caption1,
    fontWeight: '700',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    borderRadius: Radii.pill,
    padding: 4,
    borderWidth: 1,
    height: 50,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  segmentButton: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  segmentText: {
    ...TypographyScale.footnote,
  },
  stageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
    paddingVertical: Spacing.md,
  },
  addWidgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: Radii.pill,
    marginTop: Spacing.md,
  },
  addWidgetBtnText: {
    ...TypographyScale.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  instructionsCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionStepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 1,
  },
  instructionStepNumber: {
    ...TypographyScale.caption2,
    fontWeight: '800',
  },
  instructionText: {
    ...TypographyScale.footnote,
    flex: 1,
    lineHeight: 20,
  },
});
