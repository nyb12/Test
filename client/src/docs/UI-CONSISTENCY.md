# UI Consistency Enhancement Guide

## Overview

This document outlines the comprehensive UI consistency improvements implemented across the avi-OS application to provide a smoother, more cohesive user experience.

## Design System

### Color Tokens

All colors are now defined using CSS custom properties for consistent theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 20 14.3% 4.1%;
  --muted: 60 4.8% 95.9%;
  --muted-foreground: 25 5.3% 44.7%;
  --primary: 207 90% 54%;
  --primary-foreground: 211 100% 99%;
  --secondary: 60 4.8% 95.9%;
  --secondary-foreground: 24 9.8% 10%;
  --accent: 60 4.8% 95.9%;
  --accent-foreground: 24 9.8% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 60 9.1% 97.8%;
  --border: 20 5.9% 90%;
  --input: 20 5.9% 90%;
  --ring: 20 14.3% 4.1%;
  --radius: 0.5rem;
}
```

### Spacing Scale

Consistent spacing using CSS custom properties:

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
```

### Border Radius Scale

```css
--radius-sm: 0.25rem; /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-2xl: 1rem; /* 16px */
```

### Shadow Scale

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

## Component Classes

### Enhanced Button States

```css
.btn-enhanced {
  @apply transition-all duration-200 ease-in-out;
  @apply hover:scale-[1.02] active:scale-[0.98];
  @apply focus-ring;
}

.btn-enhanced:disabled {
  @apply scale-100 cursor-not-allowed;
}
```

### Consistent Card Styling

```css
.card-enhanced {
  @apply bg-card border border-border rounded-lg shadow-sm;
  @apply transition-all duration-200 ease-in-out;
  @apply hover:shadow-md focus-within:shadow-md;
}
```

### Enhanced Input Styling

```css
.input-enhanced {
  @apply bg-background border border-input rounded-md px-3 py-2;
  @apply transition-all duration-200 ease-in-out;
  @apply focus-ring focus:border-ring;
  @apply placeholder:text-muted-foreground;
}
```

### Message Bubbles

```css
.message-bubble {
  @apply rounded-2xl px-4 py-3 max-w-[80%] break-words;
  @apply transition-all duration-200 ease-in-out;
}

.message-bubble-user {
  @apply bg-primary text-primary-foreground ml-auto;
  @apply shadow-sm hover:shadow-md;
}

.message-bubble-bot {
  @apply bg-muted text-foreground mr-auto;
  @apply shadow-sm hover:shadow-md;
}
```

### Tool Button Styling

```css
.tool-button {
  @apply inline-flex items-center gap-2 px-3 py-2 rounded-lg;
  @apply text-sm font-medium transition-all duration-200;
  @apply border border-border bg-background hover:bg-accent;
  @apply focus-ring;
  @apply hover:scale-[1.02] active:scale-[0.98];
}

.tool-button-active {
  @apply bg-primary text-primary-foreground border-primary;
  @apply shadow-sm;
}
```

## Status Colors

Consistent status indicators across the application:

```css
.status-operational {
  @apply bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800;
}

.status-maintenance {
  @apply bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800;
}

.status-grounded {
  @apply bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800;
}

.status-scheduled {
  @apply bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800;
}

.status-monitor {
  @apply bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800;
}
```

## Loading States

### Loading Spinner

```tsx
import { LoadingSpinner } from '@/components/ui/loading-states';

<LoadingSpinner size="md" />;
```

### Loading Skeleton

```tsx
import { LoadingSkeleton } from '@/components/ui/loading-states';

<LoadingSkeleton lines={3} />;
```

### Loading Card

```tsx
import { LoadingCard } from '@/components/ui/loading-states';

<LoadingCard showImage={true} showTitle={true} showDescription={true} />;
```

### Loading Button

```tsx
import { LoadingButton } from '@/components/ui/loading-states';

<LoadingButton size="md" />;
```

## Animation Classes

### Consistent Animations

