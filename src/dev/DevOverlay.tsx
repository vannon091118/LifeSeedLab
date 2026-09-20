// Owner: DevGate (presentation only, read-only). LOC ≤ 200.
// Zeigt Seed/Hash/Tick/Phase/EventLog/Particle-Budget/DPR und schaltet FX stumm.
// Nur gemountet hinter isDevActive() — Release hat 0 Dev-Surface.

import { useMemo, useState, useEffect } from 'react';
import type { SimState } from '../simulation/state';
import { snapshotHash } from '../simulation/snapshot';
import type { GameEvent } from '../bus/events';

interface Props {
  revision: number;               // treibt Neu-Berechnung (vom Frame-Loop gestoßen)
  getSnapshot: () => SimState;
  busRecent: () => readonly GameEvent[];
  particleInfo: () => { active: number; cap: number; budget: string };
  fxEnabled: boolean;
  onToggleFx: () => void;
  dpr: number;
}

export function DevOverlay({ revision, getSnapshot, busRecent, particleInfo, fxEnabled, onToggleFx, dpr }: Props) {
  const [, force] = useState(0);
  useEffect(() => { force(v => v + 1); }, [revision]);

  const snap = getSnapshot();
  const hash = useMemo(() => {
    // EINE Projektion: der Dev-Screen benutzt denselben Snapshot-Hash wie der Contract
    // (vorher baute er seine eigene Kopie — ein Feld hätte hier unbemerkt fehlen können).
    try {
      return snapshotHash(snap);
    } catch { return '—'; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, snap.seed]);

  const recent = busRecent().slice(-12).reverse();
  const pinfo = particleInfo();

  return (
    <div style={styles.wrap} role="complementary" aria-label="Dev Overlay">
      <div style={styles.row}>
        <span style={styles.k}>Seed</span><span style={styles.v}>{snap.seed}</span>
        <span style={styles.k}>Hash</span><span style={styles.v}>{hash}</span>
        <span style={styles.k}>Tick</span><span style={styles.v}>{snap.clock.tick}</span>
        <span style={styles.k}>Phase</span><span style={styles.v}>{snap.phase}</span>
        <span style={styles.k}>Wave</span><span style={styles.v}>{snap.wave.number}</span>
        <span style={styles.k}>DPR</span><span style={styles.v}>{dpr.toFixed(2)}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.k}>FX</span>
        <button onClick={onToggleFx} style={styles.btn} aria-label="FX toggle">{fxEnabled ? 'FX ON' : 'FX OFF'}</button>
        <span style={styles.k}>Particles</span><span style={styles.v}>{pinfo.active}/{pinfo.cap} {pinfo.budget}</span>
        <span style={styles.k}>Plants</span><span style={styles.v}>{snap.plants.length}</span>
        <span style={styles.k}>Enemies</span><span style={styles.v}>{snap.enemies.length}</span>
        <span style={styles.k}>Score</span><span style={styles.v}>{snap.score}</span>
      </div>
      <div style={styles.log}>
        <div style={styles.k}>Event Log (letzte 12)</div>
        <div style={styles.logLines}>
          {recent.length === 0 ? <span style={styles.muted}>—</span> : recent.map(e => (
            <div key={e.eventId} style={styles.logLine}>{e.tick}:{e.type} {JSON.stringify(e.payload).slice(0, 80)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute', left: 8, right: 8, bottom: 64,
    background: 'rgba(15,23,42,0.92)', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: 10, padding: '8px 10px', fontSize: 11, lineHeight: 1.35,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', zIndex: 4,
    maxHeight: 220, overflow: 'auto', backdropFilter: 'blur(6px)',
    // Lesefläche, KEIN Eingabefeld: das Overlay liegt über Tray und unterem Brett — mit
    // pointer-events:auto schluckte es jeden Tap dort (Befund 20.09.2026: im Dev-Modus ließ
    // sich keine Tray-Karte auswählen). Nur der FX-Knopf nimmt Klicks wieder an.
    pointerEvents: 'none' as const,
  },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 },
  k: { color: '#94a3b8', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  v: { color: '#e2e8f0', fontWeight: 700, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '1px 6px' },
  btn: { padding: '4px 8px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', pointerEvents: 'auto' as const },
  log: { borderTop: '1px solid #1e293b', paddingTop: 6 },
  logLines: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, maxHeight: 80, overflow: 'auto' },
  logLine: { color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  muted: { color: '#64748b' },
};
