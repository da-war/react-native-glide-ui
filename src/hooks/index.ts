import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureStateChangeEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

import { PerformanceMonitor, DeviceCapabilities, PerformanceMetrics } from '../core/PerformanceMonitor';
import { AdaptiveLayoutEngine, LayoutMetrics, ResponsiveValue, Breakpoint } from '../core/AdaptiveLayoutEngine';
import { GestureIntelligence, SwipeGestureData } from '../core/GestureIntelligence';
import { AnimationPresets, AnimationPreset, AnimationOptions } from '../core/AnimationPresets';
import { HapticsController, HapticFeedbackType } from '../core/HapticsController';

// ============================================
// useGlideLayout
// ============================================
export interface UseGlideLayoutReturn {
  metrics: LayoutMetrics;
  breakpoint: Breakpoint;
  spacing: LayoutMetrics['spacing'];
  typography: LayoutMetrics['typography'];
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  resolve: <T>(value: ResponsiveValue<T> | T) => T;
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
  columns: (config?: Partial<Record<Breakpoint, number>>) => number;
}

export function useGlideLayout(): UseGlideLayoutReturn {
  const [metrics, setMetrics] = useState<LayoutMetrics>(() => AdaptiveLayoutEngine.getMetrics());

  useEffect(() => {
    AdaptiveLayoutEngine.initialize();
    const unsubscribe = AdaptiveLayoutEngine.subscribe(setMetrics);
    return () => {
      unsubscribe();
    };
  }, []);

  return useMemo(
    () => ({
      metrics,
      breakpoint: metrics.breakpoint,
      spacing: metrics.spacing,
      typography: metrics.typography,
      isTablet: metrics.isTablet,
      orientation: metrics.orientation,
      resolve: <T,>(value: ResponsiveValue<T> | T) => AdaptiveLayoutEngine.resolve(value),
      wp: (percentage: number) => AdaptiveLayoutEngine.wp(percentage),
      hp: (percentage: number) => AdaptiveLayoutEngine.hp(percentage),
      columns: (config?: Partial<Record<Breakpoint, number>>) => AdaptiveLayoutEngine.getColumns(config),
    }),
    [metrics]
  );
}

// ============================================
// useGlidePerformance
// ============================================
export interface UseGlidePerformanceReturn {
  capabilities: DeviceCapabilities;
  metrics: PerformanceMetrics;
  isLowPerformance: boolean;
  shouldReduceMotion: boolean;
  tier: DeviceCapabilities['tier'];
}

export function useGlidePerformance(enableMonitoring = false): UseGlidePerformanceReturn {
  const [capabilities] = useState(() => PerformanceMonitor.initialize());
  const [metrics, setMetrics] = useState(() => PerformanceMonitor.getMetrics());

  useEffect(() => {
    if (enableMonitoring) {
      PerformanceMonitor.startMonitoring();
      const unsubscribe = PerformanceMonitor.subscribe(setMetrics);
      return () => {
        unsubscribe();
        PerformanceMonitor.stopMonitoring();
      };
    }
    return undefined;
  }, [enableMonitoring]);

  return useMemo(
    () => ({
      capabilities,
      metrics,
      isLowPerformance: capabilities.tier === 'low' || metrics.fps < 30,
      shouldReduceMotion: PerformanceMonitor.shouldReduceAnimations(),
      tier: capabilities.tier,
    }),
    [capabilities, metrics]
  );
}

// ============================================
// useGlideAnimation
// ============================================
export interface UseGlideAnimationOptions extends AnimationOptions {
  initialValue?: number;
}

export interface UseGlideAnimationReturn {
  value: SharedValue<number>;
  animateTo: (toValue: number, options?: AnimationOptions) => void;
  spring: (toValue: number, preset?: AnimationPreset) => void;
  timing: (toValue: number, duration?: number) => void;
  reset: () => void;
}

export function useGlideAnimation(options: UseGlideAnimationOptions = {}): UseGlideAnimationReturn {
  const { initialValue = 0, preset = 'smooth' } = options;
  const value = useSharedValue(initialValue);

  const animateTo = useCallback(
    (toValue: number, animOptions?: AnimationOptions) => {
      value.value = AnimationPresets.spring(toValue, { preset, ...animOptions });
    },
    [value, preset]
  );

  const spring = useCallback(
    (toValue: number, springPreset: AnimationPreset = preset) => {
      value.value = AnimationPresets.spring(toValue, { preset: springPreset });
    },
    [value, preset]
  );

  const timing = useCallback(
    (toValue: number, duration = 300) => {
      value.value = AnimationPresets.timing(toValue, { duration });
    },
    [value]
  );

  const reset = useCallback(() => {
    value.value = withTiming(initialValue, { duration: 200 });
  }, [value, initialValue]);

  return { value, animateTo, spring, timing, reset };
}

// ============================================
// useGlideGesture
// ============================================
export interface UseGlideGestureOptions {
  onSwipe?: (data: SwipeGestureData) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enableHaptics?: boolean;
  snapPoints?: number[];
}

