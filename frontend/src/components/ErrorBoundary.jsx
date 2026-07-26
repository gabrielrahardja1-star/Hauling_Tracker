import { Component } from 'react';
import { api } from '../lib/api';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    api.reportError(error.message, { stack: error.stack, componentStack: info.componentStack, path: window.location.pathname });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Terjadi kesalahan</div>
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Muat ulang halaman untuk melanjutkan.</div>
          <button className="btn btn-accent" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => window.location.reload()}>
            Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
