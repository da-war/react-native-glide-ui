import { PerformanceMonitor, SpringConfig } from './PerformanceMonitor';
import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  WithSpringConfig,
  WithTimingConfig,
  runOnJS,
} from 'react-native-reanimated';

export type AnimationPreset =
  | 'bounce'
  | 'smooth'
  | 'snappy'
  | 'gentle'
  | 'elastic'
  | 'stiff'
  | 'molasses'
  | 'swift';

export type EasingPreset =
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'linear'
  | 'bounce'
  | 'elastic'
  | 'back';

export interface AnimationOptions {
  duration?: number;
  delay?: number;
  preset?: AnimationPreset;
  easing?: EasingPreset;
  onComplete?: () => void;
  adaptive?: boolean;
}

interface SpringPresetConfig extends WithSpringConfig {
  name: AnimationPreset;
}

const SPRING_PRESETS: Record<AnimationPreset, Omit<SpringPresetConfig, 'name'>> = {
  bounce: {
    damping: 8,
    stiffness: 200,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  smooth: {
    damping: 20,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  snappy: {
    damping: 15,
    stiffness: 400,
    mass: 0.5,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  gentle: {
    damping: 25,
    stiffness: 100,
    mass: 1.2,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  elastic: {
    damping: 5,
    stiffness: 300,
    mass: 0.6,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  stiff: {
    damping: 30,
    stiffness: 500,
    mass: 0.3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  molasses: {
    damping: 40,
    stiffness: 50,
    mass: 2,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  swift: {
    damping: 18,
    stiffness: 350,
    mass: 0.4,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

const EASING_FUNCTIONS: Record<EasingPreset, (t: number) => number> = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
  back: Easing.back(1.5),
};

class AnimationPresetsClass {
  private adaptiveEnabled = true;

  setAdaptive(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
  }

  // Get spring config with automatic adaptation
  getSpringConfig(preset: AnimationPreset, adaptive = true): WithSpringConfig {
    const baseConfig = SPRING_PRESETS[preset];
    
    if (!adaptive || !this.adaptiveEnabled) {
      return baseConfig;
    }

    const shouldReduce = PerformanceMonitor.shouldReduceAnimations();
    const capabilities = PerformanceMonitor.getCapabilities();

    if (shouldReduce) {
      return {
        ...baseConfig,
        damping: (baseConfig.damping || 10) + 10,
        stiffness: (baseConfig.stiffness || 100) * 0.7,
        overshootClamping: true,
      };
    }

    // Enhance animations on high-end devices
    if (capabilities.tier === 'ultra' || capabilities.tier === 'high') {
      return {
        ...baseConfig,
        damping: (baseConfig.damping || 10) * 0.9,
        stiffness: (baseConfig.stiffness || 100) * 1.1,
      };
    }

    return baseConfig;
  }

  // Create spring animation
  spring(
    toValue: number,
    options: AnimationOptions = {}
  ) {
    const preset = options.preset || 'smooth';
    const config = this.getSpringConfig(preset, options.adaptive ?? true);

    let animation = withSpring(toValue, config, (finished) => {
      if (finished && options.onComplete) {
        runOnJS(options.onComplete)();
      }
    });

    if (options.delay) {
      animation = withDelay(options.delay, animation);
    }

    return animation;
  }

  // Create timing animation
  timing(
    toValue: number,
    options: AnimationOptions = {}
  ) {
    const baseDuration = options.duration || 300;
    const easing = options.easing || 'easeOut';
    const adaptive = options.adaptive ?? true;

    let duration = baseDuration;
    if (adaptive && this.adaptiveEnabled) {
      duration = PerformanceMonitor.getAdaptiveDuration(baseDuration);
    }

    const config: WithTimingConfig = {
      duration,
      easing: EASING_FUNCTIONS[easing],
    };

    let animation = withTiming(toValue, config, (finished) => {
      if (finished && options.onComplete) {
        runOnJS(options.onComplete)();
      }
    });

    if (options.delay) {
      animation = withDelay(options.delay, animation);
    }

    return animation;
  }

  // Create a sequence of animations
  sequence(animations: ReturnType<typeof withSpring | typeof withTiming>[]) {
    return withSequence(...animations);
  }

  // Common animation patterns
  patterns = {
    fadeIn: (options?: AnimationOptions) => ({
      opacity: this.timing(1, { duration: 200, easing: 'easeOut', ...options }),
    }),

    fadeOut: (options?: AnimationOptions) => ({
      opacity: this.timing(0, { duration: 200, easing: 'easeIn', ...options }),
    }),

    scaleIn: (options?: AnimationOptions) => ({
      transform: [{ scale: this.spring(1, { preset: 'snappy', ...options }) }],
    }),

    scaleOut: (options?: AnimationOptions) => ({
      transform: [{ scale: this.timing(0, { duration: 150, easing: 'easeIn', ...options }) }],
    }),

    slideInUp: (distance: number, options?: AnimationOptions) => ({
      transform: [{ translateY: this.spring(0, { preset: 'smooth', ...options }) }],
    }),

    slideInDown: (distance: number, options?: AnimationOptions) => ({
      transform: [{ translateY: this.spring(0, { preset: 'smooth', ...options }) }],
    }),

    slideInLeft: (distance: number, options?: AnimationOptions) => ({
      transform: [{ translateX: this.spring(0, { preset: 'smooth', ...options }) }],
    }),

    slideInRight: (distance: number, options?: AnimationOptions) => ({
      transform: [{ translateX: this.spring(0, { preset: 'smooth', ...options }) }],
    }),

    bounce: (options?: AnimationOptions) => ({
      transform: [
        {
          scale: this.sequence([
            withSpring(1.1, { damping: 5, stiffness: 400 }),
            withSpring(1, { damping: 8, stiffness: 200 }),
          ]),
        },
      ],
    }),

    shake: (intensity = 10, options?: AnimationOptions) => ({
      transform: [
        {
          translateX: this.sequence([
            withTiming(intensity, { duration: 50 }),
            withTiming(-intensity, { duration: 50 }),
            withTiming(intensity, { duration: 50 }),
            withTiming(-intensity, { duration: 50 }),
            withTiming(0, { duration: 50 }),
          ]),
        },
      ],
    }),

    pulse: (options?: AnimationOptions) => ({
      transform: [
        {
          scale: this.sequence([
            withTiming(1.05, { duration: 150, easing: Easing.ease }),
            withTiming(1, { duration: 150, easing: Easing.ease }),
          ]),
        },
      ],
    }),

    rubberBand: (options?: AnimationOptions) => ({
      transform: [
        {
          scaleX: this.sequence([
            withTiming(1.25, { duration: 100 }),
            withTiming(0.75, { duration: 100 }),
            withTiming(1.15, { duration: 100 }),
            withTiming(0.95, { duration: 100 }),
            withSpring(1, { damping: 10, stiffness: 200 }),
          ]),
        },
        {
          scaleY: this.sequence([
            withTiming(0.75, { duration: 100 }),
            withTiming(1.25, { duration: 100 }),
            withTiming(0.85, { duration: 100 }),
            withTiming(1.05, { duration: 100 }),
            withSpring(1, { damping: 10, stiffness: 200 }),
          ]),
        },
      ],
    }),
  };

  // Get velocity-based duration (slower animations for faster gestures feel more responsive)
  getVelocityBasedDuration(velocity: number, baseDuration: number, minDuration = 100): number {
    const absVelocity = Math.abs(velocity);
    const factor = Math.max(0.3, 1 - absVelocity / 3000);
    return Math.max(minDuration, baseDuration * factor);
  }

  // Get velocity-based spring config
  getVelocityBasedSpring(
    velocity: number,
    preset: AnimationPreset = 'smooth'
  ): WithSpringConfig {
    const baseConfig = this.getSpringConfig(preset);
    const absVelocity = Math.abs(velocity);

    // Higher velocity = stiffer spring
    const stiffnessMultiplier = 1 + Math.min(0.5, absVelocity / 2000);
    const dampingMultiplier = 1 + Math.min(0.3, absVelocity / 3000);

    return {
      ...baseConfig,
      stiffness: (baseConfig.stiffness || 100) * stiffnessMultiplier,
      damping: (baseConfig.damping || 10) * dampingMultiplier,
      velocity,
    };
  }
}

export const AnimationPresets = new AnimationPresetsClass();
