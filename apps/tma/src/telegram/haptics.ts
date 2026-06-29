import {
  hapticFeedbackImpactOccurred as impactOccurred,
  hapticFeedbackNotificationOccurred as notificationOccurred,
  hapticFeedbackSelectionChanged as selectionChanged,
} from '@telegram-apps/sdk-react';

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'success' | 'warning' | 'error';

/**
 * Telegram haptic feedback. Each call no-ops when the host doesn't support it,
 * so callers never need to feature-detect. Mirrors `useTelegramBackButton`'s
 * `isAvailable()` guard pattern.
 */
export const haptics = {
  /** Physical tap — use for taps that change state (like, book, toggle). */
  impact(style: ImpactStyle = 'light'): void {
    if (impactOccurred.isAvailable()) impactOccurred(style);
  },
  /** Outcome cue — use after a mutation resolves (success / warning / error). */
  notify(type: NotificationType): void {
    if (notificationOccurred.isAvailable()) notificationOccurred(type);
  },
  /** Light tick — use for selection changes (segmented control, tabs). */
  select(): void {
    if (selectionChanged.isAvailable()) selectionChanged();
  },
};
