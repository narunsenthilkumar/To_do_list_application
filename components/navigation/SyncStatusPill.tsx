import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, RefreshCw, Circle, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SyncEngine } from '../../sync/SyncEngine';
import { SyncStatus } from '../../sync/types';
import { useTheme } from '../../store/ThemeContext';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { Radii, Spacing, TypographyScale } from '../../theme/tokens';

export function SyncStatusPill() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [status, setStatus] = useState<SyncStatus>(SyncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = SyncEngine.addStatusListener((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sync' as any);
  };

  const getStatusDetails = () => {
    switch (status) {
      case 'syncing':
        return {
          label: 'Syncing...',
          color: colors.accent,
          icon: <RefreshCw size={11} color={colors.accent} />,
        };
      case 'conflict':
        return {
          label: 'Conflict Merged',
          color: colors.warning,
          icon: <AlertTriangle size={11} color={colors.warning} />,
        };
      case 'offline':
        return {
          label: 'Offline',
          color: colors.textTertiary,
          icon: <Circle size={9} color={colors.textTertiary} />,
        };
      case 'error':
        return {
          label: 'Sync Error',
          color: colors.error,
          icon: <AlertTriangle size={11} color={colors.error} />,
        };
      case 'synced':
      default:
        return {
          label: 'Synced',
          color: colors.success,
          icon: <Check size={11} color={colors.success} strokeWidth={2.5} />,
        };
    }
  };

  const details = getStatusDetails();

  return (
    <AnimatedPressable
      profile="smallControl"
      onPress={handlePress}
      style={[
        styles.pill,
        {
          backgroundColor: details.color + '15',
          borderColor: details.color + '30',
        },
      ]}
    >
      <View style={styles.iconWrap}>{details.icon}</View>
      <Text style={[styles.label, { color: details.color }]}>{details.label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  iconWrap: {
    marginRight: 4,
  },
  label: {
    ...TypographyScale.caption2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
