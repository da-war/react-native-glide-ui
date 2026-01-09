import React, { forwardRef, useMemo, useCallback } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

export const GlideCard = forwardRef<Animated.View, GlideCardProps>(
  (
    {
      children,
      onPress,
      pressable = !!onPress,
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

    const handlePress = useCallback(() => {
      HapticsController.trigger('light');
      onPress?.();
    }, [onPress]);

    const gesture = useMemo(() => {
      if (!pressable) return Gesture.Tap().enabled(false);
      
      return Gesture.Tap()
        .onBegin(() => {
          scale.value = withSpring(0.98, AnimationPresets.getSpringConfig('snappy'));
        })
        .onFinalize(() => {
          scale.value = withSpring(1, AnimationPresets.getSpringConfig('bounce'));
        })
        .onEnd(() => {
          runOnJS(handlePress)();
        });
    }, [pressable, scale, handlePress]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const containerStyle = useMemo<ViewStyle>(() => ({
      backgroundColor: bg,
      borderRadius: rounded === true ? spacing.md : rounded || 0,
      padding: padding ?? spacing.md,
      ...(elevated && styles.elevated),
      ...(bordered && styles.bordered),
    }), [bg, rounded, padding, elevated, bordered, spacing.md]);

    const enteringAnim = useMemo(() => {
      if (entering === 'fade') return FadeIn.delay(delay).duration(300);
      if (entering === 'slide') return SlideInDown.delay(delay).duration(400);
      return undefined;
    }, [entering, delay]);

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          ref={ref}
          style={[containerStyle, style, animatedStyle]}
          entering={enteringAnim}
        >
          {children}
        </Animated.View>
      </GestureDetector>
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
