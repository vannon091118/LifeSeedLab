import { useState } from 'react';
import type { MetaSave, PlantVariant } from '../types';
import type { TranslationKey } from '../i18n';
import { useI18n } from '../i18n';
import { rollGachaCross, deriveGachaSeed, createBaseVariants, type GachaRoll } from '../genome';
import { consumeSeed, enqueueCross, registerVariant } from '../meta';
import { wavesToUnlockFor } from '../config/economy.source';

// Owner: UI (Greenhouse screen). LOC ≤ 400.
// GEWÄCHSHAUS — fachlich getrennt vom SeedShop (P2): Hier wird AUSSÄT + REIFUNG +
// ERGEBNIS-Übernahme gespielt. Kauf von Samen gehört in den SeedShop (eigene Datei,
// gleiche Meta-Owner). Keine Dopplung: consumeSeed/enqueueCross/registerVariant
// bleiben die einzigen Writer in persistence/.

const BASES: PlantVariant[] = createBaseVariants();

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onClose: () => void;
};

export function Greenhouse({ meta, onMetaChange, onClose }: Props) {
  const { t } = useI18n();
  const [lastRoll, setLastRoll] = useState<GachaRoll | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const owned: PlantVariant[] = useMemoOwned(meta);

  const canSow = meta.seedStash > 0 && owned.length >= 2;

  const handleSow = () => {
    if (!canSow) return;
    const crossIndex = meta.breedGeneration;
    const gachaSeed = deriveGachaSeed(crossIndex);
    const roll = rollGachaCross(owned, gachaSeed, crossIndex);
    if (!roll) return;
    if (!consumeSeed()) return;
    // Kind ist fest (seed); Reifung startet JETZT
    const m = enqueueCross(gachaSeed, crossIndex, meta.totalWavesSurvived);
    setLastRoll(roll);
    onMetaChange(m);
  };

  const handleKeep = async (roll: GachaRoll) => {
    // Reifungs-Vertrag: behalten erst nach X überlebten Wellen (economy.source)
    if (!crossReady(meta, roll.crossIndex)) return;
    const m = registerVariant(roll.child);
    onMetaChange(m);
    setLastRoll(null);
    // Discovery-Chain: append-only, hash-linked, lokale Deduplizierung
    try {
      const { appendDiscovery } = await import('../discovery/codex');
      const { hashGenome } = await import('../discovery/chain');
      const res = appendDiscovery({
        genome: roll.child.genome,
        parents: [roll.parentA.id, roll.parentB.id],
        seed: deriveGachaSeed(roll.crossIndex),
        generation: roll.crossIndex,
      });
      if (res.appended) setShareNote(`${t('discovery.appended')}: ${hashGenome(roll.child.genome)}`);
      else if (res.reason) setShareNote(t('discovery.duplicate'));
      setTimeout(() => setShareNote(null), 2200);
    } catch {
      // discovery is additive — never block the claim
    }
  };

  const handleShareSeed = async (roll: GachaRoll) => {
    const { appendDiscovery, seedShareText } = await import('../discovery/codex');
    // ensure entry exists before sharing (idempotent due to tryAppend)
    appendDiscovery({
      genome: roll.child.genome,
      parents: [roll.parentA.id, roll.parentB.id],
      seed: deriveGachaSeed(roll.crossIndex),
      generation: roll.crossIndex,
    });
    const text = seedShareText(deriveGachaSeed(roll.crossIndex), roll.crossIndex, roll.child.genome);
    try {
      await navigator.clipboard.writeText(text);
      setShareNote(t('codex.copied'));
    } catch {
      setShareNote(text);
    }
    setTimeout(() => setShareNote(null), 1800);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('greenhouse.title')}</h2>
          <div style={styles.headerRight}>
            <span style={styles.stash}>{t('shop.stash')}: {meta.seedStash}</span>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>
        <p style={styles.desc}>{t('greenhouse.desc')}</p>
        {shareNote && <div style={styles.shareNote}>{shareNote}</div>}

        {/* Aussaat */}
        <button onClick={handleSow} disabled={!canSow} style={{ ...styles.sowBtn, opacity: canSow ? 1 : 0.4 }}>
          🌱 {t('shop.sow')}
        </button>
        {!canSow && meta.seedStash <= 0 && <div style={styles.hint}>{t('shop.sowEmpty')}</div>}
        {!canSow && meta.seedStash > 0 && owned.length < 2 && <div style={styles.hint}>{t('shop.needTwo')}</div>}

        {/* Gacha-Ergebnis */}
        {lastRoll && (
          <div style={styles.resultCard}>
            <div style={styles.resultTitle}>{t('gacha.result')}</div>
            <div style={styles.childRow}>
              <div style={{ ...styles.preview, background: lastRoll.child.color }} />
              <div style={styles.childInfo}>
                <strong style={styles.childName}>{lastRoll.child.name}</strong>
                <div style={styles.traitRow}>
                  {lastRoll.child.traits.slice(0, 3).map(tr => (
                    <span key={tr} style={styles.traitTag}>{tr}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.parentsLine}>
              {t('gacha.parents')} {lastRoll.parentA.name} × {lastRoll.parentB.name}
            </div>
            <div style={styles.maturationLine}>
              {wavesToUnlockFor(lastRoll.crossIndex)} — {t('shop.maturing').replace('{n}', String(wavesToUnlockFor(lastRoll.crossIndex)))}
            </div>
            <div style={styles.resultActions}>
              <button
                onClick={() => handleKeep(lastRoll)}
                style={{ ...styles.claimBtn, opacity: crossReady(meta, lastRoll.crossIndex) ? 1 : 0.45 }}
                disabled={!crossReady(meta, lastRoll.crossIndex)}
              >
                {crossReady(meta, lastRoll.crossIndex) ? t('shop.ready') : t('shop.maturing').replace('{n}', String(wavesToUnlockFor(lastRoll.crossIndex)))}
              </button>
              <button onClick={() => handleShareSeed(lastRoll)} style={styles.shareBtn}>⧉ {t('codex.share')}</button>
            </div>
          </div>
        )}

        {/* Reifungs-Queue */}
        {meta.pendingCrosses.length > 0 && (
          <div style={styles.pendingRow}>
            <span style={styles.sectionTitle}>
              {t('shop.pending').replace('{n}', String(meta.pendingCrosses.length))}
            </span>
            {meta.pendingCrosses.map((c, i) => (
              <div key={i} style={styles.pendingItem}>
                {t('shop.maturing').replace('{n}', String(c.neededWaves))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers (pure, module-level) ─────────────────────────────

/** Ist die Kreuzung mit diesem Index gereift? (true = claim-bar) */
function crossReady(meta: MetaSave, crossIndex: number): boolean {
  const entry = meta.pendingCrosses.find(c => c.crossIndex === crossIndex);
  if (!entry) return true;
  return (meta.totalWavesSurvived - entry.startedWave) >= entry.neededWaves;
}

/** Besitz-Liste (kanonische IDs; Altsaves mit base_*-Counts bleiben sichtbar). */
function useMemoOwned(meta: MetaSave): PlantVariant[] {
  return Object.keys(meta.variantCounts)
    .filter(id => (meta.variantCounts[id] ?? 0) > 0)
    .map(id => BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id))
    .filter((v): v is PlantVariant => v !== undefined);
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(43,43,38,0.55)', zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  panel: {
    width: '92vw', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
    background: 'var(--paper-warm)', border: '2.5px solid var(--ink)', borderRadius: 8,
    boxShadow: '6px 6px 0 var(--ink)', padding: 22, color: 'var(--ink)',
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  stash: { padding: '6px 12px', background: '#eef7e6', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  closeBtn: { width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  desc: { fontSize: 12, color: '#6b6250', margin: '0 0 14px', fontWeight: 600 },
  shareNote: { marginBottom: 10, padding: '8px 10px', background: '#fff', border: '2px solid var(--leaf-dark)', borderRadius: 8, color: 'var(--leaf-dark)', fontSize: 12, fontWeight: 700, wordBreak: 'break-all' as const },
  sowBtn: { width: '100%', padding: 14, fontSize: 15, fontWeight: 800, color: '#fff', background: 'var(--leaf)', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', boxShadow: '3px 3px 0 var(--ink)', marginBottom: 8 },
  hint: { fontSize: 11, color: '#8a8065', marginBottom: 10, fontWeight: 600 },
  resultCard: { padding: 16, background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 8, boxShadow: '3px 3px 0 var(--ink)', marginBottom: 14 },
  resultTitle: { fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#6b6250', marginBottom: 6, fontWeight: 800 },
  childRow: { display: 'flex', gap: 12, alignItems: 'center' },
  preview: { width: 44, height: 44, borderRadius: 10, border: '2px solid var(--ink)' },
  childInfo: { flex: 1 },
  childName: { fontSize: 17, color: 'var(--ink)' },
  traitRow: { display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 4 },
  traitTag: { fontSize: 10, background: '#f0fdf4', color: '#6b6250', padding: '2px 8px', borderRadius: 99, border: '1.5px solid var(--ink)', fontWeight: 700 },
  parentsLine: { fontSize: 12, color: '#6b6250', margin: '10px 0 4px', fontWeight: 600 },
  maturationLine: { fontSize: 12, color: '#8a6d1f', marginBottom: 10, fontWeight: 700 },
  resultActions: { display: 'flex', gap: 8 },
  claimBtn: { flex: 1, padding: 10, background: '#eef7e6', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontSize: 13, fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  shareBtn: { padding: '10px 14px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)' },
  pendingRow: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  sectionTitle: { fontSize: 12, color: '#6b6250', textTransform: 'uppercase' as const, letterSpacing: 1, fontWeight: 800 },
  pendingItem: { fontSize: 12, color: '#6b6250', padding: '6px 10px', background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 8, fontWeight: 600 },
};
