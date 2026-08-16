import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../store/ThemeContext';
import { formatClockTime } from '../../utils/timeFormatter';
import { TypographyScale, Spacing } from '../../theme/tokens';
import { SpringConfigs } from '../../theme/animations';

interface DigitalClockProps {
  showSeconds?: boolean;
  showDate?: boolean;
  style?: StyleProp<ViewStyle>;
  timeTextStyle?: StyleProp<TextStyle>;
  dateTextStyle?: StyleProp<TextStyle>;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({
  showSeconds = true,
  showDate = true,
  style,
  timeTextStyle,
  dateTextStyle,
}) => {
  const { colors, timeFormat } = useTheme();
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Animation values for smooth 12h <-> 24h transition
  const transitionOpacity = useSharedValue(1);
  const transitionTranslateY = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Trigger smooth transition when format changes
  useEffect(() => {
    transitionOpacity.value = withTiming(0.2, { duration: 120 }, () => {
      transitionOpacity.value = withTiming(1, { duration: 180 });
    });
    transitionTranslateY.value = withTiming(-6, { duration: 120 }, () => {
      transitionTranslateY.value = withSpring(0, SpringConfigs.spatialSpring);
    });
  }, [timeFormat]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: transitionOpacity.value,
      transform: [{ translateY: transitionTranslateY.value }],
    };
  });

  const clockParts = formatClockTime(currentDate, timeFormat, showSeconds);

  const dateStr = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.timeRow, animatedStyle]}>
        <Text style={[styles.timeMain, { color: colors.textPrimary }, timeTextStyle]}>
          {clockParts.hours}:{clockParts.minutes}
        </Text>

        {showSeconds && clockParts.seconds && (
          <Text style={[styles.timeSeconds, { color: colors.accent }]}>
            :{clockParts.seconds}
          </Text>
        )}

        {clockParts.period && (
          <Text style={[styles.timePeriod, { color: colors.textSecondary }]}>
            {clockParts.period}
          </Text>
        )}
      </Animated.View>

      {showDate && (
        <Text style={[styles.dateText, { color: colors.textSecondary }, dateTextStyle]}>
          {dateStr}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  timeMain: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  timeSeconds: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 2,
  },
  timePeriod: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  dateText: {
    ...TypographyScale.subhead,
    marginTop: 4,
    fontWeight: '500',
  },
});
