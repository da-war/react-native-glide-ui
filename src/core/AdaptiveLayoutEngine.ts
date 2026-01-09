import { Dimensions, ScaledSize } from 'react-native';
import { PerformanceMonitor, DeviceCapabilities } from './PerformanceMonitor';

export interface BreakpointConfig {
  xs: number;  // 0-359
  sm: number;  // 360-479
  md: number;  // 480-767
  lg: number;  // 768-1023
  xl: number;  // 1024-1279
  xxl: number; // 1280+
}

export type Breakpoint = keyof BreakpointConfig;

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  xxl?: T;
  base?: T;
}

export interface LayoutMetrics {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  orientation: 'portrait' | 'landscape';
  isTablet: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  spacing: SpacingScale;
  typography: TypographyScale;
}

export interface SpacingScale {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface TypographyScale {
  caption: number;
  body2: number;
  body1: number;
  subtitle: number;
  title: number;
  h3: number;
  h2: number;
  h1: number;
}

type LayoutListener = (metrics: LayoutMetrics) => void;

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  xs: 0,
  sm: 360,
  md: 480,
  lg: 768,
  xl: 1024,
  xxl: 1280,
};

class AdaptiveLayoutEngineClass {
  private breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS;
  private listeners: Set<LayoutListener> = new Set();
  private currentMetrics: LayoutMetrics | null = null;
  private dimensionSubscription: ReturnType<typeof Dimensions.addEventListener> | null = null;

  initialize(customBreakpoints?: Partial<BreakpointConfig>): void {
    if (customBreakpoints) {
      this.breakpoints = { ...DEFAULT_BREAKPOINTS, ...customBreakpoints };
    }
    this.updateMetrics(Dimensions.get('window'));
    this.dimensionSubscription = Dimensions.addEventListener('change', this.handleDimensionChange);
  }

  destroy(): void {
    this.dimensionSubscription?.remove();
    this.listeners.clear();
  }

  private handleDimensionChange = ({ window }: { window: ScaledSize }): void => {
    this.updateMetrics(window);
  };

  private updateMetrics(window: ScaledSize): void {
    const capabilities = PerformanceMonitor.getCapabilities();
    const breakpoint = this.getBreakpoint(window.width);
    const isTablet = this.detectTablet(window, capabilities);
    
    this.currentMetrics = {
      width: window.width,
      height: window.height,
      breakpoint,
      orientation: window.width > window.height ? 'landscape' : 'portrait',
      isTablet,
      safeAreaInsets: this.getDefaultSafeArea(capabilities),
      spacing: this.calculateSpacing(breakpoint, isTablet),
      typography: this.calculateTypography(breakpoint, isTablet, capabilities),
    };

    this.notifyListeners();
  }

  private getBreakpoint(width: number): Breakpoint {
    if (width >= this.breakpoints.xxl) return 'xxl';
    if (width >= this.breakpoints.xl) return 'xl';
    if (width >= this.breakpoints.lg) return 'lg';
    if (width >= this.breakpoints.md) return 'md';
    if (width >= this.breakpoints.sm) return 'sm';
    return 'xs';
  }

  private detectTablet(window: ScaledSize, capabilities: DeviceCapabilities): boolean {
    const diagonal = Math.sqrt(window.width ** 2 + window.height ** 2);
    const inches = diagonal / (capabilities.screenDensity * 160);
    return inches >= 7;
  }

  private getDefaultSafeArea(capabilities: DeviceCapabilities) {
    // Conservative defaults, should be overridden by SafeAreaProvider
    return {
      top: capabilities.tier === 'ultra' ? 47 : 20,
      bottom: capabilities.tier === 'ultra' ? 34 : 0,
      left: 0,
      right: 0,
    };
  }

  private calculateSpacing(breakpoint: Breakpoint, isTablet: boolean): SpacingScale {
    const baseUnit = isTablet ? 10 : 8;
    const multipliers = {
      xs: { xxs: 0.25, xs: 0.5, sm: 1, md: 1.5, lg: 2, xl: 3, xxl: 4 },
      sm: { xxs: 0.25, xs: 0.5, sm: 1, md: 1.5, lg: 2, xl: 3, xxl: 4 },
      md: { xxs: 0.5, xs: 0.75, sm: 1, md: 1.5, lg: 2.5, xl: 3.5, xxl: 5 },
      lg: { xxs: 0.5, xs: 1, sm: 1.5, md: 2, lg: 3, xl: 4, xxl: 6 },
      xl: { xxs: 0.5, xs: 1, sm: 1.5, md: 2, lg: 3, xl: 4.5, xxl: 6.5 },
      xxl: { xxs: 0.5, xs: 1, sm: 2, md: 2.5, lg: 3.5, xl: 5, xxl: 7 },
    };

    const m = multipliers[breakpoint];
    return {
      xxs: Math.round(baseUnit * m.xxs),
      xs: Math.round(baseUnit * m.xs),
      sm: Math.round(baseUnit * m.sm),
      md: Math.round(baseUnit * m.md),
      lg: Math.round(baseUnit * m.lg),
      xl: Math.round(baseUnit * m.xl),
      xxl: Math.round(baseUnit * m.xxl),
    };
  }

