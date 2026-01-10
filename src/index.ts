// Core Systems
export { PerformanceMonitor } from './core/PerformanceMonitor';
export type { DeviceCapabilities, PerformanceMetrics, SpringConfig } from './core/PerformanceMonitor';

export { AdaptiveLayoutEngine } from './core/AdaptiveLayoutEngine';
export type { LayoutMetrics, ResponsiveValue, Breakpoint, BreakpointConfig, SpacingScale, TypographyScale } from './core/AdaptiveLayoutEngine';

export { GestureIntelligence } from './core/GestureIntelligence';
export type { SwipeGestureData, GestureDirection, GestureConfig, GestureAnalytics } from './core/GestureIntelligence';

export { AnimationPresets } from './core/AnimationPresets';
export type { AnimationPreset, AnimationOptions, EasingPreset } from './core/AnimationPresets';

export { HapticsController } from './core/HapticsController';
export type { HapticFeedbackType, HapticPattern } from './core/HapticsController';

// Hooks
export {
  useGlideLayout,
  useGlidePerformance,
  useGlideAnimation,
  useGlideScale,
  useGlideScroll,
  useGlideHaptics,
  useGlideInterpolate,
} from './hooks';

export type {
  UseGlideLayoutReturn,
  UseGlidePerformanceReturn,
  UseGlideAnimationReturn,
  UseGlideAnimationOptions,
  UseGlideScaleReturn,
  UseGlideScrollOptions,
  UseGlideScrollReturn,
  UseGlideHapticsReturn,
} from './hooks';

// Components
export { GlideProvider, useGlide, useGlideOptional } from './components/GlideProvider';
export type { GlideConfig, GlideContextValue, GlideProviderProps } from './components/GlideProvider';

export { GlideView } from './components/GlideView';
export type { GlideViewProps, EnterAnimation, ExitAnimation } from './components/GlideView';

export { GlideButton } from './components/GlideButton';
export type { GlideButtonProps, ButtonVariant, ButtonSize } from './components/GlideButton';

export { GlideText } from './components/GlideText';
export type { GlideTextProps, TextVariant } from './components/GlideText';

export { GlideCard } from './components/GlideCard';
export type { GlideCardProps } from './components/GlideCard';