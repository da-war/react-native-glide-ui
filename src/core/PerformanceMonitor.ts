import { Platform, Dimensions, PixelRatio } from 'react-native';

export interface DeviceCapabilities {
  tier: 'low' | 'mid' | 'high' | 'ultra';
  screenDensity: number;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  refreshRate: number;
  memoryClass: 'low' | 'standard' | 'high';
  supportsHaptics: boolean;
  supportsBlur: boolean;
  maxConcurrentAnimations: number;
  recommendedAnimationDuration: number;
  recommendedSpringConfig: SpringConfig;
}

export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
  overshootClamping: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  jankScore: number;
  memoryUsage: number;
  lastMeasuredAt: number;
}

type PerformanceListener = (metrics: PerformanceMetrics) => void;

class PerformanceMonitorClass {
  private capabilities: DeviceCapabilities | null = null;
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameDrops: 0,
    jankScore: 0,
    memoryUsage: 0,
    lastMeasuredAt: Date.now(),
  };
  private listeners: Set<PerformanceListener> = new Set();
  private frameTimestamps: number[] = [];
  private isMonitoring = false;
  private animationFrameId: number | null = null;

  initialize(): DeviceCapabilities {
    if (this.capabilities) return this.capabilities;

    const { width, height } = Dimensions.get('window');
    const screenDensity = PixelRatio.get();
    const screenPixels = width * height * screenDensity * screenDensity;

    let tier: DeviceCapabilities['tier'] = 'mid';
    let memoryClass: DeviceCapabilities['memoryClass'] = 'standard';

    if (screenPixels > 4000000) {
      tier = Platform.OS === 'ios' ? 'ultra' : 'high';
      memoryClass = 'high';
    } else if (screenPixels > 2000000) {
      tier = 'high';
      memoryClass = 'high';
    } else if (screenPixels < 1000000) {
      tier = 'low';
      memoryClass = 'low';
    }

    const diagonal = Math.sqrt(width * width + height * height);
    let screenSize: DeviceCapabilities['screenSize'] = 'medium';
    if (diagonal < 500) screenSize = 'small';
    else if (diagonal < 700) screenSize = 'medium';
    else if (diagonal < 900) screenSize = 'large';
    else screenSize = 'xlarge';

    const refreshRate = Platform.OS === 'ios' && tier === 'ultra' ? 120 : 60;

    const platformVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
    const supportsHaptics = Platform.OS === 'ios' || platformVersion >= 26;
    const supportsBlur = Platform.OS === 'ios' || platformVersion >= 31;

    const performanceConfig = this.getPerformanceConfig(tier);

    this.capabilities = {
      tier,
      screenDensity,
      screenSize,
      refreshRate,
      memoryClass,
      supportsHaptics,
      supportsBlur,
      ...performanceConfig,
    };

    return this.capabilities;
  }

  private getPerformanceConfig(tier: DeviceCapabilities['tier']) {
    const configs = {
      low: {
        maxConcurrentAnimations: 2,
        recommendedAnimationDuration: 350,
        recommendedSpringConfig: {
          damping: 20,
          stiffness: 100,
          mass: 1,
          overshootClamping: true,
        },
      },
      mid: {
        maxConcurrentAnimations: 4,
        recommendedAnimationDuration: 300,
        recommendedSpringConfig: {
          damping: 15,
          stiffness: 150,
          mass: 1,
          overshootClamping: false,
        },
      },
      high: {
        maxConcurrentAnimations: 8,
        recommendedAnimationDuration: 250,
        recommendedSpringConfig: {
          damping: 12,
          stiffness: 200,
          mass: 0.8,
          overshootClamping: false,
        },
      },
      ultra: {
        maxConcurrentAnimations: 16,
        recommendedAnimationDuration: 200,
        recommendedSpringConfig: {
          damping: 10,
          stiffness: 250,
          mass: 0.6,
          overshootClamping: false,
        },
      },
    };

    return configs[tier];
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.measureFrame();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private measureFrame = (): void => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameTimestamps.push(now);

    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
    }

    if (this.frameTimestamps.length >= 30) {
      const oldestTimestamp = this.frameTimestamps[0];
      const newestTimestamp = this.frameTimestamps[this.frameTimestamps.length - 1];
      const duration = newestTimestamp - oldestTimestamp;
      const fps = Math.round((this.frameTimestamps.length - 1) / (duration / 1000));

      const expectedFrameTime = 1000 / (this.capabilities?.refreshRate || 60);
      let frameDrops = 0;
      for (let i = 1; i < this.frameTimestamps.length; i++) {
        const frameTime = this.frameTimestamps[i] - this.frameTimestamps[i - 1];
        if (frameTime > expectedFrameTime * 1.5) {
          frameDrops++;
        }
      }

      const jankScore = Math.min(100, Math.round((frameDrops / this.frameTimestamps.length) * 100 * 5));

      this.metrics = {
        fps,
        frameDrops,
        jankScore,
        memoryUsage: this.metrics.memoryUsage,
        lastMeasuredAt: now,
      };

      this.notifyListeners();
    }

    this.animationFrameId = requestAnimationFrame(this.measureFrame);
  };

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.metrics));
  }

  subscribe(listener: PerformanceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCapabilities(): DeviceCapabilities {
    if (!this.capabilities) {
      return this.initialize();
    }
    return this.capabilities;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  shouldReduceAnimations(): boolean {
    return this.metrics.jankScore > 30 || this.metrics.fps < 45;
  }

  getAdaptiveSpringConfig(): SpringConfig {
    const capabilities = this.getCapabilities();
    const baseConfig = capabilities.recommendedSpringConfig;

    if (this.shouldReduceAnimations()) {
      return {
        ...baseConfig,
        damping: baseConfig.damping + 5,
        stiffness: baseConfig.stiffness - 30,
        overshootClamping: true,
      };
    }

    return baseConfig;
  }

  getAdaptiveDuration(baseDuration: number): number {
    if (this.shouldReduceAnimations()) {
      return baseDuration * 0.7;
    }
    return baseDuration;
  }
}

export const PerformanceMonitor = new PerformanceMonitorClass();