// Owner: DevGate (observer/read-only). LOC ≤ 200.
// Visual Inspector (?dev=1): zeigt die EINE sichtbare Identität eines Wesens — Phänotyp,
// Palette, Effekte, variantKey. Der alte Baukasten-Report (Base/Extras/Layer) ist GESTORBEN:
// es gibt keine Layer-Liste mehr, aus der man Extras ablesen könnte (R3).

import type { ResolvedVisual } from '../visual/generator';

interface Props {
  visual: ResolvedVisual | null;
  entityLabel: string; // e.g. "plant-0003" or "ghost"
}

export function Inspector({ visual, entityLabel }: Props) {
  if (!visual) return null;
  const p = visual.phenotype;
  return (
    <div style={styles.wrap} role="complementary" aria-label="Visual Inspector">
      <div style={styles.head}>🔍 {entityLabel} — Visual Inspector</div>
      <div style={styles.grid}>
        <KV k="Wuchs" v={p.habit} />
        <KV k="Höhe/Stamm" v={`${p.stalk.height.toFixed(2)} · ${p.stalk.thickness.toFixed(2)}`} />
        <KV k="Blätter" v={`${p.leaves.count}× ${p.leaves.shape}`} />
        <KV k="Blüten" v={p.flowers.form === 'none' ? '—' : `${p.flowers.count}× ${p.flowers.form}`} />
        <KV k="Oberfläche" v={p.surface.relief} />
        <KV k="Muster" v={p.pigment.pattern} />
        <KV k="Bewegung" v={`${p.motion.style} · ${visual.animation}`} />
        <KV k="Effekte" v={visual.effectIds.join(', ') || '—'} />
        <KV k="Visual Seed" v={String(visual.visualSeed)} />
        <KV k="Palette base" v={visual.palette.base} swatch={visual.palette.base} />
        <KV k="Accent" v={visual.palette.accent} swatch={visual.palette.accent} />
        <KV k="Dark" v={visual.palette.dark} swatch={visual.palette.dark} />
        <KV k="Scale" v={visual.scale.toFixed(3)} />
        <KV k="Achsen" v={String(p.descriptor.length)} />
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