export interface UseGlideGestureReturn {
  gesture: ReturnType<typeof Gesture.Pan>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  isActive: SharedValue<boolean>;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useGlideGesture(options: UseGlideGestureOptions = {}): UseGlideGestureReturn {
  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enableHaptics = true,
    snapPoints,
  } = options;

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const handleSwipe = useCallback(
    (data: SwipeGestureData) => {
      onSwipe?.(data);

      if (enableHaptics && data.direction !== 'none') {
        HapticsController.gestureHaptic('swipe');
      }

      switch (data.direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }
    },
    [onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, enableHaptics]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          isActive.value = true;
        })
        .onUpdate((event) => {
          translationX.value = event.translationX;
          translationY.value = event.translationY;
        })
        .onEnd((event) => {
          isActive.value = false;
          const swipeData = GestureIntelligence.analyzeSwipe(
            event as GestureStateChangeEvent<PanGestureHandlerEventPayload>
          );
          runOnJS(handleSwipe)(swipeData);

          if (snapPoints && snapPoints.length > 0) {
            const snapX = GestureIntelligence.calculateSnapPoint(
              translationX.value,
              event.velocityX,
              snapPoints
            );
            translationX.value = withSpring(snapX, AnimationPresets.getSpringConfig('snappy'));
          } else {
            translationX.value = withSpring(0, AnimationPresets.getSpringConfig('smooth'));
          }
          translationY.value = withSpring(0, AnimationPresets.getSpringConfig('smooth'));
        }),
    [isActive, translationX, translationY, handleSwipe, snapPoints]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translationX.value }, { translateY: translationY.value }],
  }));

  return { gesture, translationX, translationY, isActive, animatedStyle };
}

// ============================================
// useGlidePress
// ============================================
export interface UseGlidePressOptions {
  scaleDown?: number;
  hapticType?: HapticFeedbackType;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export interface UseGlidePressReturn {
  gesture: ReturnType<typeof Gesture.Race>;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  isPressed: SharedValue<boolean>;
}

export function useGlidePress(options: UseGlidePressOptions = {}): UseGlidePressReturn {
  const { scaleDown = 0.96, hapticType = 'light', onPress, onLongPress, disabled = false } = options;

  const isPressed = useSharedValue(false);
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    if (disabled) return;
    HapticsController.trigger(hapticType);
    onPress?.();
  }, [disabled, hapticType, onPress]);

  const handleLongPress = useCallback(() => {
    if (disabled) return;
    HapticsController.trigger('medium');
    onLongPress?.();
  }, [disabled, onLongPress]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabled)
        .onBegin(() => {
          isPressed.value = true;
          scale.value = withSpring(scaleDown, AnimationPresets.getSpringConfig('snappy'));
        })
        .onFinalize(() => {
          isPressed.value = false;
          scale.value = withSpring(1, AnimationPresets.getSpringConfig('bounce'));
        })
        .onEnd(() => {
          runOnJS(handlePress)();
        }),
    [disabled, isPressed, scale, scaleDown, handlePress]
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(!disabled && !!onLongPress)
        .minDuration(500)
        .onStart(() => {
          runOnJS(handleLongPress)();
        }),
    [disabled, onLongPress, handleLongPress]
  );

  const gesture = useMemo(() => Gesture.Race(tapGesture, longPressGesture), [tapGesture, longPressGesture]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return { gesture, animatedStyle, isPressed };
}

// ============================================
// useGlideScroll
// ============================================
export interface UseGlideScrollOptions {
  enableHaptics?: boolean;
  hapticThreshold?: number;
}

export interface UseGlideScrollReturn {
  scrollY: SharedValue<number>;
  onScroll: (y: number) => void;
}

export function useGlideScroll(options: UseGlideScrollOptions = {}): UseGlideScrollReturn {
  const { enableHaptics = false, hapticThreshold = 100 } = options;
  const scrollY = useSharedValue(0);

  const onScroll = useCallback(
    (y: number) => {
      scrollY.value = y;
      if (enableHaptics) {
        HapticsController.scrollHaptic(y, hapticThreshold);
      }
    },
    [scrollY, enableHaptics, hapticThreshold]
  );

  return { scrollY, onScroll };
}

// ============================================
// useGlideHaptics
// ============================================
export interface UseGlideHapticsReturn {
  trigger: (type: HapticFeedbackType) => void;
  confirm: () => void;
  reject: () => void;
  warn: () => void;
  selection: () => void;
  isAvailable: boolean;
}

export function useGlideHaptics(): UseGlideHapticsReturn {
  useEffect(() => {
    HapticsController.initialize();
  }, []);

  const trigger = useCallback((type: HapticFeedbackType) => {
    HapticsController.trigger(type);
  }, []);

  const confirm = useCallback(() => {
    HapticsController.confirm();
  }, []);

  const reject = useCallback(() => {
    HapticsController.reject();
  }, []);

  const warn = useCallback(() => {
    HapticsController.warn();
  }, []);

  const selection = useCallback(() => {
    HapticsController.trigger('selection');
  }, []);

  return {
    trigger,
    confirm,
    reject,
    warn,
    selection,
    isAvailable: HapticsController.isAvailable(),
  };
}

// ============================================
// useGlideInterpolate
// ============================================
export function useGlideInterpolate(
  value: SharedValue<number>,
  inputRange: number[],
  outputRange: number[],
  extrapolation: Extrapolation = Extrapolation.CLAMP
): SharedValue<number> {
  return useDerivedValue(() => interpolate(value.value, inputRange, outputRange, extrapolation));
}