import { useMemo, useState } from 'react';
import type { MetaSave } from '../types';
import type { TranslationKey } from '../i18n';
import { useI18n } from '../i18n';
import { buySeedling, buyPoolItem } from '../meta';
import { SHOP_POOL_IDS, SHOP_POOLS_SOURCE, type ShopPoolId } from '../config/shop.source';
import { canAfford, poolOffers, type PoolOffer } from './shopPools';

// Owner: UI (SeedShop screen). LOC ≤ 400.
// Der SHOP — fachlich getrennt vom Gewächshaus (Befund P2: ein Panel, zwei Verantwortlichkeiten).
// Er bietet DREI getrennte Pools an (Samen / Tiles / Deko, Reihenfolge aus der Source); jeder Kauf
// zahlt mit Nektar und erhöht den Besitz. Was ein Pool enthält und was es kostet, steht in
// `config/shop.source.ts` — dieser Screen rendert nur und ruft den Writer.

type Props = {
  meta: MetaSave;
  onMetaChange: (m: MetaSave) => void;
  onClose: () => void;
};

export function SeedShop({ meta, onMetaChange, onClose }: Props) {
  const { t } = useI18n();
  const [note, setNote] = useState<string | null>(null);
  const [tab, setTab] = useState<ShopPoolId>(SHOP_POOL_IDS[0]);
  const pool = SHOP_POOLS_SOURCE[tab];

  // Pool-Angebote kommen AUS DER SOURCE — Preis und Bestand werden nicht im UI erfunden.
  const offers = useMemo(() => poolOffers(tab, meta), [tab, meta]);

  // EIN Kauf-Feedback für alle Pools (kein zweiter Hinweis-Kanal).
  const confirm = (m: MetaSave | null) => {
    if (!m) return;
    onMetaChange(m);
    setNote(t('shop.buy') + ' ✓');
    setTimeout(() => setNote(null), 1500);
  };

  // Der Writer hängt an der Pool-ART, nicht am Screen: `stock` bucht eine Stückzahl,
  // `generator` (Samen) keimt einen Keimling. Beide Preise liest der Writer selbst aus der Source.
  const handleBuy = (offer: PoolOffer) => {
    confirm(pool.kind === 'generator' ? buySeedling() : buyPoolItem(offer.key));
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('shop.title')}</h2>
          <div style={styles.headerRight}>
            <span style={styles.nektar}>🍯 {meta.nektar}</span>
            <button onClick={onClose} style={styles.closeBtn} aria-label={t('common.close')}>✕</button>
          </div>
        </div>
        <p style={styles.desc}>{t('shop.desc')}</p>

        {/* Getrennte Pools: Samen (Biologie) neben Tiles/Deko (Umgebung). Was ein Pool
            enthält, steht in der Source — der Reiter ist nur seine Sichtbarkeit. */}
        <div style={styles.tabsRow} role="tablist" aria-label={t('shop.pools')}>
          {SHOP_POOL_IDS.map(id => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              style={{ ...styles.tabBtn, ...(tab === id ? styles.tabBtnActive : null) }}
            >
              {t(SHOP_POOLS_SOURCE[id].i18nKey as TranslationKey)}
            </button>
          ))}
        </div>

        {note && <div style={styles.note}>{note}</div>}

        <div style={styles.offersRow}>
          {offers.map(o => (
            <button
              key={o.key}
              style={{ ...styles.offerCard, opacity: canAfford(meta, o) ? 1 : 0.45 }}
              onClick={() => handleBuy(o)}
              disabled={!canAfford(meta, o)}
              aria-label={`${t(o.labelKey as TranslationKey)} — 🍯 ${o.price}`}
            >
              <span style={styles.owned}>{t('shop.owned')} ×{o.owned}</span>
              <span style={styles.offerName}>{t(o.labelKey as TranslationKey)}</span>
              <span style={styles.offerPrice}>🍯 {o.price}</span>
              <span style={styles.offerHint}>
                → {t(pool.kind === 'generator' ? 'shop.germinate' : 'shop.addToStock')}
              </span>
            </button>
          ))}
        </div>

        {pool.kind === 'generator' && (
          <div style={styles.stockRow}>
            {/* B36 (Playtest R2 #6): Kein „Vorrat: 0“ mehr — ein Kauf keimt direkt, der
                Stash ist strukturell immer 0. Die Zeile nennt das, was WIRKLICH entsteht. */}
            <span style={styles.stockHint}>
              {t('shop.germinateHint').replace('{n}', String(meta.breedGeneration + 1))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Screen-Betrieb: Vollbild-Inhalt in MenuScreenShell (kein Fixed-Overlay mehr)
  overlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  panel: {
    width: '100%', maxWidth: 600,
    background: 'var(--paper-warm)', border: '2.5px solid var(--ink)', borderRadius: 8,
    boxShadow: '6px 6px 0 var(--ink)', padding: 22, color: 'var(--ink)',
  },
  header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  title: { flex: 1, fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  nektar: { padding: '6px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, boxShadow: '2px 2px 0 var(--ink)', fontSize: 13, fontWeight: 700 },
  closeBtn: { width: 34, height: 34, background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, color: 'var(--ink)', cursor: 'pointer', fontWeight: 800, boxShadow: '2px 2px 0 var(--ink)' },
  desc: { fontSize: 12, color: '#6b6250', margin: '0 0 14px', fontWeight: 600 },
  note: { marginBottom: 10, padding: '8px 10px', background: '#eef7e6', border: '2px solid var(--leaf-dark)', borderRadius: 8, color: 'var(--leaf-dark)', fontSize: 12, fontWeight: 700 },
  tabsRow: { display: 'flex', gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, padding: '9px 10px', background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 0.4, boxShadow: '3px 3px 0 var(--ink)' },
  // Aktiver Pool = Markisen-Amber (derselbe Ton wie der Markt-Awning im Hub) — vorher war
  // der Aktivtab dunkelgrün, dieselbe Familie wie alles andere: kein Zustand lesbar.
  tabBtnActive: { background: '#f3e0b0', color: '#6b4a10', borderColor: '#8a5f16', boxShadow: '2px 2px 0 #8a5f16' },
  offersRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 },
  offerName: { fontSize: 14, fontWeight: 800, color: 'var(--ink)' },
  offerCard: { display: 'flex', flexDirection: 'column', gap: 6, padding: 14, background: '#fff', border: '2.5px solid var(--ink)', borderRadius: 8, cursor: 'pointer', color: 'var(--ink)', boxShadow: '3px 3px 0 var(--ink)', transition: 'transform 0.08s ease' },
  owned: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#6b6250', fontWeight: 800 },
  offerPrice: { fontSize: 16, fontWeight: 800, color: 'var(--ink)' },
  offerHint: { fontSize: 10, color: '#8a8065', fontWeight: 600 },
  stockRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', border: '2px solid var(--ink)', borderRadius: 8, fontSize: 13, fontWeight: 700 },
  stockHint: { color: '#8a8065', fontSize: 11, fontWeight: 600 },
};
