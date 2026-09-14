import { useMemo, useState } from 'react';
import type { MetaSave } from '../types';
import type { TranslationKey } from '../i18n';
import { useI18n } from '../i18n';
import { buySeed } from '../meta';
import { SEED_SHOP_BASE_PRICE, SEED_SHOP_PRICE_STEP, SEED_SHOP_OFFERS } from '../config/economy.source';

// Owner: UI (SeedShop screen). LOC ≤ 400.
// Der SEED-SHOP — fachlich getrennt vom Gewächshaus (Befund P2: ein Panel,
// zwei Verantwortlichkeiten). Der Shop verkauft SAMEN (Nektar → seedStash);
// das Aussäen/Reifen gehört ins Gewächshaus. Bestehende Meta-Owner bleiben:
// buySeed (persistence/) ist der einzige Writer für Kauf-Transaktionen.

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onClose: () => void;
};

export function SeedShop({ meta, onMetaChange, onClose }: Props) {
  const { t } = useI18n();
  const [note, setNote] = useState<string | null>(null);

  const offers = useMemo(() => buildOffers(meta), [meta]);

  const handleBuy = (price: number) => {
    const m = buySeed(price);
    if (m) {
      onMetaChange(m);
      setNote(t('shop.buy') + ' ✓');
      setTimeout(() => setNote(null), 1500);
    }
  };

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
        {note && <div style={styles.note}>{note}</div>}

        <div style={styles.offersRow}>
          {offers.map(o => (
            <button
              key={o.id}
              style={{ ...styles.offerCard, opacity: meta.nektar < o.price ? 0.45 : 1 }}
              onClick={() => handleBuy(o.price)}
              disabled={meta.nektar < o.price}
            >
              <span style={styles.rarity}>{t(rarityKey(o.rarity))}</span>
              <span style={styles.offerPrice}>🍯 {o.price}</span>
              <span style={styles.offerHint}>→ +1 {t('shop.stash')}</span>
            </button>
          ))}
        </div>

        <div style={styles.stockRow}>
          <span>{t('shop.stash')}: <strong>{meta.seedStash}</strong></span>
          <span style={styles.stockHint}>{t('shop.sow')}</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers (pure, module-level) ─────────────────────────────

function rarityKey(r: 'common' | 'rare' | 'exotic'): TranslationKey {
  return (r === 'common' ? 'shop.rarity.common' : r === 'rare' ? 'shop.rarity.rare' : 'shop.rarity.exotic') as TranslationKey;
}

/** Deterministische Shop-Angebote: rotieren mit der Gesamtkaufzahl ( Quelle: Greenhouse.buildOffers). */
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
    position: 'fixed', inset: 0, background: 'rgba(43,43,38,0.55)', zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  },
  panel: {
    width: '92vw', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto',
    background: 'var(--paper-warm)', border: '2.5px solid var(--ink)', borderRadius: 8,
    boxShadow: '6px 6px 0 var(--ink)', padding: 22, color: 'var(--ink)',
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  nektar: { padding: '6px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  stash: { padding: '6px 12px', background: '#eef7e6', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  closeBtn: { width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  desc: { fontSize: 12, color: '#6b6250', margin: '0 0 14px', fontWeight: 600 },
  note: { marginBottom: 10, padding: '8px 10px', background: '#eef7e6', border: '2px solid var(--leaf-dark)', borderRadius: 8, color: 'var(--leaf-dark)', fontSize: 12, fontWeight: 700 },
  offersRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 },
  offerCard: { display: 'flex', flexDirection: 'column', gap: 6, padding: 14, background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)', boxShadow: '3px 3px 0 var(--ink)' },
  rarity: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#6b6250', fontWeight: 800 },
  offerPrice: { fontSize: 16, fontWeight: 800, color: 'var(--ink)' },
  offerHint: { fontSize: 10, color: '#8a8065', fontWeight: 600 },
  stockRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, fontSize: 13, fontWeight: 700 },
  stockHint: { color: '#8a8065', fontSize: 11, fontWeight: 600 },
};
