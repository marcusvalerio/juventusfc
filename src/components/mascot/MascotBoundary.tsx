import { Component, type ReactNode } from 'react';

/**
 * Anything the 3D layer throws — a malformed GLB, a lost WebGL context, a
 * driver that gives up — is contained here and answered with the still
 * composition. The mascot is decoration: it is never allowed to take a screen
 * down with it.
 */
export class MascotBoundary extends Component<
  { fallback: ReactNode; onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
