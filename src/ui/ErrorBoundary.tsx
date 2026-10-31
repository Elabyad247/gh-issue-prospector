import { Component, type ReactNode } from 'react';

export type ErrorBoundaryProps = {
  fallback: ReactNode;
  children: ReactNode;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
