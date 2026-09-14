import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Last-resort visible failure: uncaught async errors must never yield a black screen.
function paintFatal(message: string): void {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5efdc;">
      <div style="text-align:center;padding:32px;max-width:420px;background:#fbf6e9;border:2px solid #2b2b26;border-radius:14px;box-shadow:4px 4px 0 #2b2b26;">
        <div style="font-size:42px">🥀</div>
        <h1 style="font-size:20px;color:#2b2b26;margin:8px 0 4px">Die Pflanze ist umgeknickt</h1>
        <p style="font-size:13px;color:#6b6250;margin:0">Ein unerwarteter Fehler ist aufgetreten.</p>
        <pre style="margin-top:12px;padding:10px;text-align:left;font-size:11px;background:#efe6cf;border:1px solid #c9bd9e;border-radius:8px;color:#a94438;white-space:pre-wrap;word-break:break-word;max-height:160px;overflow:auto;font-family:monospace">${message}</pre>
        <button onclick="window.location.reload()" style="margin-top:16px;padding:10px 28px;font-size:15px;font-weight:700;background:#5a8f4e;color:#f5efdc;border:2px solid #2b2b26;border-radius:10px;cursor:pointer;box-shadow:3px 3px 0 #2b2b26">Neu laden</button>
      </div>
    </div>`;
}

window.addEventListener('error', e => paintFatal(String(e.error?.message ?? e.message ?? 'Unbekannter Fehler')));
window.addEventListener('unhandledrejection', e => paintFatal(String((e.reason as Error)?.message ?? e.reason ?? 'Promise abgelehnt')));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