  private calculateTypography(
    breakpoint: Breakpoint,
    isTablet: boolean,
    capabilities: DeviceCapabilities
  ): TypographyScale {
    const baseFontSize = isTablet ? 18 : 16;
    
    // Adjust for screen density
    const densityFactor = capabilities.screenDensity > 3 ? 1.05 : 1;

    const scales = {
      xs: { caption: 0.65, body2: 0.75, body1: 0.875, subtitle: 1, title: 1.125, h3: 1.25, h2: 1.5, h1: 1.75 },
      sm: { caption: 0.7, body2: 0.8, body1: 0.9, subtitle: 1, title: 1.15, h3: 1.3, h2: 1.6, h1: 1.9 },
      md: { caption: 0.75, body2: 0.85, body1: 1, subtitle: 1.1, title: 1.25, h3: 1.5, h2: 1.75, h1: 2.1 },
      lg: { caption: 0.75, body2: 0.875, body1: 1, subtitle: 1.15, title: 1.35, h3: 1.6, h2: 2, h1: 2.5 },
      xl: { caption: 0.8, body2: 0.9, body1: 1, subtitle: 1.2, title: 1.4, h3: 1.75, h2: 2.25, h1: 2.75 },
      xxl: { caption: 0.8, body2: 0.9, body1: 1.05, subtitle: 1.25, title: 1.5, h3: 1.9, h2: 2.5, h1: 3 },
    };

    const s = scales[breakpoint];
    return {
      caption: Math.round(baseFontSize * s.caption * densityFactor),
      body2: Math.round(baseFontSize * s.body2 * densityFactor),
      body1: Math.round(baseFontSize * s.body1 * densityFactor),
      subtitle: Math.round(baseFontSize * s.subtitle * densityFactor),
      title: Math.round(baseFontSize * s.title * densityFactor),
      h3: Math.round(baseFontSize * s.h3 * densityFactor),
      h2: Math.round(baseFontSize * s.h2 * densityFactor),
      h1: Math.round(baseFontSize * s.h1 * densityFactor),
    };
  }

  private notifyListeners(): void {
    if (!this.currentMetrics) return;
    this.listeners.forEach((listener) => listener(this.currentMetrics!));
  }

  subscribe(listener: LayoutListener): () => void {
    this.listeners.add(listener);
    if (this.currentMetrics) {
      listener(this.currentMetrics);
    }
    return () => this.listeners.delete(listener);
  }

  getMetrics(): LayoutMetrics {
    if (!this.currentMetrics) {
      this.updateMetrics(Dimensions.get('window'));
    }
    return this.currentMetrics!;
  }

  // Responsive value resolver
  resolve<T>(value: ResponsiveValue<T> | T): T {
    if (typeof value !== 'object' || value === null) {
      return value as T;
    }

    const responsiveValue = value as ResponsiveValue<T>;
    const metrics = this.getMetrics();
    const breakpointOrder: Breakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = breakpointOrder.indexOf(metrics.breakpoint);

    // Find the value for current breakpoint or the nearest smaller one
    for (let i = currentIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (responsiveValue[bp] !== undefined) {
        return responsiveValue[bp] as T;
      }
    }

    // Fall back to base or return undefined-safe default
    return responsiveValue.base as T;
  }

  // Utility functions for responsive calculations
  wp(percentage: number): number {
    return Math.round((this.getMetrics().width * percentage) / 100);
  }

  hp(percentage: number): number {
    return Math.round((this.getMetrics().height * percentage) / 100);
  }

  // Calculate columns based on breakpoint
  getColumns(config?: Partial<Record<Breakpoint, number>>): number {
    const defaults: Record<Breakpoint, number> = {
      xs: 1,
      sm: 2,
      md: 2,
      lg: 3,
      xl: 4,
      xxl: 6,
    };

    const merged = { ...defaults, ...config };
    return merged[this.getMetrics().breakpoint];
  }
}

export const AdaptiveLayoutEngine = new AdaptiveLayoutEngineClass();
