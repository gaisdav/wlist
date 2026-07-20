import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

interface ErrorBoundaryProps extends PropsWithChildren {
  /** Render prop for the fallback UI; called with a `retry` callback that
   * resets the boundary's local state (e.g. after fixing the underlying data). */
  fallback: (retry: () => void) => ReactNode;
  /** When this changes while the boundary is tripped, the boundary resets —
   * e.g. pass the current route so navigating away "heals" a crashed screen. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors below it so one broken screen doesn't white-screen
 * the whole Mini App. Class component because React has no hook-based error
 * boundary API. See docs/app-audit.md §7.1.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught', error, info);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    if (this.state.error) return this.props.fallback(() => this.setState({ error: null }));
    return this.props.children;
  }
}
