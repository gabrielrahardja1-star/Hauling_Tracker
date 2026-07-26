import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { api } from './lib/api';
import './index.css';

// Catches errors outside React's render cycle (event handlers, async code,
// promise rejections) — ErrorBoundary only catches render-time errors.
window.addEventListener('error', (e) => {
  api.reportError(e.message, { stack: e.error?.stack, path: window.location.pathname });
});
window.addEventListener('unhandledrejection', (e) => {
  api.reportError(e.reason?.message || String(e.reason), { stack: e.reason?.stack, path: window.location.pathname });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
