// Owner: UI (Boot). LOC ≤ 200.
// Catches any React render crash and shows a VISIBLE error screen.
// Rationale: a black screen is undebuggable for both player and agent.
import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // visible on-screen (below); console for tooling
    console.error('[LifeSeedLab] render crash:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.glyph}>🥀</div>
          <h1 style={styles.title}>Die Pflanze ist umgeknickt</h1>
          <p style={styles.sub}>Ein unerwarteter Fehler ist aufgetreten.</p>
          <pre style={styles.err}>{this.state.error.message}</pre>
          <button style={styles.btn} onClick={() => window.location.reload()}>
            Neu laden
          </button>
        </div>
      </div>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%', height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#f5efdc',
  },
  card: {
    textAlign: 'center', padding: 32, maxWidth: 420,
    background: '#fbf6e9', border: '2px solid #2b2b26', borderRadius: 14,
    boxShadow: '4px 4px 0 #2b2b26',
  },
  glyph: { fontSize: 42 },
  title: { fontSize: 20, color: '#2b2b26', margin: '8px 0 4px' },
  sub: { fontSize: 13, color: '#6b6250', margin: 0 },
  err: {
    marginTop: 12, padding: 10, textAlign: 'left', fontSize: 11,
    background: '#efe6cf', border: '1px solid #c9bd9e', borderRadius: 8,
    color: '#a94438', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    maxHeight: 160, overflow: 'auto', fontFamily: 'monospace',
  },
  btn: {
    marginTop: 16, padding: '10px 28px', fontSize: 15, fontWeight: 700,
    background: '#5a8f4e', color: '#f5efdc', border: '2px solid #2b2b26',
    borderRadius: 10, cursor: 'pointer', boxShadow: '3px 3px 0 #2b2b26',
  },
};
