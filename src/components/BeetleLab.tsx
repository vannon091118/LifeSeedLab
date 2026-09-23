import { useMemo, useState } from 'react';
import type { BeetleAncestor, MetaSave } from '../types';
import { NektarChipIcon } from './GameIcons';
import { useI18n } from '../i18n';
import { enqueueBrood, readyBroods, claimBrood } from '../meta';
import { rollBrood, broodGenomeHash, beetlePower, resolveAncestor } from '../genome/beetle';
import { beetlePhenotypeOf } from '../genome/beetlePhenotype';
import { BEETLES_SOURCE, beetleWavesToUnlock, BEETLE_BREED } from '../config/beetles.source';
import { BeetleCanvas } from './PhenotypeCanvas';

// Owner: UI (BeetleLab screen). LOC ≤ 400.
// R3: BRÜTEN ist echte Nachzucht. Eltern sind VORFAHREN — ein Basis-Tier genauso wie ein Tier
// aus dem eigenen Brut-Lager. Damit ist die Kette endlos: Eltern → Kind → dieses Kind wird
// Elternteil → nächste Generation. Und was der Spieler sieht, ist der PHÄNOTYP des Kandidaten
// (Panzer, Mandibeln, Beine, Panzerkleid) — keine Farbpunkte, keine Basis-Schablone.

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onClose: () => void;
};

/** Gründer-Tiere als Vorfahren auflösen (einzige Quelle bleibt der Käfer-Genom-Adapter). */
const FOUNDERS: BeetleAncestor[] = Object.keys(BEETLES_SOURCE)
  .map(id => resolveAncestor(id))
  .filter((a): a is BeetleAncestor => a !== null);

