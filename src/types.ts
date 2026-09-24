// Owner: Source (types). LOC ≤ 200.
// Meta- und Breeding-Typen. Entity-/Sim-Typen leben in simulation/state.ts (eine Wahrheit).

// ── Genome & Traits ──────────────────────────────────────────
export type Allele = {
  id: string;
  power: number;
  dominant: boolean;
};

/**
 * Ein Gen-Slot mit zwei vererbbaren Allelen. Die Top-Level-Felder sind der Rückwärts-
 * kompatible, ausgeprägte Allel-Snapshot; `alleles` ist die vollständige Genotyp-Wahrheit.
 * Alte Saves dürfen die Top-Level-Form ohne `alleles` weiterlesen.
 */
export type Gene = Allele & {
  alleles?: [Allele, Allele];
};

export type Genome = Gene[];

export type PlantType = 'shooter' | 'wall' | 'support';

/**
 * Ballistik-Profil EINES Schusses — abgeleitet aus dem Genom (`genome/ballistics.ts`), nie
 * aus dem gejitterten Phänotyp (D5): Gameplay darf nicht an Präsentations-Streuung hängen.
 * Alle Felder sind Zahlen (JSON-sicher, kein Verhalten in Objekten).
 *
 * Ein Profil entsteht an genau zwei Stellen — aus dem Basis-Genom (`plants.source`) und beim
 * Eintrag einer gezüchteten Variante (`meta/store.deriveBredEntry`). Fehlt es (Altsave), gilt
 * das Legacy-Profil aus den Effekt-Tags (`legacyProfileFromEffects`).
 */
export interface BallisticProfile {
  /** Zellen/Tick, ganzzahlig in 1e-4 abgeleitet (keine Gleitkomma-Drift). */
  speed: number;
  /** Zusätzlich durchschlagene Gegner (0 = beim ersten Treffer Ende). */
  pierce: number;
  /** Krit-Chance 0..1 (Basispunkte/10000). */
  critChance: number;
  /** Schaden-Vielfaches bei Krit. */
  critMult: number;
}

/**
 * Der GESPEICHERTE Eintrag einer gezüchteten Variante (Meta, Run-Snapshot, Sim). Ein Shape,
 * drei Leser — vorher stand dieselbe Zeile dreimal inline in `types.ts`, `state.ts` und
 * `plantSystem.ts` (Regel 4: eine Wahrheit). `ballistics` ist optional, weil Altsaves es nicht
 * kennen; gefüllt wird es beim Lesen (`plantSystem.getPlantStats`).
 */
export type BredStatsEntry = {
  hp: number;
  damage: number;
  range: number;
  cooldown: number;
  cost: number;
  effects: string[];
  ballistics?: BallisticProfile;
};

export type PlantParentSnapshot = {
  id: string;
  type: PlantType;
  genome: Genome;
};

export type PlantVariant = {
  id: string;
  name: string;
  type: PlantType;
  genome: Genome;
  traits: string[];
  cost: number;
  stats: {
    hp: number;
    damage: number;
    range: number;
    cooldown: number;
    special: string | null;
  };
  color: string;
  discovered: boolean;
  generation?: number;
  parentA?: string;
  parentB?: string;
  /** PLANTS_SOURCE-Verankerung für Basen (Platzierbarkeit im Run — eine Stats-Quelle). */
  sourceId?: 'sprout' | 'rootwall' | 'mycelia';
  /** Leih-Pflanze (Krix-Spross): wandert beim Run-Ende zurück, nie echter Besitz. */
  isLoan?: boolean;
};

