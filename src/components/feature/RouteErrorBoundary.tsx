import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without a boundary, one render error unmounts the whole app and leaves a
// blank white page with no hint of what happened.
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f9fafb' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Something went wrong on this page</h1>
          <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 16 }}>
            Reload to try again. If it keeps happening, send a screenshot of this message to your admin.
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20, wordBreak: 'break-word' }}>{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: 8, background: '#FF6B35', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
