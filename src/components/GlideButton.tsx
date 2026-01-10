import React, { forwardRef, useMemo, useCallback } from 'react';
import { StyleSheet, TextStyle, ViewStyle, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { AnimationPresets } from '../core/AnimationPresets';
import { HapticsController, HapticFeedbackType } from '../core/HapticsController';
import { useGlideLayout } from '../hooks';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface GlideButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
  scaleDown?: number;
  haptic?: HapticFeedbackType | false;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  rounded?: boolean | number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  flex?: number;
}

const SIZE_CONFIG = {
  xs: { height: 28, paddingHorizontal: 10, fontSize: 12 },
  sm: { height: 34, paddingHorizontal: 14, fontSize: 13 },
  md: { height: 42, paddingHorizontal: 18, fontSize: 15 },
  lg: { height: 50, paddingHorizontal: 24, fontSize: 17 },
  xl: { height: 58, paddingHorizontal: 32, fontSize: 19 },
};

const COLORS = {
  primary: '#007AFF',
  disabled: '#C7C7CC',
  disabledText: '#8E8E93',
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const GlideButton = forwardRef<typeof AnimatedTouchable, GlideButtonProps>(
  (
    {
      children,
      onPress,
      onLongPress,
      variant = 'solid',
      size = 'md',
      color = COLORS.primary,
      textColor,
      disabled = false,
      loading = false,
      scaleDown = 0.96,
      haptic = 'light',
      style,
      textStyle,
      fullWidth = false,
      rounded,
      leftIcon,
      rightIcon,
      flex,
    },
    ref
  ) => {
    const { spacing } = useGlideLayout();
    const scale = useSharedValue(1);

    const isDisabled = disabled || loading;
    const sizeConfig = SIZE_CONFIG[size];

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(scaleDown, AnimationPresets.getSpringConfig('snappy'));
    }, [scale, scaleDown]);

    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, AnimationPresets.getSpringConfig('bounce'));
    }, [scale]);

    const handlePress = useCallback(() => {
      if (isDisabled) return;
      if (haptic) {
        HapticsController.trigger(haptic);
      }
      onPress?.();
    }, [isDisabled, haptic, onPress]);

    const handleLongPress = useCallback(() => {
      if (isDisabled) return;
      if (haptic) {
        HapticsController.trigger('medium');
      }
      onLongPress?.();
    }, [isDisabled, haptic, onLongPress]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const variantStyle = useMemo<ViewStyle>(() => {
      const baseRadius = rounded === true ? sizeConfig.height / 2 : rounded || spacing.sm;

      switch (variant) {
        case 'solid':
          return { backgroundColor: isDisabled ? COLORS.disabled : color, borderRadius: baseRadius };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: isDisabled ? COLORS.disabled : color,
            borderRadius: baseRadius,
          };
        case 'ghost':
          return { backgroundColor: 'transparent', borderRadius: baseRadius };
        case 'soft':
          return {
            backgroundColor: (isDisabled ? COLORS.disabled : color) + '20',
            borderRadius: baseRadius,
          };
        default:
          return {};
      }
    }, [variant, color, isDisabled, rounded, sizeConfig.height, spacing.sm]);

    const computedTextColor = useMemo(() => {
      if (textColor) return textColor;
      if (isDisabled) return COLORS.disabledText;
      return variant === 'solid' ? '#FFFFFF' : color;
    }, [textColor, variant, color, isDisabled]);

    return (
      <AnimatedTouchable
        ref={ref as any}
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.container,
          { height: sizeConfig.height, paddingHorizontal: sizeConfig.paddingHorizontal },
          variantStyle,
          fullWidth && styles.fullWidth,
          flex !== undefined && { flex },
          style,
          animatedStyle,
        ]}
      >
        {leftIcon && <Animated.View style={styles.iconLeft}>{leftIcon}</Animated.View>}
        {typeof children === 'string' ? (
          <Text style={[{ fontSize: sizeConfig.fontSize, fontWeight: '600', color: computedTextColor }, textStyle]}>
            {children}
          </Text>
        ) : (
          children
        )}
        {rightIcon && <Animated.View style={styles.iconRight}>{rightIcon}</Animated.View>}
      </AnimatedTouchable>
    );
  }
);

GlideButton.displayName = 'GlideButton';

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  fullWidth: { width: '100%' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});