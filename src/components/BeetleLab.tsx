import { useMemo, useState } from 'react';
import type { MetaSave, BeetleSpecimen } from '../types';
import type { TranslationKey } from '../i18n';
import { useI18n } from '../i18n';
import { enqueueBrood, readyBroods, claimBrood } from '../meta';
import { rollBrood, broodGenomeHash, beetlePower } from '../genome/beetle';
import { BEETLES_SOURCE, beetleWavesToUnlock } from '../config/beetles.source';
import { BugIcon } from './MenuIcons';

// Owner: UI (BeetleLab screen). LOC ≤ 400.
// P6/P8: BRÜTEN — mechanisch + präsentatorisch KEINE Kopie der Pflanzenzucht:
//   • Elternwahl ist BEWUSST (beide Tiere chosen), kein Samen-Gacha
//   • ganze Genome mergen statt mutieren → Kinder ähneln erkennbar den Eltern
//   • Bernstein/Tusche-Präsentation (amber), keine Grün-Töne, kein chime

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onClose: () => void;
};

const BREED_COST = 35; // Nektar pro Brut (Source: BEETLE_BREED bleibt Sim-Parameter)

export function BeetleLab({ meta, onMetaChange, onClose }: Props) {
  const { t } = useI18n();
  const [parentA, setParentA] = useState<string | null>(null);
  const [parentB, setParentB] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const specimens = BEETLES_SOURCE;
  const specimenIds = Object.keys(specimens);
  const ready = readyBroods(meta);
  const lastBrood = meta.beetles[meta.beetles.length - 1] as BeetleSpecimen | undefined;

  // Live-Brutvorschau: deterministisch dieselben 3 Kandidaten, die enqueue produzieren würde
  const preview = useMemo(() => {
    if (!parentA || !parentB) return [];
    const nextGen = meta.pendingBroods.reduce((m, p) => Math.max(m, p.broodIndex), -1) + 1;
    return rollBrood(parentA, parentB, nextGen);
  }, [parentA, parentB, meta.pendingBroods]);

  const handleBreed = () => {
    if (!parentA || !parentB) { setNote(t('beetle.needTwo')); return; }
    if (meta.nektar < BREED_COST) { setNote(t('beetle.notEnoughNektar')); return; }
    const waves = beetleWavesToUnlock(
      preview.reduce((s, c) => s + beetlePower(c.genome), 0) / Math.max(1, preview.length)
    );
    const m = enqueueBrood(parentA, parentB, waves);
    if (m) {
      onMetaChange(m);
      setNote(t('beetle.enqueued').replace('{n}', String(waves)));
      setParentA(null); setParentB(null);
      setTimeout(() => setNote(null), 2200);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('beetle.title')}</h2>
          <div style={styles.headerRight}>
            <span style={styles.nektar}>🍯 {meta.nektar}</span>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>
        <p style={styles.desc}>{t('beetle.desc')}</p>
        {note && <div style={styles.note}>{note}</div>}

        {/* Basen-Tiere — bewusste Elternwahl (P8-Identität: kein Gacha) */}
        <div style={styles.specimenRow}>
          {specimenIds.map(id => {
            const s = specimens[id];
            const selA = parentA === id, selB = parentB === id;
            return (
              <button
                key={id}
                style={{ ...styles.specimenCard, ...(selA || selB ? styles.specimenSelected : {}) }}
                onClick={() => {
                  if (selA) setParentA(null);
                  else if (selB) setParentB(null);
                  else if (!parentA) setParentA(id);
                  else if (!parentB) setParentB(id);
                }}
              >
                <span style={{ ...styles.specimenDot, background: s.color }} aria-hidden />
                <span style={styles.specimenName}>{s.name}</span>
                <span style={styles.specimenStats}>HP {s.hp} · ATK {s.attack}</span>
                {(selA || selB) && <span style={styles.specimenTag}>{selA ? 'A' : 'B'}</span>}
              </button>
            );
          })}
        </div>

        <button onClick={handleBreed} style={{ ...styles.breedBtn, opacity: meta.nektar < BREED_COST ? 0.5 : 1 }} disabled={!parentA || !parentB}>
          {t('beetle.breed')} (🍯 {BREED_COST})
        </button>

        {/* Live-Brutvorschau: die 3 deterministischen Kandidaten */}
        {preview.length > 0 && (
          <div style={styles.broodSection}>
            <h3 style={styles.sectionTitle}>{t('beetle.preview')}</h3>
            <div style={styles.broodRow}>
              {preview.map((c, i) => (
                <div key={c.id} style={styles.broodCard}>
                  <span style={{ ...styles.specimenDot, background: c.color }} aria-hidden />
                  <span style={styles.broodName}>{c.name}</span>
                  <span style={styles.broodStats}>HP {c.stats.hp} · ATK {c.stats.attack} · ×{c.stats.spawnX}</span>
                  <span style={styles.broodHash}>{broodGenomeHash(c).slice(0, 10)}</span>
                  <span style={styles.broodIdx}>#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reifende Bruten */}
        {meta.pendingBroods.length > 0 && (
          <div style={styles.broodSection}>
            <h3 style={styles.sectionTitle}>{t('beetle.maturing')} ({meta.pendingBroods.length})</h3>
            {meta.pendingBroods.map(p => {
              const remaining = Math.max(0, p.neededWaves - (meta.totalWavesSurvived - p.startedWave));
              const isReady = ready.some(r => r.broodIndex === p.broodIndex);
              const rolled = rollBrood(p.specimenAId, p.specimenBId, p.broodIndex);
              return (
                <div key={p.broodIndex} style={styles.pendingRow}>
                  <span style={styles.pendingLabel}>
                    {isReady ? t('beetle.ready') : (t('shop.maturing') as string).replace('{n}', String(remaining))}
                  </span>
                  {isReady && (
                    <div style={styles.broodRow}>
                      {rolled.map((c, i) => (
                        <button key={c.id} style={styles.broodCard} onClick={() => onMetaChange(claimBrood(p.broodIndex, i))}>
                          <span style={{ ...styles.specimenDot, background: c.color }} aria-hidden />
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

        {/* Brut-Lager */}
        {lastBrood && (
          <div style={styles.broodSection}>
            <h3 style={styles.sectionTitle}>{t('beetle.library')} ({meta.beetles.length})</h3>
            <div style={styles.broodRow}>
              {[...meta.beetles].reverse().slice(0, 6).map(b => (
                <div key={b.id} style={styles.broodCard}>
                  <span style={{ ...styles.specimenDot, background: b.color }} aria-hidden />
                  <span style={styles.broodName}>{b.name}</span>
                  <span style={styles.broodStats}>HP {b.stats.hp} · ×{b.stats.spawnX}{b.stats.taunt ? ' · TAUNT' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Icon in MenuIcons.tsx (eine Präsentations-Verantwortung pro Datei)

const styles: Record<string, React.CSSProperties> = {
  // Screen-Betrieb: Vollbild-Inhalt in MenuScreenShell (kein Fixed-Overlay mehr)
  overlay: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  panel: { width: '100%', maxWidth: 620, background: '#f3ecd9', border: '2.5px solid var(--ink)', borderRadius: 8, boxShadow: '6px 6px 0 var(--ink)', padding: 22, color: 'var(--ink)' },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  nektar: { padding: '6px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  closeBtn: { width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  desc: { fontSize: 12, color: '#6b6250', margin: '0 0 14px', fontWeight: 600 },
  note: { marginBottom: 10, padding: '8px 10px', background: '#fdeec9', border: '2px solid #a16207', borderRadius: 8, color: '#78350f', fontSize: 12, fontWeight: 700 },
  specimenRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 },
  specimenCard: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 14, background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)', boxShadow: '3px 3px 0 var(--ink)' },
  specimenSelected: { background: '#fdeec9', borderColor: '#a16207', boxShadow: '3px 3px 0 #a16207' },
  specimenDot: { width: 22, height: 22, borderRadius: 7, border: '2px solid var(--ink)' },
  specimenName: { fontSize: 13, fontWeight: 800 },
  specimenStats: { fontSize: 10, color: '#6b6250', fontWeight: 700 },
  specimenTag: { position: 'absolute', top: -8, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#a16207', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--ink)' },
  breedBtn: { width: '100%', padding: 14, background: '#d9a441', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', color: '#2b2b26', fontSize: 14, fontWeight: 800, boxShadow: '3px 3px 0 var(--ink)', marginBottom: 14 },
  broodSection: { marginTop: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 12, color: '#6b6250', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 8, fontWeight: 800 },
  broodRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 },
  broodCard: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 10, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', cursor: 'pointer', color: 'var(--ink)', fontSize: 11, fontWeight: 700 },
  broodName: { fontSize: 11, fontWeight: 800, textAlign: 'center' as const },
  broodStats: { fontSize: 10, color: '#6b6250', fontWeight: 700 },
  broodHash: { fontSize: 9, fontFamily: 'ui-monospace, Menlo, monospace', color: '#8a8065' },
  broodIdx: { position: 'absolute', top: -8, left: -6, width: 20, height: 20, borderRadius: '50%', background: '#2b2b26', color: '#f5efdc', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pendingRow: { marginBottom: 10, padding: 10, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8 },
  pendingLabel: { fontSize: 12, fontWeight: 800, color: '#a16207', display: 'block', marginBottom: 6 },
};
