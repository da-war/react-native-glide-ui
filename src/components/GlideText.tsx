import React, { forwardRef, useMemo } from 'react';
import { TextStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useGlideLayout } from '../hooks';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'title' | 'subtitle' | 'body1' | 'body2' | 'caption';

export interface GlideTextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  weight?: TextStyle['fontWeight'];
  animated?: boolean;
  style?: TextStyle;
  numberOfLines?: number;
}

export const GlideText = forwardRef<Animated.Text, GlideTextProps>(
  ({ children, variant = 'body1', color = '#000', align = 'left', weight, animated = false, style, numberOfLines }, ref) => {
    const { typography } = useGlideLayout();

    const computedStyle = useMemo<TextStyle>(() => ({
      fontSize: typography[variant],
      color,
      textAlign: align,
      fontWeight: weight || (variant.startsWith('h') || variant === 'title' ? 'bold' : 'normal'),
      ...style,
    }), [typography, variant, color, align, weight, style]);

    return (
      <Animated.Text
        ref={ref}
        style={computedStyle}
        numberOfLines={numberOfLines}
        entering={animated ? FadeIn.duration(300) : undefined}
      >
        {children}
      </Animated.Text>
    );
  }
);

GlideText.displayName = 'GlideText';
