import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  size: number;
  progress: number; // 0-100
  color: string;
  bgColor?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export default function CircularProgress({
  size,
  progress,
  color,
  bgColor = '#E5E5EA30',
  strokeWidth = 8,
  children,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(progress, 0), 100);
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cy} r={r} stroke={bgColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx},${cy}`}
        />
      </Svg>
      {children}
    </View>
  );
}
