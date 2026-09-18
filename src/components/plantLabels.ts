// Owner: UI (Label-Auflösung). LOC ≤ 200.
// F4 (Spielfluss-Audit): Tray- und Karten-Labels zweisprachig. Eine Quelle statt Kopien:
// die Source trägt i18nKey (Content-Truth verweist), die UI löst über die i18n-Schicht auf.
// Fallback-Kette: i18n-Key → Source-Label (deutsch, kanonisch) → Roh-ID (N3: loan_sprout
// hat keinen Source-Eintrag ⇒ 'plant.loanSprout' greift explizit).
import { PLANTS_SOURCE } from '../config/plants.source';
import { MAP_TILES_SOURCE, type MapTileType } from '../config/map.source';
import { translations, type TranslationKey } from '../i18n/translations';

/** Sprachunabhängige Roh-IDs → i18n-Key (N3: Varianten ohne Source-Verankerung). */
const EXTRA_LABEL_KEYS: Record<string, TranslationKey> = {
  loan_sprout: 'plant.loanSprout',
};

/** Auflösung für Pflanzen-/Varianten-Labels (Tray-Karten, Nachkauf, aria-labels). */
export function plantLabelKey(variantId: string): TranslationKey | null {
  const base = (PLANTS_SOURCE as Record<string, { i18nKey?: string }>)[variantId];
  const key = base?.i18nKey ?? EXTRA_LABEL_KEYS[variantId];
  return (key && key in translations.en) ? key as TranslationKey : null;
}

/** Auflösung für Feld-Tile-Labels (Tray-Sektion FELD). */
export function tileLabelKey(tile: MapTileType): TranslationKey | null {
  const key = (MAP_TILES_SOURCE[tile] as { i18nKey?: string }).i18nKey;
  return (key && key in translations.en) ? key as TranslationKey : null;
}

/** Deutsche Kanon-Form als Fallback (Source-Truth), falls ein Key fehlen sollte. */
export function plantLabelFallback(variantId: string): string {
  return (PLANTS_SOURCE as Record<string, { label?: string }>)[variantId]?.label ?? variantId;
}
export function tileLabelFallback(tile: MapTileType): string {
  return MAP_TILES_SOURCE[tile]?.label ?? tile;
}