// ── Meta save (persistent across runs) ───────────────────────
// ── v3 (Gacha-Ökonomie): genau 2 Startpflanzen, Seed-Shop-Besitz, Reifungs-Queue.
// ── v4 (P6): Käferzucht — Brut-Lager, ein eingesetzter Käfer, Brut-Reifungs-Queue.
// ── v5 (A13.1): monotoner Brut-Zähler — Identität darf nie aus einem Fenster abgeleitet werden.
// ── v6 (B21): `tutorialDone` — das Krix-Onboarding startet genau einmal pro Spielerprofil.
// ── v8 (Zucht-Sprint 19.09.2026): `rearingSlots` — Reifungsplätze starten bei 3 und wachsen
//    über steile Gates (Nektar + überlebte Welle) bis 12.
// ── v7 (B21.3): `tutorialVersion` ersetzt das Ja/Nein. Die Tour begann früher erst im Feld;
//    jetzt startet sie auf dem Titel-Screen. Ein Bool konnte diesen Umbau nicht ausdrücken:
//    wer die alte Tour gesehen hatte, hätte die neue nie zu sehen bekommen.
// ── v10 (Run-Seed 24.09.2026): `runSeed` ist der öffentliche, run-lokale Wurzelwert.
//    Er wird bei jedem Run erzeugt und persistiert; die globale EPOCH_ROOT ist nur noch
//    Migrations-/Test-Anker.
export type MetaSave = {
  version: 10;
  /** Produktversion beim letzten Schreiben (Diagnose: Altsaves zuordnen, Support-Fälle klären). */
  appVersion?: string;
  nektar: number;
  bestWave: number;
  runs: number;
  /** Authoritative run identity counter — one authority (QUALITY_SPEC B1). */
  runId: number;
  /** Öffentlicher Run-Seed: lokal deterministisch, nicht global vorhersagbar. */
  runSeed: number;
  /** Persisted breed generation counter — breeding determinism across reloads. */
  breedGeneration: number;
  variantCounts: Record<string, number>;
  /** Besitz-Modell: das faire Startmaterial (`STARTING_MATERIAL`) wurde diesem Profil bereits
   *  gutgeschrieben. Ohne das Flag wäre jede Heilung mehrdeutig — ein Profil, das alles verbaut
   *  hat, sähe aus wie eines, das nie etwas hatte. */
  materialGranted: boolean;
  savedVariants: PlantVariant[];
  /** Variants the player carried in via loadout (placeable bred plants — B1). */
  loadout: string[];
  language: 'de' | 'en';
  audioOn: boolean;
  pvpPayouts: number;
  /** Seeds gekauft im Shop, noch nicht ausgesät (gacha: PlantVariant bei Aussaat gewürfelt). */
  seedStash: number;
  /** Reifungs-Queue: Kreuzungen, die X überlebte Wellen brauchen, bevor sie keimen. */
  pendingCrosses: PendingCross[];
  /** Reifungsplätze (3..12): Start 3, Zukauf über `buyRearingSlot` (Preis + Wellenmarke). */
  rearingSlots: number;
  /** Gesamtzahl bestandener Wellen (Reifungszähler). */
  totalWavesSurvived: number;
  /** EINE Quelle für Zucht-Stats: beim Claim abgeleitet, an jeden Run injiziert (B1). */
  bredStats: Record<string, BredStatsEntry>;
  // R2: `mapLayouts` ist GESTORBEN — die Spielerwelt lebt als EINE persistente Welt im
  // WorldSave (persistence/worldSave.ts), nicht als benannte Layout-Sammlung im Meta.
  /** P6 Käferzucht: gezüchtete Specimen (Brut-Lager) + Reifungs-Queue. */
  beetles: BeetleSpecimen[];
  beetleDeployed: string | null;
  pendingBroods: PendingBrood[];
  /** Monotoner Brut-Generation-Zähler (A13.1) — einzige Quelle für `PendingBrood.broodIndex`.
   *  Nie aus `pendingBroods` ableiten: das Fenster schrumpft beim Claim und würde Indizes recyceln. */
  broodGeneration: number;
  /** B21.3: Tour-Fassung, die dieser Spieler gesehen hat (0 = nie). `TUTORIAL_VERSION` in
   *  components/tutorial/script.ts ist die aktuelle — höher ⇒ es läuft genau einmal neu. */
  tutorialVersion: number;
  /**
   * Gewächshaus-Töpfe (Einstiegs-Loop): festes Slot-Array, `null` = leer. Jeder Eintrag
   * ist eine Variant-ID (gekeimter Samen, der AUF DIESEN Topf gehört). Die Kapazität
   * startet bei GREENHOUSE_POT_SLOTS (3); eine spätere Erweiterung ist PvP-Sache —
   * die Struktur (Array) bleibt, nur die Grenze wächst dann.
   */
  pots: (string | null)[];
  /** Unverteilte Keimlinge (Shop-Kauf ohne Topf-Wahl): warten auf Drag&Drop in einen Topf. */
  seedlings: string[];
};

