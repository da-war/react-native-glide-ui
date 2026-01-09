# 🚀 react-native-glide-ui

**The most advanced adaptive UI system for React Native & Expo**

AI-powered performance optimization, intelligent gesture recognition, and automatic layout adaptation that makes your app feel *buttery smooth* on every device.

[![npm version](https://badge.fury.io/js/react-native-glide-ui.svg)](https://www.npmjs.com/package/react-native-glide-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ What Makes This Special?

| Feature | What It Does |
|---------|--------------|
| 🧠 **Smart Performance** | Auto-detects device capabilities and adjusts animations |
| 📱 **Adaptive Layouts** | Responsive breakpoints that work like CSS media queries |
| 👆 **Gesture Intelligence** | Learns user patterns and optimizes swipe detection |
| 🎯 **Haptic Feedback** | Contextual vibrations that feel native |
| ⚡ **Zero Config** | Works out of the box with sensible defaults |
| 📦 **Expo Compatible** | No native linking required |

---

## 📦 Installation

```bash
# Using npm
npm install react-native-glide-ui react-native-reanimated react-native-gesture-handler

# Using yarn
yarn add react-native-glide-ui react-native-reanimated react-native-gesture-handler

# Using expo
npx expo install react-native-glide-ui react-native-reanimated react-native-gesture-handler
```

### Setup for Expo

Add the Reanimated babel plugin to your `babel.config.js`:

```js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

### Setup for React Native CLI

Follow the installation guides for:
- [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/installation)
- [react-native-gesture-handler](https://docs.swmansion.com/react-native-gesture-handler/docs/installation)

---

## 🚀 Quick Start

```tsx
import { GlideProvider, GlideView, GlideButton, GlideText } from 'react-native-glide-ui';

export default function App() {
  return (
    <GlideProvider>
      <GlideView flex={1} center padding={20}>
        <GlideText variant="h1">Hello Glide! 👋</GlideText>
        
        <GlideButton 
          onPress={() => console.log('Pressed!')}
          variant="solid"
          size="lg"
          rounded
        >
          Get Started
        </GlideButton>
      </GlideView>
    </GlideProvider>
  );
}
```

---

## 📖 Core Concepts

### 1. GlideProvider

Wrap your app to enable all features:

```tsx
<GlideProvider
  config={{
    haptics: { enabled: true, intensity: 0.8 },
    performance: { enableMonitoring: true, adaptiveAnimations: true },
  }}
>
  {/* Your app */}
</GlideProvider>
```

### 2. Adaptive Layouts with `useGlideLayout`

```tsx
import { useGlideLayout } from 'react-native-glide-ui';

function MyComponent() {
  const { breakpoint, spacing, typography, wp, hp, resolve } = useGlideLayout();

  // Responsive values (like CSS media queries!)
  const columns = resolve({ xs: 1, sm: 2, md: 3, lg: 4 });
  
  return (
    <View style={{ 
      padding: spacing.md,           // Auto-scales per device
      width: wp(90),                 // 90% of screen width
      fontSize: typography.body1,    // Adaptive font size
    }}>
      <Text>Current breakpoint: {breakpoint}</Text>
      <Text>Showing {columns} columns</Text>
    </View>
  );
}
```

### 3. Smart Animations with `useGlideAnimation`

```tsx
import { useGlideAnimation } from 'react-native-glide-ui';
import Animated from 'react-native-reanimated';

function AnimatedBox() {
  const { value, spring, timing } = useGlideAnimation({ initialValue: 0 });

  return (
    <>
      <Animated.View style={{ transform: [{ translateX: value }] }}>
        <Text>I animate!</Text>
      </Animated.View>
      
      <Button onPress={() => spring(100, 'bounce')} title="Bounce Right" />
      <Button onPress={() => spring(0, 'smooth')} title="Smooth Back" />
    </>
  );
}
```

### 4. Gesture Intelligence with `useGlideGesture`

```tsx
import { useGlideGesture } from 'react-native-glide-ui';
import { GestureDetector } from 'react-native-gesture-handler';

function SwipeableCard() {
  const { gesture, animatedStyle } = useGlideGesture({
    onSwipeLeft: () => console.log('Swiped left!'),
    onSwipeRight: () => console.log('Swiped right!'),
    enableHaptics: true,
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <Text>Swipe me!</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

### 5. Performance-Aware Components

```tsx
import { useGlidePerformance } from 'react-native-glide-ui';

function SmartComponent() {
  const { tier, shouldReduceMotion, capabilities } = useGlidePerformance();

  return (
    <View>
      <Text>Device tier: {tier}</Text> {/* 'low' | 'mid' | 'high' | 'ultra' */}
      
      {!shouldReduceMotion && (
        <FancyAnimation /> // Only show on capable devices
      )}
    </View>
  );
}
```

---

## 🧩 Components

### GlideView

Animated container with responsive shortcuts:

```tsx
<GlideView
  flex={1}
  row                    // flexDirection: 'row'
  center                 // centers both axes
  padding={{ xs: 10, md: 20 }}  // responsive padding
  gap={12}
  bg="#f5f5f5"
  rounded={16}
  entering="fadeIn"      // 'fadeIn' | 'slideUp' | 'zoomIn' | etc.
>
  {children}
</GlideView>
```

### GlideButton

Animated buttons with haptic feedback:

```tsx
<GlideButton
  onPress={handlePress}
  variant="solid"        // 'solid' | 'outline' | 'ghost' | 'soft'
  size="md"              // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color="#007AFF"
  rounded
  haptic="medium"        // 'light' | 'medium' | 'heavy' | false
  leftIcon={<Icon />}
>
  Press Me
</GlideButton>
```

### GlideText

Adaptive typography:

```tsx
<GlideText variant="h1" color="#333" align="center">
  Big Title
</GlideText>

<GlideText variant="body1">
  Regular text that scales nicely
</GlideText>
```

### GlideCard

Pressable card with elevation:

```tsx
<GlideCard
  onPress={handlePress}
  elevated
  rounded={12}
  entering="slide"
>
  <GlideText variant="title">Card Title</GlideText>
  <GlideText variant="body2">Card content here</GlideText>
</GlideCard>
```

---

## 🎨 Animation Presets

Built-in spring presets that auto-adapt to device performance:

| Preset | Feel | Use Case |
|--------|------|----------|
| `bounce` | Playful | Buttons, cards |
| `smooth` | Elegant | Transitions, modals |
| `snappy` | Quick | Tabs, toggles |
| `gentle` | Soft | Background elements |
| `elastic` | Springy | Draggables |
| `stiff` | Precise | Forms, inputs |
| `swift` | Fast | Micro-interactions |

```tsx
const { spring } = useGlideAnimation();

spring(100, 'bounce');  // Bouncy animation
spring(100, 'smooth');  // Smooth animation
```

---

## 🎯 Haptic Types

```tsx
const { trigger, confirm, reject, warn } = useGlideHaptics();

trigger('light');    // Subtle tap
trigger('medium');   // Standard feedback
trigger('heavy');    // Strong impact
trigger('success');  // Success pattern
trigger('warning');  // Warning pattern
trigger('error');    // Error pattern
trigger('selection'); // Selection tick

// Shortcuts
confirm();  // Success haptic
reject();   // Error haptic
warn();     // Warning haptic
```

---

## 📱 Responsive Breakpoints

Default breakpoints (customizable):

| Breakpoint | Width |
|------------|-------|
| `xs` | 0-359px |
| `sm` | 360-479px |
| `md` | 480-767px |
| `lg` | 768-1023px |
| `xl` | 1024-1279px |
| `xxl` | 1280px+ |

```tsx
const { resolve } = useGlideLayout();

// Returns appropriate value based on screen size
const padding = resolve({ xs: 8, sm: 12, md: 16, lg: 24 });
const columns = resolve({ xs: 1, sm: 2, lg: 3, xl: 4 });
```

---

## ⚙️ Configuration

```tsx
<GlideProvider
  config={{
    // Custom breakpoints
    breakpoints: {
      sm: 400,
      md: 600,
      lg: 900,
    },
    
    // Gesture settings
    gestures: {
      swipeThreshold: 50,
      swipeVelocityThreshold: 500,
      longPressDelay: 500,
    },
    
    // Haptic settings
    haptics: {
      enabled: true,
      intensity: 1, // 0-1
    },
    
    // Performance settings
    performance: {
      enableMonitoring: false,
      adaptiveAnimations: true,
    },
  }}
>
```

---

## 🔧 TypeScript Support

Full TypeScript support with exported types:

```tsx
import type {
  GlideConfig,
  LayoutMetrics,
  ResponsiveValue,
  Breakpoint,
  AnimationPreset,
  HapticFeedbackType,
  SwipeGestureData,
  DeviceCapabilities,
} from 'react-native-glide-ui';
```

---

## 📄 License

MIT © Your Name

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines.

---

Made with ❤️ for the React Native community
