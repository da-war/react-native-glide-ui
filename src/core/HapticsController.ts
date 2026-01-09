import { Platform } from 'react-native';
import { PerformanceMonitor } from './PerformanceMonitor';

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export type HapticPattern = 'tap' | 'doubleTap' | 'swipe' | 'scroll' | 'notification' | 'custom';

interface HapticOptions {
  enabled?: boolean;
  intensity?: number;
}

class HapticsControllerClass {
  private enabled = true;
  private intensity = 1;
  private hapticsModule: any = null;
  private rnHapticsModule: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const capabilities = PerformanceMonitor.getCapabilities();
    this.enabled = capabilities.supportsHaptics;

    // Dynamic imports wrapped to avoid TypeScript module errors
    if (Platform.OS === 'ios') {
      try {
        // @ts-ignore - expo-haptics is an optional dependency
        this.hapticsModule = await import('expo-haptics');
        return;
      } catch {
        // expo-haptics not available
      }
    }

    try {
      // @ts-ignore - react-native-haptic-feedback is an optional dependency
      const rnHaptics = await import('react-native-haptic-feedback');
      this.rnHapticsModule = rnHaptics?.default || rnHaptics;
    } catch {
      // react-native-haptic-feedback not available
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  isAvailable(): boolean {
    return this.enabled && (this.hapticsModule !== null || this.rnHapticsModule !== null);
  }

  async trigger(type: HapticFeedbackType, options?: HapticOptions): Promise<void> {
    if (!this.enabled || options?.enabled === false) return;

    await this.initialize();

    const effectiveIntensity = (options?.intensity ?? 1) * this.intensity;
    if (effectiveIntensity < 0.3 && (type === 'light' || type === 'soft' || type === 'selection')) {
      return;
    }

    try {
      if (this.hapticsModule) {
        await this.triggerExpoHaptics(type);
      } else if (this.rnHapticsModule) {
        this.triggerRNHaptics(type);
      }
    } catch {
      // Silently fail - haptics are enhancement, not critical
    }
  }

  private async triggerExpoHaptics(type: HapticFeedbackType): Promise<void> {
    if (!this.hapticsModule) return;

    const { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType } =
      this.hapticsModule;

    switch (type) {
      case 'light':
      case 'soft':
        await impactAsync?.(ImpactFeedbackStyle?.Light);
        break;
      case 'medium':
        await impactAsync?.(ImpactFeedbackStyle?.Medium);
        break;
      case 'heavy':
      case 'rigid':
        await impactAsync?.(ImpactFeedbackStyle?.Heavy);
        break;
      case 'success':
        await notificationAsync?.(NotificationFeedbackType?.Success);
        break;
      case 'warning':
        await notificationAsync?.(NotificationFeedbackType?.Warning);
        break;
      case 'error':
        await notificationAsync?.(NotificationFeedbackType?.Error);
        break;
      case 'selection':
        await selectionAsync?.();
        break;
    }
  }

  private triggerRNHaptics(type: HapticFeedbackType): void {
    if (!this.rnHapticsModule?.trigger) return;

    const typeMapping: Record<HapticFeedbackType, string> = {
      light: 'impactLight',
      medium: 'impactMedium',
      heavy: 'impactHeavy',
      soft: 'soft',
      rigid: 'rigid',
      success: 'notificationSuccess',
      warning: 'notificationWarning',
      error: 'notificationError',
      selection: 'selection',
    };

    this.rnHapticsModule.trigger(typeMapping[type], {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  }

  async gestureHaptic(pattern: HapticPattern): Promise<void> {
    const mappings: Record<HapticPattern, HapticFeedbackType> = {
      tap: 'light',
      doubleTap: 'medium',
      swipe: 'soft',
      scroll: 'selection',
      notification: 'success',
      custom: 'medium',
    };

    await this.trigger(mappings[pattern]);
  }

  async progressive(
    steps: number,
    interval: number,
    startType: HapticFeedbackType = 'light',
    endType: HapticFeedbackType = 'heavy'
  ): Promise<void> {
    const types: HapticFeedbackType[] = ['light', 'soft', 'medium', 'rigid', 'heavy'];
    const startIndex = types.indexOf(startType);
    const endIndex = types.indexOf(endType);

    for (let i = 0; i < steps; i++) {
      const progress = i / (steps - 1);
      const typeIndex = Math.round(startIndex + (endIndex - startIndex) * progress);
      await this.trigger(types[typeIndex]);
      if (i < steps - 1) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
  }

  private lastScrollHapticTime = 0;
  async scrollHaptic(offset: number, threshold = 100, minInterval = 100): Promise<void> {
    const now = Date.now();
    if (now - this.lastScrollHapticTime < minInterval) return;

    if (Math.abs(offset) % threshold < 10) {
      await this.trigger('selection');
      this.lastScrollHapticTime = now;
    }
  }

  async confirm(): Promise<void> {
    await this.trigger('success');
  }

  async reject(): Promise<void> {
    await this.trigger('error');
  }

  async warn(): Promise<void> {
    await this.trigger('warning');
  }
}

export const HapticsController = new HapticsControllerClass();