import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import { useTheme } from '../../store/ThemeContext';
import { Shadows } from '../../theme/tokens';

interface AnalogClockProps {
  size?: number;
  showSeconds?: boolean;
  isContinuous?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AnalogClock: React.FC<AnalogClockProps> = ({
  size = 200,
  showSeconds = true,
  isContinuous = true,
  style,
}) => {
  const { colors, isDark } = useTheme();

  // Exact angles
  const [angles, setAngles] = useState(() => {
    const now = new Date();
    const ms = now.getMilliseconds();
    const sec = now.getSeconds() + ms / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;

    return {
      hour: hr * 30, // 360 / 12 = 30 deg/hr
      minute: min * 6, // 360 / 60 = 6 deg/min
      second: sec * 6, // 360 / 60 = 6 deg/sec
    };
  });

  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const updateTime = () => {
      if (!active) return;
      const now = new Date();
      const ms = now.getMilliseconds();
      const sec = isContinuous ? now.getSeconds() + ms / 1000 : now.getSeconds();
      const min = now.getMinutes() + (isContinuous ? sec / 60 : 0);
      const hr = (now.getHours() % 12) + min / 60;

      setAngles({
        hour: hr * 30,
        minute: min * 6,
        second: sec * 6,
      });

      if (isContinuous) {
        if (typeof requestAnimationFrame !== 'undefined') {
          frameRef.current = requestAnimationFrame(updateTime);
        } else {
          setTimeout(updateTime, 50);
        }
      }
    };

    if (isContinuous) {
      frameRef.current = requestAnimationFrame(updateTime);
    } else {
      const interval = setInterval(updateTime, 1000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }

    return () => {
      active = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isContinuous]);

  const radius = size / 2;
  const strokeColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const tickSecondary = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.25)';
  const secondColor = '#FF3B30'; // Apple Vibrant Watch Red

  // Hand lengths relative to radius
  const hourHandLength = radius * 0.52;
  const minuteHandLength = radius * 0.74;
  const secondHandLength = radius * 0.82;
  const secondTailLength = radius * 0.18;

  // Compute hand end points
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const hRad = toRad(angles.hour);
  const hx = radius + hourHandLength * Math.sin(hRad);
  const hy = radius - hourHandLength * Math.cos(hRad);

  const mRad = toRad(angles.minute);
  const mx = radius + minuteHandLength * Math.sin(mRad);
  const my = radius - minuteHandLength * Math.cos(mRad);

  const sRad = toRad(angles.second);
  const sx = radius + secondHandLength * Math.sin(sRad);
  const sy = radius - secondHandLength * Math.cos(sRad);

  const stx = radius - secondTailLength * Math.sin(sRad);
  const sty = radius + secondTailLength * Math.cos(sRad);

  return (
    <View
      accessibilityLabel="Analog clock"
      style={[
        styles.clockContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.82)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)',
        },
        Shadows.floating,
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Subtle Radial Glass Reflection */}
          <RadialGradient id="clockPlateGrad" cx="50%" cy="40%" r="50%">
            <Stop
              offset="0%"
              stopColor={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)'}
              stopOpacity={1}
            />
            <Stop
              offset="100%"
              stopColor={isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(242, 244, 248, 0.9)'}
              stopOpacity={1}
            />
          </RadialGradient>

          {/* Outer Bezel Gradient */}
          <LinearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop
              offset="0%"
              stopColor={isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.8)'}
            />
            <Stop
              offset="100%"
              stopColor={isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)'}
            />
          </LinearGradient>
        </Defs>

        {/* Outer Bezel Rim */}
        <Circle
          cx={radius}
          cy={radius}
          r={radius - 1}
          fill="url(#clockPlateGrad)"
          stroke="url(#bezelGrad)"
          strokeWidth={1.5}
        />

        {/* 60 Minute & Hour Tick Marks */}
        <G>
          {[...Array(60)].map((_, i) => {
            const isHour = i % 5 === 0;
            const isQuarter = i % 15 === 0;
            const angle = (i * 6 * Math.PI) / 180;

            const tickLen = isQuarter ? radius * 0.13 : isHour ? radius * 0.10 : radius * 0.045;
            const strokeW = isQuarter ? 2.5 : isHour ? 1.8 : 0.8;
            const tickColor = isQuarter
              ? strokeColor
              : isHour
              ? isDark
                ? 'rgba(255,255,255,0.7)'
                : 'rgba(0,0,0,0.65)'
              : tickSecondary;

            const outerR = radius - radius * 0.06;
            const innerR = outerR - tickLen;

            const x1 = radius + innerR * Math.sin(angle);
            const y1 = radius - innerR * Math.cos(angle);
            const x2 = radius + outerR * Math.sin(angle);
            const y2 = radius - outerR * Math.cos(angle);

            return (
              <Line
                key={`tick-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={tickColor}
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
            );
          })}
        </G>

        {/* Hour Hand (Shorter, Bold, Rounded) */}
        <Line
          x1={radius}
          y1={radius}
          x2={hx}
          y2={hy}
          stroke={strokeColor}
          strokeWidth={size > 140 ? 4.5 : 3.5}
          strokeLinecap="round"
        />

        {/* Minute Hand (Longer, Sleek) */}
        <Line
          x1={radius}
          y1={radius}
          x2={mx}
          y2={my}
          stroke={strokeColor}
          strokeWidth={size > 140 ? 3 : 2.2}
          strokeLinecap="round"
        />

        {/* Second Hand (Thin Vibrant Red with Tail) */}
        {showSeconds && (
          <G>
            {/* Tail and Main Stem */}
            <Line
              x1={stx}
              y1={sty}
              x2={sx}
              y2={sy}
              stroke={secondColor}
              strokeWidth={size > 140 ? 1.4 : 1.1}
              strokeLinecap="round"
            />
            {/* Small Counter-weight Disc on tail */}
            <Circle
              cx={radius - (secondTailLength * 0.6) * Math.sin(sRad)}
              cy={radius + (secondTailLength * 0.6) * Math.cos(sRad)}
              r={size > 140 ? 2.5 : 1.8}
              fill={secondColor}
            />
          </G>
        )}

        {/* Central Pivot Layers */}
        <Circle cx={radius} cy={radius} r={size > 140 ? 5 : 4} fill={strokeColor} />
        {showSeconds && (
          <>
            <Circle cx={radius} cy={radius} r={size > 140 ? 3 : 2.2} fill={secondColor} />
            <Circle cx={radius} cy={radius} r={1} fill="#FFFFFF" />
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    aspectRatio: 1,
  },
});
