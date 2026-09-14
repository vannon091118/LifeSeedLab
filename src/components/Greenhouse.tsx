// Owner: UI (Greenhouse screen). LOC ≤ 400.
// Gacha-Zucht: keine Elternwahl. Samen kaufen → Aussaat würfelt Elternpaar + Kind
// deterministisch (rollGachaCross). Kreuzung reift X überlebte Wellen (economy.source).
// Jede gekeimte Pflanze schreibt einen Discovery-Chain-Eintrag (hash-linked).

import { useMemo, useState } from 'react';
import type { MetaSave, PlantVariant } from '../types';
import type { TranslationKey } from '../i18n';
import { useI18n } from '../i18n';
import { rollGachaCross, deriveGachaSeed, createBaseVariants, type GachaRoll } from '../genome';
import { buySeed, consumeSeed, enqueueCross, registerVariant } from '../meta';
import { SEED_SHOP_BASE_PRICE, SEED_SHOP_PRICE_STEP, SEED_SHOP_OFFERS, wavesToUnlockFor } from '../config/economy.source';

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

  const owned: PlantVariant[] = useMemo(() => {
    return Object.keys(meta.variantCounts)
      .filter(id => (meta.variantCounts[id] ?? 0) > 0)
      .map(id => BASES.find(v => v.id === id) ?? meta.savedVariants.find(v => v.id === id))
      .filter((v): v is PlantVariant => v !== undefined);
  }, [meta]);

  const canSow = meta.seedStash > 0 && owned.length >= 2;

  const handleBuy = (price: number) => {
    const m = buySeed(price);
    if (m) onMetaChange(m);
  };

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

  const offers = useMemo(() => buildOffers(meta), [meta]);

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('shop.title')}</h2>
          <div style={styles.headerRight}>
            <span style={styles.nektar}>🍯 {meta.nektar}</span>
            <span style={styles.stash}>{t('shop.stash')}: {meta.seedStash}</span>
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>
        <p style={styles.desc}>{t('shop.desc')}</p>
        {shareNote && <div style={styles.shareNote}>{shareNote}</div>}

        {/* Shop-Angebote (deterministisch) */}
        <div style={styles.offersRow}>
          {offers.map(o => (
            <button key={o.id} style={styles.offerCard} onClick={() => handleBuy(o.price)} disabled={meta.nektar < o.price}>
              <span style={styles.rarity}>{t(rarityKey(o.rarity))}</span>
              <span style={styles.offerPrice}>🍯 {o.price}</span>
            </button>
          ))}
        </div>

        {/* Aussaat */}
        <button onClick={handleSow} disabled={!canSow} style={{ ...styles.sowBtn, opacity: canSow ? 1 : 0.4 }}>
          🌱 {t('shop.sow')}
        </button>

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

/** Ist die Kreuzung mit diesem Index gereift? (true =claim-bar) */
function crossReady(meta: MetaSave, crossIndex: number): boolean {
  const entry = meta.pendingCrosses.find(c => c.crossIndex === crossIndex);
  if (!entry) return true;
  return (meta.totalWavesSurvived - entry.startedWave) >= entry.neededWaves;
}

function rarityKey(r: 'common' | 'rare' | 'exotic'): TranslationKey {
  return (r === 'common' ? 'shop.rarity.common' : r === 'rare' ? 'shop.rarity.rare' : 'shop.rarity.exotic') as TranslationKey;
}

/** Deterministische Shop-Angebote: rotieren mit der Gesamtkaufzahl. */
function buildOffers(meta: MetaSave): { id: string; price: number; rarity: 'common' | 'rare' | 'exotic' }[] {
  const n = meta.breedGeneration + meta.seedStash;
  const out: { id: string; price: number; rarity: 'common' | 'rare' | 'exotic' }[] = [];
  for (let i = 0; i < SEED_SHOP_OFFERS; i++) {
    const tier = (n + i) % 3;
    out.push({
      id: `offer_${(n + i) % 7}`,
      price: SEED_SHOP_BASE_PRICE + ((n + i) % 3) * SEED_SHOP_PRICE_STEP,
      rarity: tier === 0 ? 'common' : tier === 1 ? 'rare' : 'exotic',
    });
  }
  return out;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.85)', zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  panel: {
    width: '92vw', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto',
    background: 'rgba(15,23,42,0.95)', border: '1px solid #1e293b', borderRadius: 18, padding: 22,
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: 700, color: '#e5e7eb', margin: 0 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  nektar: { padding: '6px 12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, color: '#fbbf24', fontSize: 13 },
  stash: { padding: '6px 12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, color: '#4ade80', fontSize: 13 },
  closeBtn: { width: 32, height: 32, background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', cursor: 'pointer' },
  desc: { fontSize: 12, color: '#6b7280', margin: '0 0 14px' },
  shareNote: { marginBottom: 10, padding: '8px 10px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.28)', borderRadius: 8, color: '#c4b5fd', fontSize: 12, wordBreak: 'break-all' as const },
  offersRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 },
  offerCard: { display: 'flex', flexDirection: 'column', gap: 6, padding: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, cursor: 'pointer', color: '#e5e7eb' },
  rarity: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#a78bfa' },
  offerPrice: { fontSize: 16, fontWeight: 700, color: '#fbbf24' },
  sowBtn: { width: '100%', padding: 14, fontSize: 15, fontWeight: 700, color: '#0a0a0f', background: 'linear-gradient(135deg,#4ade80,#22c55e)', border: 'none', borderRadius: 10, cursor: 'pointer', marginBottom: 14 },
  resultCard: { padding: 16, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, marginBottom: 14 },
  resultTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#a78bfa', marginBottom: 6 },
  childRow: { display: 'flex', gap: 12, alignItems: 'center' },
  preview: { width: 44, height: 44, borderRadius: 10 },
  childInfo: { flex: 1 },
  childName: { fontSize: 17, color: '#f1f5f9' },
  traitRow: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  traitTag: { fontSize: 10, background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: 99 },
  parentsLine: { fontSize: 12, color: '#6b7280', margin: '10px 0 4px' },
  maturationLine: { fontSize: 12, color: '#fbbf24', marginBottom: 10 },
  resultActions: { display: 'flex', gap: 8 },
  claimBtn: { flex: 1, padding: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#a78bfa', cursor: 'pointer', fontSize: 13 },
  shareBtn: { padding: '10px 14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  pendingRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  sectionTitle: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  pendingItem: { fontSize: 12, color: '#6b7280', padding: '6px 10px', background: '#0f172a', borderRadius: 8 },
};
