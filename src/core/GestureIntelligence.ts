import { Platform } from 'react-native';
import {
  GestureStateChangeEvent,
  PanGestureHandlerEventPayload,
  TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

export type GestureDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface SwipeGestureData {
  direction: GestureDirection;
  velocity: number;
  distance: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface GestureConfig {
  swipeThreshold: number;
  swipeVelocityThreshold: number;
  doubleTapDelay: number;
  longPressDelay: number;
  panThreshold: number;
}

export interface GestureAnalytics {
  totalGestures: number;
  swipes: Record<GestureDirection, number>;
  averageSwipeVelocity: number;
  preferredDirection: GestureDirection | null;
  tapAccuracy: number;
}

const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  swipeVelocityThreshold: 500,
  doubleTapDelay: 300,
  longPressDelay: Platform.OS === 'ios' ? 500 : 400,
  panThreshold: 10,
};

class GestureIntelligenceClass {
  private config: GestureConfig = DEFAULT_CONFIG;
  private analytics: GestureAnalytics = {
    totalGestures: 0,
    swipes: { up: 0, down: 0, left: 0, right: 0, none: 0 },
    averageSwipeVelocity: 0,
    preferredDirection: null,
    tapAccuracy: 1,
  };
  private velocityHistory: number[] = [];
  private lastTapTime = 0;
  private lastTapPosition = { x: 0, y: 0 };

  configure(customConfig: Partial<GestureConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  getConfig(): GestureConfig {
    return { ...this.config };
  }

  // Analyze pan gesture and determine swipe
  analyzeSwipe(
    event: GestureStateChangeEvent<PanGestureHandlerEventPayload>
  ): SwipeGestureData {
    const { translationX, translationY, velocityX, velocityY } = event;
    
    const absX = Math.abs(translationX);
    const absY = Math.abs(translationY);
    const absVelX = Math.abs(velocityX);
    const absVelY = Math.abs(velocityY);

    let direction: GestureDirection = 'none';
    let velocity = 0;
    let distance = 0;

    // Determine primary direction
    if (absX > absY) {
      distance = absX;
      velocity = absVelX;
      if (absX >= this.config.swipeThreshold || absVelX >= this.config.swipeVelocityThreshold) {
        direction = translationX > 0 ? 'right' : 'left';
      }
    } else {
      distance = absY;
      velocity = absVelY;
      if (absY >= this.config.swipeThreshold || absVelY >= this.config.swipeVelocityThreshold) {
        direction = translationY > 0 ? 'down' : 'up';
      }
    }

    // Update analytics
    this.analytics.totalGestures++;
    this.analytics.swipes[direction]++;
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > 50) {
      this.velocityHistory.shift();
    }
    this.analytics.averageSwipeVelocity =
      this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;
    this.updatePreferredDirection();

    return {
      direction,
      velocity,
      distance,
      duration: 0, // Would need timestamp tracking
      startX: event.x - translationX,
      startY: event.y - translationY,
      endX: event.x,
      endY: event.y,
    };
  }

  // Check if tap is a double tap
  isDoubleTap(event: GestureStateChangeEvent<TapGestureHandlerEventPayload>): boolean {
    const now = Date.now();
    const timeDiff = now - this.lastTapTime;
    const distanceX = Math.abs(event.x - this.lastTapPosition.x);
    const distanceY = Math.abs(event.y - this.lastTapPosition.y);
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

    const isDouble = timeDiff < this.config.doubleTapDelay && distance < 50;

    this.lastTapTime = now;
    this.lastTapPosition = { x: event.x, y: event.y };

    return isDouble;
  }

  // Calculate snap points based on gesture velocity
  calculateSnapPoint(
    currentPosition: number,
    velocity: number,
    snapPoints: number[]
  ): number {
    if (snapPoints.length === 0) return currentPosition;
    if (snapPoints.length === 1) return snapPoints[0];

    // Project where the gesture would end based on velocity (deceleration model)
    const deceleration = 0.997;
    const projectedPosition = currentPosition + (velocity * deceleration) / (1 - deceleration) / 1000;

    // Find nearest snap point to projected position
    let nearestPoint = snapPoints[0];
    let minDistance = Math.abs(projectedPosition - snapPoints[0]);

    for (let i = 1; i < snapPoints.length; i++) {
      const distance = Math.abs(projectedPosition - snapPoints[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = snapPoints[i];
      }
    }

    // If velocity is high enough, bias towards the direction of movement
    if (Math.abs(velocity) > this.config.swipeVelocityThreshold) {
      const direction = velocity > 0 ? 1 : -1;
      const candidates = snapPoints.filter((point) =>
        direction > 0 ? point > currentPosition : point < currentPosition
      );
      if (candidates.length > 0) {
        nearestPoint = direction > 0 ? Math.min(...candidates) : Math.max(...candidates);
      }
    }

    return nearestPoint;
  }

  // Get optimal pan gesture config based on user behavior
  getAdaptivePanConfig(): {
    activeOffsetX: [number, number];
    activeOffsetY: [number, number];
    failOffsetX: [number, number];
    failOffsetY: [number, number];
  } {
    const preferred = this.analytics.preferredDirection;
    const threshold = this.config.panThreshold;

    // Bias gesture detection based on user's preferred direction
    if (preferred === 'left' || preferred === 'right') {
      return {
        activeOffsetX: [-threshold, threshold],
        activeOffsetY: [-threshold * 2, threshold * 2],
        failOffsetX: [-1000, 1000],
        failOffsetY: [-threshold, threshold],
      };
    }

    if (preferred === 'up' || preferred === 'down') {
      return {
        activeOffsetX: [-threshold * 2, threshold * 2],
        activeOffsetY: [-threshold, threshold],
        failOffsetX: [-threshold, threshold],
        failOffsetY: [-1000, 1000],
      };
    }

    // Default balanced config
    return {
      activeOffsetX: [-threshold, threshold],
      activeOffsetY: [-threshold, threshold],
      failOffsetX: [-1000, 1000],
      failOffsetY: [-1000, 1000],
    };
  }

  private updatePreferredDirection(): void {
    const { swipes } = this.analytics;
    const directions: GestureDirection[] = ['up', 'down', 'left', 'right'];
    
    let maxCount = 0;
    let preferred: GestureDirection | null = null;

    for (const dir of directions) {
      if (swipes[dir] > maxCount) {
        maxCount = swipes[dir];
        preferred = dir;
      }
    }

    // Only set preferred if there's a clear winner (at least 30% more than others)
    const total = directions.reduce((sum, dir) => sum + swipes[dir], 0);
    if (preferred && maxCount / total > 0.35) {
      this.analytics.preferredDirection = preferred;
    }
  }

  getAnalytics(): GestureAnalytics {
    return { ...this.analytics };
  }

  resetAnalytics(): void {
    this.analytics = {
      totalGestures: 0,
      swipes: { up: 0, down: 0, left: 0, right: 0, none: 0 },
      averageSwipeVelocity: 0,
      preferredDirection: null,
      tapAccuracy: 1,
    };
    this.velocityHistory = [];
  }
}

export const GestureIntelligence = new GestureIntelligenceClass();