/** Eine Kreuzung wartet auf Reifung: verfügbar nach `wavesToUnlockFor(index)` Wellen. */
export type PendingCross = {
  crossIndex: number;
  seed: number;        // gacha seed — Kind ist bei Aussaat schon deterministisch fest
  neededWaves: number; // wavesToUnlockFor(crossIndex)
  startedWave: number; // totalWavesSurvived bei Aussaat
  /** B19: das Kind WIRD bei Aussaat persistiert — der Claim hängt nur am globalen
   *  Wellen-Timer, nie am zufälligen Eltern-Bestand (Schwesterkreuzungen konkurrieren
   *  sonst um dieselben Eltern). Alte Saves ohne child rekonstruieren aus dem Seed. */
  child?: PlantVariant;
  parentAId?: string;
  parentBId?: string;
  /** Run-Wurzel, mit der das Kind bei Legacy-Rekonstruktion abgeleitet wurde. */
  rootSeed?: number;
};

/**
 * P6/R3: Ein Elternteil der Käferkette — Identität, Genom, Generation. Ein Basis-Tier ist
 * ebenso ein Vorfahre wie ein selbst gezüchtetes Specimen: GENAU deshalb darf die Kette nicht
 * auf die drei Gründer zurückfallen.
 */
export type BeetleAncestor = {
  /** Eindeutige Identität (Bibliotheks-ID des Tiers oder Basis-ID eines Gründers). */
  id: string;
  /** Balance-Anker (BEETLES_SOURCE) für die Stats — ausdrücklich NICHT die Erscheinung. */
  specimenId: string;
  genome: Genome;
  generation: number;
};

/** P6: Ein Brutvorgang wartet auf Reifung nach Kinderstärke (beetleWavesToUnlock). */
export type PendingBrood = {
  broodIndex: number;
  specimenAId: string;
  specimenBId: string;
  neededWaves: number;
  startedWave: number;
  chosenIndex: number; // welcher der 3 Brutkandidaten deterministisch „gewonnen" hat
  /**
   * R3: die GENOME der Eltern. Nur so ist ein gezüchtetes Tier wirklich Elternteil — und der
   * Claim reproduziert exakt dieselben drei Kandidaten, auch wenn sich das Lager inzwischen
   * verändert hat. Altsaves ohne diese Felder lösen über die (Gründer-)IDs auf.
   */
  parentAAncestor?: BeetleAncestor;
  parentBAncestor?: BeetleAncestor;
};

// ── Game modes ───────────────────────────────────────────────
export type GameMode = 'endless' | 'pvp';


// ── Breeding ─────────────────────────────────────────────────
export type CrossResult = {
  child: PlantVariant;
  parentA: string;
  parentB: string;
  probability: number;
  isNew: boolean;
};

// ── Käferzucht (P6): Brüten erweitert das Genom-Prinzip — eigene Identität ──
export type BeetleSpecimen = {
  id: string;
  name: string;
  /** BEETLES_SOURCE-Verankerung (Basis-Werte + Farbe — eine Stats-Quelle). */
  specimenId: string;
  genome: Genome;
  stats: {
    hp: number;
    speed: number;       // Zellen/Tick
    attack: number;      // Schaden pro Biss
    taunt: boolean;      // TAUNT (Y/N)
    spawnX: number;      // Spawn 1×–5× beim Einsatz
    deathSpawnX: number; // Beim Tod X halbwertige Brutlinge
    cost: number;        // Energie pro Einsatz im Run
  };
  color: string;
  discovered: boolean;
  generation?: number;
  parentA?: string;
  parentB?: string;
};
