import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, match => {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return match;
    }
  });
}

// Last-resort visible failure: uncaught async errors must never yield a black screen.
// DOM-Methoden statt innerHTML — Gate PAT001 (keine unsanitierte innerHTML-Zuweisung).
function paintFatal(message: string): void {
  const root = document.getElementById('root');
  if (!root) return;

  const wrap = document.createElement('div');
  Object.assign(wrap.style, { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5efdc' });

  const card = document.createElement('div');
  Object.assign(card.style, { textAlign: 'center', padding: '32px', maxWidth: '420px', background: '#fbf6e9', border: '2px solid #2b2b26', borderRadius: '14px', boxShadow: '4px 4px 0 #2b2b26' });

  const icon = document.createElement('div');
  // P-30: die Emoji-Grafik ist einer Ink-Glyphe gewichen (B0: keine Emojis als
  // Endgrafik) — ein gestrichelter Blütenstempel in denselben Farben wie die Karten.
  Object.assign(icon.style, { fontSize: '34px', color: '#a94438', border: '3px dashed #2b2b26', borderRadius: '50%', width: '64px', height: '64px', lineHeight: '58px', margin: '0 auto 8px' });
  icon.textContent = '✿';

  const heading = document.createElement('h1');
  Object.assign(heading.style, { fontSize: '20px', color: '#2b2b26', margin: '8px 0 4px' });
  heading.textContent = 'Die Pflanze ist umgeknickt';

  const sub = document.createElement('p');
  Object.assign(sub.style, { fontSize: '13px', color: '#6b6250', margin: '0' });
  sub.textContent = 'Ein unerwarteter Fehler ist aufgetreten.';

  const pre = document.createElement('pre');
  Object.assign(pre.style, { marginTop: '12px', padding: '10px', textAlign: 'left', fontSize: '11px', background: '#efe6cf', border: '1px solid #c9bd9e', borderRadius: '8px', color: '#a94438', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '160px', overflow: 'auto', fontFamily: 'monospace' });
  pre.textContent = message; // textContent ist sicher — keine HTML-Interpretation

  const btn = document.createElement('button');
  Object.assign(btn.style, { marginTop: '16px', padding: '10px 28px', fontSize: '15px', fontWeight: '700', background: '#5a8f4e', color: '#f5efdc', border: '2px solid #2b2b26', borderRadius: '10px', cursor: 'pointer', boxShadow: '3px 3px 0 #2b2b26' });
  btn.textContent = 'Neu laden';
  btn.addEventListener('click', () => { window.location.reload(); });

  card.append(icon, heading, sub, pre, btn);
  wrap.appendChild(card);
  root.replaceChildren(wrap);
}

if (typeof window !== 'undefined') {

  window.addEventListener('error', e => paintFatal(String(e.error?.message ?? e.message ?? 'Unbekannter Fehler')));
  window.addEventListener('unhandledrejection', e => paintFatal(String((e.reason as Error)?.message ?? e.reason ?? 'Promise abgelehnt')));

  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
  }
}
