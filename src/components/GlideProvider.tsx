import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { PerformanceMonitor, DeviceCapabilities } from '../core/PerformanceMonitor';
import { AdaptiveLayoutEngine, LayoutMetrics, BreakpointConfig } from '../core/AdaptiveLayoutEngine';
import { GestureIntelligence, GestureConfig } from '../core/GestureIntelligence';
import { HapticsController } from '../core/HapticsController';

export interface GlideConfig {
  breakpoints?: Partial<BreakpointConfig>;
  gestures?: Partial<GestureConfig>;
  haptics?: {
    enabled?: boolean;
    intensity?: number;
  };
  performance?: {
    enableMonitoring?: boolean;
    adaptiveAnimations?: boolean;
  };
}

export interface GlideContextValue {
  capabilities: DeviceCapabilities;
  layout: LayoutMetrics;
  isReady: boolean;
  config: GlideConfig;
}

const GlideContext = createContext<GlideContextValue | null>(null);

export interface GlideProviderProps {
  children: ReactNode;
  config?: GlideConfig;
}

export function GlideProvider({ children, config = {} }: GlideProviderProps): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [layout, setLayout] = useState<LayoutMetrics | null>(null);

  useEffect(() => {
    // Initialize all systems
    const init = async () => {
      // Performance Monitor
      const caps = PerformanceMonitor.initialize();
      setCapabilities(caps);

      if (config.performance?.enableMonitoring) {
        PerformanceMonitor.startMonitoring();
      }

      // Adaptive Layout
      AdaptiveLayoutEngine.initialize(config.breakpoints);
      setLayout(AdaptiveLayoutEngine.getMetrics());

      // Gesture Intelligence
      if (config.gestures) {
        GestureIntelligence.configure(config.gestures);
      }

      // Haptics
      if (config.haptics?.enabled !== false) {
        await HapticsController.initialize();
        if (config.haptics?.intensity !== undefined) {
          HapticsController.setIntensity(config.haptics.intensity);
        }
      }

      setIsReady(true);
    };

    init();

    // Subscribe to layout changes
    const unsubscribeLayout = AdaptiveLayoutEngine.subscribe(setLayout);

    return () => {
      unsubscribeLayout();
      if (config.performance?.enableMonitoring) {
        PerformanceMonitor.stopMonitoring();
      }
      AdaptiveLayoutEngine.destroy();
    };
  }, [config]);

  const contextValue = useMemo<GlideContextValue | null>(() => {
    if (!capabilities || !layout) return null;
    return {
      capabilities,
      layout,
      isReady,
      config,
    };
  }, [capabilities, layout, isReady, config]);

  if (!contextValue) {
    return <GestureHandlerRootView style={styles.container}>{children}</GestureHandlerRootView>;
  }

  return (
    <GlideContext.Provider value={contextValue}>
      <GestureHandlerRootView style={styles.container}>
        {children}
      </GestureHandlerRootView>
    </GlideContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export function useGlide(): GlideContextValue {
  const context = useContext(GlideContext);
  if (!context) {
    throw new Error('useGlide must be used within a GlideProvider');
  }
  return context;
}

export function useGlideOptional(): GlideContextValue | null {
  return useContext(GlideContext);
}
