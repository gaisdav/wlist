// Design tokens — colors. Plain TS, no platform binding.
// Tailwind config in apps/tma consumes them via `theme.extend`.
// See docs/architecture.md §8.

// Raw brand palette — fixed hex values that don't depend on theme.
export const brand = {
  50: '#eaf6ff',
  100: '#cfeaff',
  200: '#a3d6ff',
  300: '#6ebcff',
  400: '#3aa1ff',
  500: '#0d8aff',
  600: '#006fda',
  700: '#0058ad',
  800: '#01457f',
  900: '#013559',
} as const;

// Neutral scale (raw) — primarily for borders, surfaces, text on solid bg.
export const neutral = {
  0: '#ffffff',
  50: '#f7f7f8',
  100: '#ececef',
  200: '#d9d9de',
  300: '#bdbdc6',
  400: '#9494a0',
  500: '#6b6b78',
  600: '#494953',
  700: '#33333b',
  800: '#1f1f25',
  900: '#0e0e12',
  1000: '#000000',
} as const;

// Semantic aliases — bound to Telegram theme variables at runtime.
// Tailwind exposes them as classes: bg-background, text-foreground, etc.
export const semantic = {
  background: 'var(--tg-theme-bg-color)',
  foreground: 'var(--tg-theme-text-color)',
  muted: 'var(--tg-theme-hint-color)',
  mutedForeground: 'var(--tg-theme-subtitle-text-color)',
  primary: 'var(--tg-theme-button-color)',
  primaryForeground: 'var(--tg-theme-button-text-color)',
  accent: 'var(--tg-theme-link-color)',
  destructive: 'var(--tg-theme-destructive-text-color)',
  border: 'var(--tg-theme-section-separator-color)',
  surface: 'var(--tg-theme-secondary-bg-color)',
  surfaceForeground: 'var(--tg-theme-section-header-text-color)',
} as const;

export const colors = { brand, neutral, semantic } as const;