```css
.animate-in {
  animation: animateIn 0.2s ease-out;
}

.animate-out {
  animation: animateOut 0.2s ease-in;
}

@keyframes animateIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes animateOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(10px);
  }
}
```

### Loading Shimmer Effect

```css
.loading-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted) / 0.5) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

## Enhanced Scrollbars

```css
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground)) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
```

## Focus Management

### Consistent Focus Rings

```css
.focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
```

## Backdrop Blur

```css
.backdrop-blur-enhanced {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
```

## Gradient Backgrounds

```css
.gradient-primary {
  background: linear-gradient(
    135deg,
    hsl(var(--primary)) 0%,
    hsl(var(--primary) / 0.8) 100%
  );
}

.gradient-accent {
  background: linear-gradient(
    135deg,
    hsl(var(--accent)) 0%,
    hsl(var(--accent) / 0.8) 100%
  );
}
```

## Implementation Guidelines

### 1. Use Design Tokens

Always use CSS custom properties instead of hardcoded values:

```tsx
// ✅ Good
<div className="bg-background text-foreground border-border" />

// ❌ Bad
<div className="bg-white text-black border-gray-200" />
```

### 2. Consistent Spacing

Use the spacing scale for consistent margins and padding:

```tsx
// ✅ Good
<div className="space-y-4 p-4 m-2" />

// ❌ Bad
<div className="space-y-2 p-3 m-1" />
```

### 3. Enhanced Button States

Apply enhanced button styling for better interactivity:

```tsx
// ✅ Good
<button className="btn-enhanced bg-primary text-primary-foreground" />

// ❌ Bad
<button className="bg-blue-500 text-white" />
```

### 4. Loading States

Use consistent loading components:

```tsx
// ✅ Good
{
  isLoading ? <LoadingSpinner /> : <Content />;
}

// ❌ Bad
{
  isLoading ? <div className="animate-spin">...</div> : <Content />;
}
```

### 5. Status Indicators

Use consistent status colors:

```tsx
// ✅ Good
<span className="status-operational">Active</span>

// ❌ Bad
<span className="bg-green-100 text-green-800">Active</span>
```

## Component Updates

### Enhanced Components

1. **SimpleChatbot**: Updated with consistent styling, enhanced buttons, and improved visual hierarchy
2. **MessageContainer**: Enhanced with consistent message bubbles and status indicators
3. **AircraftList**: Improved with consistent card styling and status colors
4. **ContactsList**: Enhanced with consistent layout and interaction patterns
5. **LoadingStates**: New component library for consistent loading experiences

### Key Improvements

- **Consistent Color Scheme**: All components now use the design token system
- **Enhanced Interactions**: Improved hover states, focus management, and animations
- **Better Accessibility**: Consistent focus rings and keyboard navigation
- **Loading States**: Unified loading experience across all components
- **Status Indicators**: Consistent status colors and badges
- **Responsive Design**: Improved mobile and desktop experiences
- **Dark Mode Support**: Enhanced dark mode compatibility

## Migration Guide

### Before (Old Styling)

```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <button className="bg-blue-500 text-white px-4 py-2 rounded">Click me</button>
</div>
```

### After (Enhanced Styling)

```tsx
<div className="card-enhanced p-4">
  <button className="btn-enhanced bg-primary text-primary-foreground px-4 py-2 rounded">
    Click me
  </button>
</div>
```

## Benefits

1. **Consistency**: Unified visual language across all screens
2. **Maintainability**: Centralized design tokens and reusable components
3. **Accessibility**: Improved focus management and keyboard navigation
4. **Performance**: Optimized animations and transitions
5. **User Experience**: Smoother interactions and better visual feedback
6. **Developer Experience**: Clear guidelines and reusable patterns

## Future Enhancements

1. **Component Library**: Expand the UI component library
2. **Animation System**: More sophisticated animation patterns
3. **Theme Customization**: User-configurable themes
4. **Accessibility**: Enhanced screen reader support
5. **Performance**: Further optimization of animations and transitions
