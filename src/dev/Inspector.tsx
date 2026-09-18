// Owner: DevGate (observer/read-only). LOC ≤ 200.
// Visual Inspector: Entity ID / Base / Extra / Effect / Visual Seed / Palette / Scale / Rotation / variantKey

import type { ResolvedVisual } from '../visual/generator';

interface Props {
  visual: ResolvedVisual | null;
  entityLabel: string; // e.g. "plant-0003" or "ghost"
}

export function Inspector({ visual, entityLabel }: Props) {
  if (!visual) return null;
  const first = visual.layers[0];
  return (
    <div style={styles.wrap} role="complementary" aria-label="Visual Inspector">
      <div style={styles.head}>🔍 {entityLabel} — Visual Inspector</div>
      <div style={styles.grid}>
        <KV k="Base" v={visual.baseId} />
        <KV k="Extras" v={visual.extraIds.join(', ') || '—'} />
        <KV k="Effects" v={visual.effectIds.join(', ') || '—'} />
        <KV k="Visual Seed" v={String(visual.visualSeed)} />
        <KV k="Version" v={String(visual.visualVersion)} />
        <KV k="Palette base" v={visual.palette.base} swatch={visual.palette.base} />
        <KV k="Accent" v={visual.palette.accent} swatch={visual.palette.accent} />
        <KV k="Dark" v={visual.palette.dark} swatch={visual.palette.dark} />
        <KV k="Scale" v={String(first?.scale.toFixed(3) ?? '—')} />
        <KV k="Rotation" v={String(first ? (first.rotation * 57.2958).toFixed(1) + '°' : '—')} />
        <KV k="Layers" v={String(visual.layers.length)} />
        <KV k="variantKey" v={visual.variantKey} full />
      </div>
    </div>
  );
}

function KV({ k, v, swatch, full }: { k: string; v: string; swatch?: string; full?: boolean }) {
  return (
    <div style={full ? styles.kvFull : styles.kv}>
      <span style={styles.k}>{k}</span>
      <span style={styles.v} title={v}>
        {swatch && <span style={{ ...styles.swatch, background: swatch }} />}
        <span style={full ? styles.vFull : undefined}>{v}</span>
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'absolute', right: 8, top: 64, width: 280,
    background: 'rgba(251,246,233,0.96)', color: 'var(--ink)', border: '1.5px solid var(--ink)',
    borderRadius: 12, boxShadow: '3px 3px 0 var(--ink)', padding: 10, fontSize: 11, zIndex: 4,
  },
  head: { fontWeight: 800, fontSize: 12, marginBottom: 8, color: 'var(--ink)' },
  grid: { display: 'flex', flexDirection: 'column', gap: 6 },
  kv: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
  kvFull: { display: 'flex', flexDirection: 'column', gap: 2 },
  k: { fontWeight: 700, color: '#6b6250', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 },
  v: { display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 },
  vFull: { whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: '100%' },
  swatch: { width: 12, height: 12, borderRadius: 3, border: '1px solid var(--ink)', flexShrink: 0, display: 'inline-block' },
};
