// Owner: Source (content truth). LOC ≤ 200.
// Map-System-Quelle (P5): Tile-Typen, Kosten, Pathfinding-Regeln. Kein Code außerhalb
// config/ darf diese Werte definieren. Das Grundraster (GRID_COLS/ROWS) bleibt in
// world.source — hier kommen nur die Spieler-Elemente DARAUF (ein Raster, ein Owner).

/** Tile-Typen, die der Spieler platzieren kann.
 *  KEIN Weg-Tile (Entscheidung 21.09.2026): Der Laufweg ist das Ergebnis des Pathfindings —
 *  er wird nicht gebaut. Was der Spieler setzt, sind HINDERNISSE (Topf) und Deko;
 *  ein Element, das den Weg nur ANZIEHT, hätte die Route zur Eingabe gemacht.
 *  Der FINDLING fiel mit dem Weg (21.09.2026): Blockieren ist eine Aussage, und der Topf
 *  macht sie bereits — ein zweiter reiner Blocker war Redundanz (und Fracht für Shop, i18n,
 *  Sprite und jeden Test-Fixture). */
export type MapTileType = 'pot' | 'decor';

interface MapTileSource {
  id: MapTileType;
  /** Anzeigename (UI/Tray) — die Spielwelt benennt deutsch (vgl. names.source). */
  label: string;
  /** F4: i18n-Key der Übersetzung (translations.ts) — Content-Truth verweist, UI liest i18n. */
  i18nKey: string;
  /** NEKTAR-Preis im Shop (AUSSERHALB des Runs) — im Run gibt es keine Kosten mehr:
   *  der Spieler kauft sich einen Pool und verbaut ihn, so viel er will (#4). */
  price: number;
  /** Pathfinding-Beteiligung: walkable = Gegner laufen darüber, block = Wand. */
  walkable: boolean;
  /** Pfad-Gewicht der Zelle: 1 = Grundkosten. Der Wert wird NUR für `walkable: true` gelesen
   *  (Wände werden vorher übersprungen) — nach dem Weg-Schnitt führt ihn kein Tile mehr ≠1.
   *  Das Feld bleibt der Kosten-Haken des Dijkstra, s. `mapSystem.tileWeight`. */
  weight: number;
  /** max. Tiles dieses Typs pro Map (Balance-Klemme, verhindert Weg-Mauern). */
  maxCount: number;
}

export const MAP_TILES_SOURCE: Record<MapTileType, MapTileSource> = {
  // Blumentopf: BOOSTER für die Pflanze auf ihm — Farbe ⇒ Wirkung (config/pot.source.ts),
  // Zell-gebunden abgeleitet (simulation/potBoost.ts). Er blockiert den Weg (`walkable:false`)
  // UND verstärkt: das ist EINE Aussage, nicht zwei Lesarten desselben Objekts.
  pot:     { id: 'pot',     label: 'Blumentopf', i18nKey: 'map.pot', price: 15, walkable: false, weight: 999, maxCount: 24 },
  // Deko: rein kosmetisch, begehbar, keine Path-Bedeutung
  decor:   { id: 'decor',   label: 'Deko', i18nKey: 'map.decor',       price: 3,  walkable: true,  weight: 1, maxCount: 20 },
};

export const MAP_TILE_IDS = Object.keys(MAP_TILES_SOURCE) as MapTileType[];

/** Grund-Gewicht für un-bebaut begehbare Zellen (Papier-Wiese). */
export const MAP_DEFAULT_WEIGHT = 1;

/** D4 (Drift-Befund): Kosten-Beaufschlagung einer Zelle MIT Pflanze im Route-Dijkstra.
 *  Die entscheidende Maze-Balance-Schraube: wie stark das Zucht-Layout den Laufweg beugt.
 *  Muss aus der Simulation gelockt bleiben — balance-Änderungen sind Source-Änderungen. */
export const PLANT_ROUTE_COST = 2;

// R2-Neubau: Es gibt keinen Fallback-Pfad mehr (die Integritätsregel ersetzt ihn),
// keinen Spawn-Korridor (die Spawn-Spalte ist normale Welt — der Pfad STARTET dort)
// und keinen 8×8-Baubereich-Hardcode (die Fläche ist die freigeschaltete Welt).
// EXPAND_MAP vergrößert die ganze Fläche (mapSystem.expandMap, EXPAND_STEP Zellen je
// Richtung) — die Persistenz spiegelt das in die Welt (worldAutor), sie überlebt den Run.

/**
 * Startmaterial eines frischen Profils (#4): der Run beginnt mit einem kleinen Pool —
 * bemessen am alten Startbudget (150 Energie/5 pro Weg usw.), nur ohne Energierechnung.
 * Alles Weitere wird im Shop mit Nektar gekauft und dem Besitz zugeschlagen.
 */
export const STARTING_TILE_POOL: Record<MapTileType, number> = {
  pot: 6,
  decor: 6,
};

/**
 * FELD (Feld-Erweiterung, #3/#4): kein Map-Tile, sondern ein POOL-Gegenstand. Ein Feld
 * vergrößert die freigeschaltete Weltfläche (EXPAND_STEP je Richtung) — bezahlt wird es
 * mit Nektar im Shop, verbraucht im Run. Preis = alte Erweiterungs-Basis (EXPAND_BASE_COST).
 */
export const PLOT_POOL_KEY = 'plot';
export const PLOT_PRICE = 30;

/**
 * FAIRES STARTMATERIAL — EINE Wahrheit für „jedes Profil kann sofort bauen" (19.09.2026).
 *
 * Vorher lag dieser Vorrat als Gabe in JEDEM Run (`freshState`), während `defaultMeta` einem
 * frischen Profil NICHTS gab: Bau-Material war damit kein Besitz, und die Shop-Preise darunter
 * waren tote Zahlen — Kaufen konnte die ohnehin jede Runde neu geschenkte Menge nur verdoppeln.
 * Jetzt gilt das Besitz-Modell: dieses Material bekommt JEDES Profil genau EINMAL
 * (`meta/store.ts#materialGranted`, auch Altsaves), Bauen verbraucht es, der Rest wandert am
 * Run-Ende zurück, und der Shop erhöht den Besitz.
 */
export const STARTING_MATERIAL: Record<string, number> = { ...STARTING_TILE_POOL, [PLOT_POOL_KEY]: 1 };

/** ALLE Material-Schlüssel (Tiles + Feld) — die Menge, die als BESITZ geführt wird und die der
 *  Shop über `buyPoolItem` erhöht. Welcher Pool sie anbietet, steht in `config/shop.source.ts`. */
export const POOL_KEYS: readonly string[] = [
  ...MAP_TILE_IDS, PLOT_POOL_KEY,
];
