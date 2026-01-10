import React, { forwardRef, useMemo, useCallback } from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { AnimationPresets } from '../core/AnimationPresets';
import { HapticsController } from '../core/HapticsController';
import { useGlideLayout } from '../hooks';

export interface GlideCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  pressable?: boolean;
  elevated?: boolean;
  bordered?: boolean;
  rounded?: boolean | number;
  padding?: number;
  bg?: string;
  style?: ViewStyle;
  entering?: 'fade' | 'slide' | 'none';
  delay?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const GlideCard = forwardRef<typeof AnimatedTouchable, GlideCardProps>(
  (
    {
      children,
      onPress,
      pressable,
      elevated = true,
      bordered = false,
      rounded = true,
      padding,
      bg = '#FFFFFF',
      style,
      entering = 'none',
      delay = 0,
    },
    ref
  ) => {
    const { spacing } = useGlideLayout();
    const scale = useSharedValue(1);
    const isPressable = pressable !== undefined ? pressable : !!onPress;

    const handlePressIn = useCallback(() => {
      if (isPressable) {
        scale.value = withSpring(0.98, AnimationPresets.getSpringConfig('snappy'));
      }
    }, [scale, isPressable]);

    const handlePressOut = useCallback(() => {
      if (isPressable) {
        scale.value = withSpring(1, AnimationPresets.getSpringConfig('bounce'));
      }
    }, [scale, isPressable]);

    const handlePress = useCallback(() => {
      HapticsController.trigger('light');
      onPress?.();
    }, [onPress]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const containerStyle = useMemo<ViewStyle>(
      () => ({
        backgroundColor: bg,
        borderRadius: rounded === true ? spacing.md : rounded || 0,
        padding: padding ?? spacing.md,
        ...(elevated && styles.elevated),
        ...(bordered && styles.bordered),
      }),
      [bg, rounded, padding, elevated, bordered, spacing.md]
    );

    const enteringAnim = useMemo(() => {
      if (entering === 'fade') return FadeIn.delay(delay).duration(300);
      if (entering === 'slide') return SlideInDown.delay(delay).duration(400);
      return undefined;
    }, [entering, delay]);

    if (isPressable) {
      return (
        <AnimatedTouchable
          ref={ref as any}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={[containerStyle, style, animatedStyle]}
          entering={enteringAnim}
        >
          {children}
        </AnimatedTouchable>
      );
    }

    return (
      <Animated.View ref={ref as any} style={[containerStyle, style]} entering={enteringAnim}>
        {children}
      </Animated.View>
    );
  }
);

GlideCard.displayName = 'GlideCard';

const styles = StyleSheet.create({
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bordered: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
});