import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';

import { PerformanceMonitor, DeviceCapabilities, PerformanceMetrics } from '../core/PerformanceMonitor';
import { AdaptiveLayoutEngine, LayoutMetrics, ResponsiveValue, Breakpoint } from '../core/AdaptiveLayoutEngine';
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
  const initialized = useRef(false);

  const [metrics, setMetrics] = useState<LayoutMetrics>(() => {
    if (!initialized.current) {
      initialized.current = true;
      AdaptiveLayoutEngine.initialize();
    }
    return AdaptiveLayoutEngine.getMetrics();
  });

  useEffect(() => {
    const unsubscribe = AdaptiveLayoutEngine.subscribe((newMetrics) => {
      setMetrics((prev) => {
        if (
          prev.width !== newMetrics.width ||
          prev.height !== newMetrics.height ||
          prev.breakpoint !== newMetrics.breakpoint
        ) {
          return newMetrics;
        }
        return prev;
      });
    });

    return unsubscribe;
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
// useGlideScale (for press animations)
// ============================================
export interface UseGlideScaleReturn {
  scale: SharedValue<number>;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
}

export function useGlideScale(scaleDown = 0.96): UseGlideScaleReturn {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, AnimationPresets.getSpringConfig('snappy'));
  }, [scale, scaleDown]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, AnimationPresets.getSpringConfig('bounce'));
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { scale, animatedStyle, onPressIn, onPressOut };
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
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      HapticsController.initialize();
    }
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