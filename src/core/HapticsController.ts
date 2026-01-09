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
  intensity?: number; // 0-1
  pattern?: number[]; // Custom vibration pattern for Android
}

// Types for the optional haptics libraries
type ImpactStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
type NotificationType = 'success' | 'warning' | 'error';

interface HapticsModule {
  impactAsync?: (style: ImpactStyle) => Promise<void>;
  notificationAsync?: (type: NotificationType) => Promise<void>;
  selectionAsync?: () => Promise<void>;
}

interface ReactNativeHapticsModule {
  trigger?: (type: string, options?: { enableVibrateFallback?: boolean; ignoreAndroidSystemSettings?: boolean }) => void;
}

class HapticsControllerClass {
  private enabled = true;
  private intensity = 1;
  private hapticsModule: HapticsModule | null = null;
  private rnHapticsModule: ReactNativeHapticsModule | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const capabilities = PerformanceMonitor.getCapabilities();
    this.enabled = capabilities.supportsHaptics;

    // Try to load haptics libraries (these are optional peer dependencies)
    try {
      if (Platform.OS === 'ios') {
        // Try expo-haptics first
        const expoHaptics = await import('expo-haptics').catch(() => null);
        if (expoHaptics) {
          this.hapticsModule = expoHaptics as HapticsModule;
          return;
        }
      }

      // Try react-native-haptic-feedback
      const rnHaptics = await import('react-native-haptic-feedback').catch(() => null);
      if (rnHaptics?.default) {
        this.rnHapticsModule = rnHaptics.default as ReactNativeHapticsModule;
      }
    } catch {
      // Haptics not available
      console.log('Haptics libraries not available');
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  isAvailable(): boolean {
    return (
      this.enabled &&
      (this.hapticsModule !== null || this.rnHapticsModule !== null)
    );
  }

  async trigger(type: HapticFeedbackType, options?: HapticOptions): Promise<void> {
    if (!this.enabled || (options?.enabled === false)) return;

    await this.initialize();

    // Adjust for intensity (skip light haptics at low intensity)
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
    const { impactAsync, notificationAsync, selectionAsync } = this.hapticsModule || {};

    switch (type) {
      case 'light':
      case 'soft':
        await impactAsync?.('light');
        break;
      case 'medium':
        await impactAsync?.('medium');
        break;
      case 'heavy':
      case 'rigid':
        await impactAsync?.('heavy');
        break;
      case 'success':
        await notificationAsync?.('success');
        break;
      case 'warning':
        await notificationAsync?.('warning');
        break;
      case 'error':
        await notificationAsync?.('error');
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

  // Contextual haptics based on gesture patterns
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

  // Progressive haptics (increases in intensity)
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

  // Scroll-based haptics (call this during scroll)
  private lastScrollHapticTime = 0;
  async scrollHaptic(
    offset: number,
    threshold = 100,
    minInterval = 100
  ): Promise<void> {
    const now = Date.now();
    if (now - this.lastScrollHapticTime < minInterval) return;

    if (Math.abs(offset) % threshold < 10) {
      await this.trigger('selection');
      this.lastScrollHapticTime = now;
    }
  }

  // Confirmation haptic pattern
  async confirm(): Promise<void> {
    await this.trigger('success');
  }

  // Rejection haptic pattern
  async reject(): Promise<void> {
    await this.trigger('error');
  }

  // Warning haptic pattern
  async warn(): Promise<void> {
    await this.trigger('warning');
  }
}

export const HapticsController = new HapticsControllerClass();
