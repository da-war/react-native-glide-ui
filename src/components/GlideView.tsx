import React, { forwardRef, useEffect, useMemo } from 'react';
import { ViewProps, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  SlideInLeft,
  SlideInRight,
  ZoomIn,
  ZoomOut,
  BounceIn,
} from 'react-native-reanimated';

import { AnimationPresets, AnimationPreset } from '../core/AnimationPresets';
import { ResponsiveValue } from '../core/AdaptiveLayoutEngine';
import { useGlideLayout } from '../hooks';

export type EnterAnimation =
  | 'fadeIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoomIn'
  | 'bounceIn'
  | 'none';

export type ExitAnimation =
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoomOut'
  | 'none';

export interface GlideViewProps extends Omit<ViewProps, 'style'> {
  style?: ViewStyle | ViewStyle[];
  entering?: EnterAnimation;
  exiting?: ExitAnimation;
  delay?: number;
  duration?: number;
  animationPreset?: AnimationPreset;
  
  // Responsive props
  padding?: ResponsiveValue<number> | number;
  paddingHorizontal?: ResponsiveValue<number> | number;
  paddingVertical?: ResponsiveValue<number> | number;
  margin?: ResponsiveValue<number> | number;
  marginHorizontal?: ResponsiveValue<number> | number;
  marginVertical?: ResponsiveValue<number> | number;
  gap?: ResponsiveValue<number> | number;
  
  // Flex shortcuts
  flex?: number;
  row?: boolean;
  center?: boolean;
  wrap?: boolean;
  spaceBetween?: boolean;
  spaceAround?: boolean;
  spaceEvenly?: boolean;
  alignStart?: boolean;
  alignEnd?: boolean;
  alignCenter?: boolean;
  justifyStart?: boolean;
  justifyEnd?: boolean;
  justifyCenter?: boolean;
  
  // Size shortcuts
  fullWidth?: boolean;
  fullHeight?: boolean;
  
  // Border radius
  rounded?: boolean | number;
  
  // Background
  bg?: string;
}

const ENTERING_ANIMATIONS = {
  fadeIn: FadeIn,
  slideUp: SlideInDown,
  slideDown: SlideInUp,
  slideLeft: SlideInRight,
  slideRight: SlideInLeft,
  zoomIn: ZoomIn,
  bounceIn: BounceIn,
  none: undefined,
};

const EXITING_ANIMATIONS = {
  fadeOut: FadeOut,
  slideUp: SlideInUp,
  slideDown: SlideInDown,
  slideLeft: SlideInLeft,
  slideRight: SlideInRight,
  zoomOut: ZoomOut,
  none: undefined,
};

export const GlideView = forwardRef<Animated.View, GlideViewProps>(
  (
    {
      style,
      entering = 'none',
      exiting = 'none',
      delay = 0,
      duration,
      animationPreset = 'smooth',
      padding,
      paddingHorizontal,
      paddingVertical,
      margin,
      marginHorizontal,
      marginVertical,
      gap,
      flex,
      row,
      center,
      wrap,
      spaceBetween,
      spaceAround,
      spaceEvenly,
      alignStart,
      alignEnd,
      alignCenter,
      justifyStart,
      justifyEnd,
      justifyCenter,
      fullWidth,
      fullHeight,
      rounded,
      bg,
      children,
      ...rest
    },
    ref
  ) => {
    const { resolve, spacing } = useGlideLayout();

    // Build computed style from shorthand props
    const computedStyle = useMemo<ViewStyle>(() => {
      const result: ViewStyle = {};

      // Padding
      if (padding !== undefined) {
        const value = typeof padding === 'number' ? padding : resolve(padding);
        result.padding = value;
      }
      if (paddingHorizontal !== undefined) {
        const value = typeof paddingHorizontal === 'number' ? paddingHorizontal : resolve(paddingHorizontal);
        result.paddingHorizontal = value;
      }
      if (paddingVertical !== undefined) {
        const value = typeof paddingVertical === 'number' ? paddingVertical : resolve(paddingVertical);
        result.paddingVertical = value;
      }

      // Margin
      if (margin !== undefined) {
        const value = typeof margin === 'number' ? margin : resolve(margin);
        result.margin = value;
      }
      if (marginHorizontal !== undefined) {
        const value = typeof marginHorizontal === 'number' ? marginHorizontal : resolve(marginHorizontal);
        result.marginHorizontal = value;
      }
      if (marginVertical !== undefined) {
        const value = typeof marginVertical === 'number' ? marginVertical : resolve(marginVertical);
        result.marginVertical = value;
      }

      // Gap
      if (gap !== undefined) {
        const value = typeof gap === 'number' ? gap : resolve(gap);
        result.gap = value;
      }

      // Flex
      if (flex !== undefined) result.flex = flex;
      if (row) result.flexDirection = 'row';
      if (wrap) result.flexWrap = 'wrap';

      // Center (both axes)
      if (center) {
        result.justifyContent = 'center';
        result.alignItems = 'center';
      }

      // Justify content
      if (spaceBetween) result.justifyContent = 'space-between';
      if (spaceAround) result.justifyContent = 'space-around';
      if (spaceEvenly) result.justifyContent = 'space-evenly';
      if (justifyStart) result.justifyContent = 'flex-start';
      if (justifyEnd) result.justifyContent = 'flex-end';
      if (justifyCenter) result.justifyContent = 'center';

      // Align items
      if (alignStart) result.alignItems = 'flex-start';
      if (alignEnd) result.alignItems = 'flex-end';
      if (alignCenter) result.alignItems = 'center';

      // Size
      if (fullWidth) result.width = '100%';
      if (fullHeight) result.height = '100%';

      // Border radius
      if (rounded === true) {
        result.borderRadius = spacing.md;
      } else if (typeof rounded === 'number') {
        result.borderRadius = rounded;
      }

      // Background
      if (bg) result.backgroundColor = bg;

      return result;
    }, [
      padding, paddingHorizontal, paddingVertical,
      margin, marginHorizontal, marginVertical,
      gap, flex, row, center, wrap,
      spaceBetween, spaceAround, spaceEvenly,
      alignStart, alignEnd, alignCenter,
      justifyStart, justifyEnd, justifyCenter,
      fullWidth, fullHeight, rounded, bg,
      resolve, spacing,
    ]);

    // Get entering animation
    const enteringAnimation = useMemo(() => {
      const Animation = ENTERING_ANIMATIONS[entering];
      if (!Animation) return undefined;
      
      let anim = Animation.duration(duration ?? AnimationPresets.getSpringConfig(animationPreset).stiffness ? 300 : 300);
      if (delay > 0) {
        anim = anim.delay(delay);
      }
      return anim;
    }, [entering, delay, duration, animationPreset]);

    // Get exiting animation
    const exitingAnimation = useMemo(() => {
      const Animation = EXITING_ANIMATIONS[exiting];
      if (!Animation) return undefined;
      return Animation.duration(duration ?? 200);
    }, [exiting, duration]);

    const combinedStyle = useMemo(() => {
      if (Array.isArray(style)) {
        return [computedStyle, ...style];
      }
      return [computedStyle, style];
    }, [computedStyle, style]);

    return (
      <Animated.View
        ref={ref}
        style={combinedStyle}
        entering={enteringAnimation}
        exiting={exitingAnimation}
        {...rest}
      >
        {children}
      </Animated.View>
    );
  }
);

GlideView.displayName = 'GlideView';