export function BeetleLab({ meta, onMetaChange, onClose }: Props) {
  const { t } = useI18n();
  const [parentA, setParentA] = useState<string | null>(null);
  const [parentB, setParentB] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Auswahl-Pool: Gründer + das eigene Lager. Ein gezüchtetes Tier ist ein vollwertiger Elternteil.
  const pool: BeetleAncestor[] = useMemo(() => [
    ...FOUNDERS,
    ...meta.beetles.map(s => ({ id: s.id, specimenId: s.specimenId, genome: s.genome, generation: s.generation ?? 1 })),
  ], [meta.beetles]);
  const byId = useMemo(() => new Map(pool.map(a => [a.id, a])), [pool]);
  const ancestorA = parentA ? byId.get(parentA) ?? null : null;
  const ancestorB = parentB ? byId.get(parentB) ?? null : null;

  // Live-Brutvorschau: DIESELBEN Vorfahren, DERSELBE monotone Zähler wie `enqueueBrood`.
  const preview = useMemo(() => {
    if (!ancestorA || !ancestorB) return [];
    return rollBrood(ancestorA, ancestorB, meta.broodGeneration);
  }, [ancestorA, ancestorB, meta.broodGeneration]);

  const pick = (id: string) => {
    if (parentA === id) { setParentA(null); return; }
    if (parentB === id) { setParentB(null); return; }
    if (!parentA) { setParentA(id); return; }
    if (!parentB) { setParentB(id); return; }
    setParentA(id); setParentB(null); // dritte Wahl ersetzt das ältere Elternteil
  };

  const handleBreed = () => {
    if (!ancestorA || !ancestorB) { setNote(t('beetle.needTwo')); return; }
    if (meta.nektar < BEETLE_BREED.nektarCost) { setNote(t('beetle.notEnoughNektar')); return; }
    const waves = beetleWavesToUnlock(
      preview.reduce((s, c) => s + beetlePower(c.genome), 0) / Math.max(1, preview.length),
    );
    const m = enqueueBrood(ancestorA, ancestorB, waves);
    onMetaChange(m);
    setNote(t('beetle.enqueued').replace('{n}', String(waves)));
    setParentA(null); setParentB(null);
    setTimeout(() => setNote(null), 2200);
  };

  const card = (a: BeetleAncestor, tag?: 'A' | 'B') => (
    <button
      key={a.id}
      data-tut="beetle-parent"
      aria-pressed={tag !== undefined}
      onClick={() => pick(a.id)}
      style={{ ...styles.specimenCard, ...(tag ? styles.specimenSelected : {}) }}
    >
      {/* `specimenId` mitgeben: ein Gründer trägt seine DOKUMENTIERTE Farbe (Source-Anker), nicht
          die gestreute Zuchtfarbe — ohne den Namen gäbe es keinen Anker, und vorher trugen alle
          drei Gründer dieselbe Farbe. */}
      <BeetleCanvas phenotype={beetlePhenotypeOf({ genome: a.genome, generation: a.generation, specimenId: a.specimenId })} size={64} title={a.specimenId} />
      <span style={styles.specimenName}>{BEETLES_SOURCE[a.specimenId]?.label ?? a.specimenId}</span>
      <span style={styles.specimenStats}>Gen {a.generation} · {a.genome.length} Gene</span>
      {tag && <span style={styles.specimenTag}>{tag}</span>}
    </button>
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('beetle.title')}</h2>
          <div style={styles.headerRight}>
            <span style={styles.nektar}><NektarChipIcon/> {meta.nektar}</span>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>
        <p style={styles.desc}>{t('beetle.desc')}</p>
        {note && <div style={styles.note}>{note}</div>}

        <div style={styles.parentLine}>
          <span style={styles.parentSlot}>
            Eltern A: <strong>{ancestorA ? labelOf(ancestorA) : '—'}</strong>
          </span>
          <span style={styles.parentSlot}>
            Eltern B: <strong>{ancestorB ? labelOf(ancestorB) : '—'}</strong>
          </span>
          <button onClick={() => { setParentA(null); setParentB(null); }} style={styles.clearBtn}>Auswahl leeren</button>
        </div>

        <h3 style={styles.sectionTitle}>{t('beetle.library')} ({meta.beetles.length})</h3>
        <div style={styles.specimenRow}>
          {meta.beetles.length > 0
            ? [...meta.beetles].reverse().map(s => card({ id: s.id, specimenId: s.specimenId, genome: s.genome, generation: s.generation ?? 1 },
              parentA === s.id ? 'A' : parentB === s.id ? 'B' : undefined))
            : <span style={styles.hintEmpty}>Noch keine eigenen Tiere — die Gründer unten sind der Anfang.</span>}
        </div>

        <h3 style={styles.sectionTitle}>Gründer-Pool</h3>
        <div style={styles.specimenRow}>
          {FOUNDERS.map(f => card(f, parentA === f.id ? 'A' : parentB === f.id ? 'B' : undefined))}
        </div>

        <button onClick={handleBreed} disabled={!ancestorA || !ancestorB} style={{ ...styles.breedBtn, opacity: meta.nektar < BEETLE_BREED.nektarCost ? 0.5 : 1 }}>
          {t('beetle.breed')} (<NektarChipIcon/> {BEETLE_BREED.nektarCost})
        </button>

        {preview.length > 0 && (
          <div style={styles.broodSection}>
            <h3 style={styles.sectionTitle}>{t('beetle.preview')}</h3>
            <div style={styles.broodRow}>
              {preview.map((c, i) => {
                const p = beetlePhenotypeOf({ genome: c.genome, generation: c.generation ?? 1 });
                // Der Vergleich ist die Arbeit des Spielers: das stärkste Tier der Brut setzt die
                // Messlatte, jede Karte nennt ihren Abstand dazu — statt drei Zahlen im Kopf zu
                // vergleichen. (Nur echte Abweichungen zeigen, sonst rauscht die Zeile.)
                const bestHp = Math.max(...preview.map(x => x.stats.hp));
                const bestAttack = Math.max(...preview.map(x => x.stats.attack));
                return (
                  <div key={c.id} style={styles.broodCard} data-tut="brood-candidate">
                    <BeetleCanvas phenotype={p} size={72} title={c.name} />
                    <span style={styles.colorChip} title={`Hauptfarbe ${p.pigment.primary} · Muster ${p.pigment.accent}`}>
                      <i style={{ ...styles.colorDot, background: p.pigment.primary }} />
                      <i style={{ ...styles.colorDot, background: p.pigment.accent }} />
                    </span>
                    <span style={styles.broodName}>{c.name}</span>
                    <span style={styles.traitLine}>{p.dress} · {p.bearing} · {p.carapace.form}</span>
                    <span style={styles.broodStats}>
                      HP {c.stats.hp}{c.stats.hp === bestHp ? '' : ` −${bestHp - c.stats.hp}`} · ATK {c.stats.attack}
                      {c.stats.attack === bestAttack ? '' : ` −${bestAttack - c.stats.attack}`} · ×{c.stats.spawnX}
                    </span>
                    <span style={styles.broodHash}>{broodGenomeHash(c).slice(0, 10)}</span>
                    <span style={styles.broodIdx}>#{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {meta.pendingBroods.length > 0 && (
          <div style={styles.broodSection}>
            <h3 style={styles.sectionTitle}>{t('beetle.maturing')} ({meta.pendingBroods.length})</h3>
            {meta.pendingBroods.map(p => {
              const remaining = Math.max(0, p.neededWaves - (meta.totalWavesSurvived - p.startedWave));
              const isReady = readyBroods(meta).some(r => r.broodIndex === p.broodIndex);
              const rolled = rollBrood(
                p.parentAAncestor ?? p.specimenAId,
                p.parentBAncestor ?? p.specimenBId,
                p.broodIndex,
              );
              return (
                <div key={p.broodIndex} style={styles.pendingRow}>
                  <span style={styles.pendingLabel}>
                    {isReady ? t('beetle.ready') : (t('shop.maturing') as string).replace('{n}', String(remaining))}
                  </span>
                  {isReady && (
                    <div style={styles.broodRow}>
                      {rolled.map((c, i) => (
                        <button key={c.id} style={styles.broodCard} onClick={() => onMetaChange(claimBrood(p.broodIndex, i))}
                          data-tut="brood-claim">
                          <BeetleCanvas phenotype={beetlePhenotypeOf({ genome: c.genome, generation: c.generation ?? 1 })} size={72} title={c.name} />
                          <span style={styles.broodName}>{c.name}</span>
                          <span style={styles.broodStats}>HP {c.stats.hp} · ×{c.stats.spawnX}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function labelOf(a: BeetleAncestor): string {
  return `${BEETLES_SOURCE[a.specimenId]?.label ?? a.specimenId} (Gen ${a.generation})`;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  panel: { width: '100%', maxWidth: 640, background: '#f3ecd9', border: '2.5px solid var(--ink)', borderRadius: 8, boxShadow: '6px 6px 0 var(--ink)', padding: 22, color: 'var(--ink)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  nektar: { padding: '6px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  closeBtn: { width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  desc: { fontSize: 12, color: '#6b6250', margin: '0 0 14px', fontWeight: 600 },
  note: { marginBottom: 10, padding: '8px 10px', background: '#fdeec9', border: '2px solid #a16207', borderRadius: 8, color: '#78350f', fontSize: 12, fontWeight: 700 },
  parentLine: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: 10 },
  parentSlot: { padding: '6px 10px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  clearBtn: { padding: '6px 10px', background: '#fff', border: '1.5px dashed var(--ink)', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#6b6250', cursor: 'pointer', minHeight: 40 },
  hintEmpty: { fontSize: 12, color: '#8a8065', fontWeight: 600 },
  specimenRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 },
  specimenCard: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 12, background: '#fff', borderWidth: '2.5px', borderStyle: 'solid', borderColor: 'var(--ink)', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)', boxShadow: '3px 3px 0 var(--ink)' },
  specimenSelected: { background: '#fdeec9', borderColor: '#a16207', boxShadow: '3px 3px 0 #a16207' },
  specimenName: { fontSize: 13, fontWeight: 800 },
  specimenStats: { fontSize: 10, color: '#6b6250', fontWeight: 700 },
  specimenTag: { position: 'absolute', top: -8, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#a16207', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ink)' },
  breedBtn: { width: '100%', padding: 14, background: '#d9a441', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', color: '#2b2b26', fontSize: 14, fontWeight: 800, boxShadow: '3px 3px 0 var(--ink)', marginBottom: 14 },
  broodSection: { marginTop: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 12, color: '#6b6250', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 8, fontWeight: 800 },
  broodRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 },
  broodCard: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 10, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', cursor: 'pointer', color: 'var(--ink)', fontSize: 11, fontWeight: 700 },
  broodName: { fontSize: 11, fontWeight: 800, textAlign: 'center' as const },
  traitLine: { fontSize: 10, color: '#7c4a2c', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  broodStats: { fontSize: 10, color: '#6b6250', fontWeight: 700 },
  // Farbfeld: die Hauptfarbe des Panzers und die Musterfarbe nebeneinander — die Wahl "welches
  // Tier" ist auch eine Farbwahl, und sie muss am Tier selbst ablesbar sein (Spieltest-Befund).
  colorChip: { display: 'flex', gap: 3 },
  colorDot: { width: 14, height: 14, borderRadius: 4, border: '1.5px solid var(--ink)', display: 'block' },
  broodHash: { fontSize: 9, fontFamily: 'ui-monospace, Menlo, monospace', color: '#8a8065' },
  broodIdx: { position: 'absolute', top: -8, left: -6, width: 20, height: 20, borderRadius: '50%', background: '#2b2b26', color: '#f5efdc', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pendingRow: { marginBottom: 10, padding: 10, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8 },
  pendingLabel: { fontSize: 12, fontWeight: 800, color: '#a16207', display: 'block', marginBottom: 6 },
};
