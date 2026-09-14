# ARCHITECTURE.md — LifeSeedLab

> Sprache: Deutsch (Regel 1). Dieser Text beschreibt die **technische Architektur** (das „Wie").
> Der rechtsverbindliche Vertrag steht in [`ARCHITECTURE_CONTRACT.md`](ARCHITECTURE_CONTRACT.md),
> die forensische Bestandsaufnahme + Asset-/Render-Spezifikation in [`docs/QUALITY_SPEC.md`](docs/QUALITY_SPEC.md).
> Agenten-Regeln und Arbeitsmodus: [`AGENTS.md`](AGENTS.md).

---

## 1. Technology-Stack (festgezurrt)

| Ebene | Technologie | Entscheidung | Begründung |
|---|---|---|---|
| UI / Build | React 19 + Vite + TypeScript (strict) | **behalten** | vorhanden, stabil, kein Migrationsgewinn |
| Simulation | eigene deterministische Core-Runtime (Clock/RNG/Bus) | **behalten** | Gate-getestet, beweisbar deterministisch |
| Rendering | **Canvas 2D, handgeschrieben — keine Engine** | **fest** | Die Lücke ist Art-Code, nicht Engine-Fähigkeit. Eine Engine (PixiJS/Phaser) kämpft gegen drei bezahlte Eigenschaften: LOC-Caps pro Modul, Renderer-Purity (zeichnet nur `ResolvedVisual`) und deterministische Visual-Seeds. Ink/Paper entsteht als reine Zeichenroutinen: `Path2D` mit Quadratik-Kurven für unregelmäßige Konturen + **vorgebackene Offscreen-Textur-Tiles** (Papierkorn, Pfad-Abnutzung, Gras) — einmal pro Seed aus dem `visual`-Namespace generiert und gecacht. Texturvielfalt ohne Kosten pro Frame. Bei < few hundred Drawables ist Mobile-Performance kein Canvas-2D-Problem. |
| Persistenz | **eigenes `persistence/storage.ts`, beide Backends, 0 Deps** | **fest** | Kein Katalog-Angebot; Dexie/idb-keyval wäre eine Dependency für ~200 LOC eigenen Code. Spec unten (§4). |
| Audio | **Web Audio API als zweiter Observer** (`observers/audioObserver`, Cap 250 LOC) | **fest** | Tone.js/Howler sind Overkill oder gameplay-gekoppelt. Lazy `AudioContext` beim ersten User-Gesture (iOS-Unlock-Pflicht). SFX **synthetisiert** aus Oszillator + Noise-Buffer, verschlüsselt über `soundProfile` (burn = gefiltertes Noise-Crackle, heal = Sinus-Arpeggio, crit = geschichteter Thump …). Keine Audio-Assets, keine Ladezeit. Der Observer subskribiert den Bus, emittiert nichts, erzeugt kein RNG — die FX-ON/OFF-Determinismus-Garantie gilt damit automatisch auch für Sound. |
| Tests | Vitest | **behalten** | läuft, 52+ Tests |
| Async-PvP-Backend | **Convex — aufgeschoben** | **Schema jetzt, Einbau später** | Vercel-as-Backend abgelehnt (Deploys laufen bereits auf managed Freebuff-Hosting; eine zweite Plattform kauft nichts). Convex passt zu Build-Sharing: kleine JSON-Dokumente, kein Server-Betrieb, TS-SDK, Free Tier, Auth slotting später sauber ein. **Was jetzt passiert, ist nur der Schema-Vertrag:** Das Export-Format eines geteilten Builds ist fix als `{ genomePair, rootSeed, commandLogHash, variantKey, createdAt, version }`. Dasselbe JSON, das heute in den Run-Save geht, POSTet später unverändert an Convex — Gameplay-Code erfährt nie, dass ein Backend existiert; es kommt hinter genau einem `bus/remote`-Adapter an. |
| Discovery-Chain | **Supabase + SHA256-lite, lokal-first** | **Schema jetzt, Sync später** | Kein Token/Blockchain: `genome_hash` aus RNG ist der Beweis, `prev_hash`-Kette ist die Verkettung. Lokal `UNIQUE(genome_hash)`, public read, `supabase/migrations/001_discoveries.sql`. |
| Abgelehnt | Game Engines (LOC-Caps + Purity-Vertrag), neue State-Manager (React-State + Refs genügen), Playwright (aufgeschoben bis Mobile-e2e), **jede Änderung an `vite.config.ts`** | — | |

---

## 2. Modulkarte (IST + geplante Neuzugänge)

```
src/
├── core/        Clock (Fixed-Step 30tps) · RNG (8 Namespaces) · IDs · State-Hash
├── bus/         EventBus · Event-Contract v1 · CommandQueue · Ownership-Tabelle
├── simulation/  SimState · SimulationRoot · 6 Owningsysteme
│                (Plant/Enemy/Projectile/Score/Combo/Wave)
├── config/      SOURCE = CONTENT TRUTH: world, plants, enemies, effects, extras, bases
├── visual/      Generator: visualSeed + Source = ResolvedVisual (nur visual-Namespace)
├── render/      Camera (Observer-owned, seeded Shake) · Renderer (Layer 0–8)
│   └── layers/  [geplant] Terrain/EntityDraw/Feedback/Manga — Split bei > 400 LOC
├── observers/   visualObserver (Events→7 Visual-Commands) · ParticlePool (Budget)
│                audioObserver [geplant] · FeedbackLayer-Ausführung [geplant]
├── persistence/ storage.ts (§4) · meta.ts · runSave.ts · codex (discovery chain, §4.1)
├── discovery/   chain.ts (genome_hash, hash-chain) · codex.ts (local-first) + Supabase-Spiegel
├── components/  Screens (Start/Menu/GameView/Breeding/ErrorBoundary)
├── i18n.tsx     DE/EN, Context-Provider, persisted in Meta
└── types.ts     Meta-/Breeding-Typen (Legacy-Entity-Typen werden gelöscht — QUALITY_SPEC A1)
```

**Layer-Reihenfolge Renderer (fix):** 0 Background · 1 Terrain · 2 Shadows · 3 Plants · 4 Enemies · 5 Projectiles · 6 Particles · 7 Feedback · 8 Manga. Licht-Grade (Tag/Nacht) liegt **unter** 7/8.

---

## 3. Endgleichungen & Determinismus

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS = DETERMINISTIC GAME STATE
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED = DETERMINISTIC PRESENTATION
```

- Gameplay Namespaces: `world, wave, enemy, plant, loot` — nur Simulation.
- Presentation Namespaces: `visual, particle, cosmetic` — nur Observer/Renderer.
- `deriveSeed(rootSeed, namespace, entityId, eventId, version)` ist der einzige Ableitungsweg.
- Kein `Math.random`, kein `Date.now` in Spiellogik; `performance.now` nur im Frame-Timing.
- Beweis im Test: gleicher Seed + gleiche Commands = gleicher Hash, gleiche Entity-ID-Sequenz; FX ON/OFF = bit-identischer Gameplay-State.

## 3.1 Visuelle Pipeline — keine zweite Wahrheit (verbindlich)

Grafik besitzt **keine eigene Wahrheit**. Jede sichtbare Pflanze ist eine abgeleitete Darstellung derselben Ursache:

```
SOURCE → GENOME → TRAITS → GAMEPLAY PHENOTYPE → VISUAL PHENOTYPE → SIMULATION → EVENT → OBSERVER → RENDER
```

- `SOURCE` (`config/*.source.ts`) liefert Basen, Extras, Effects.
- `GENOME` (`genome.ts`) + `SEED` ergeben `PlantVariant` (deterministisch über `deriveSeed`).
- `genomeToVisualInput(variant, rootSeed)` → `VisualInput` (einzige Genome→Visual-Eingabe).
- `visualSeed + Source = ResolvedVisual` (`visual/generator.ts`, nur `visual`-Namespace).
- `ResolvedVisual` wird über `bredStats`/`loadout` in `SimulationRoot` geführt und vom Renderer **nur gezeichnet**, nie erfunden (`Renderer.setBredVisuals`, `plantVisual`).
- `EVENT → OBSERVER` trägt Farbe/Intensität bereits im Payload; UI/Renderer entscheiden keine Farben.
- Ein Screenshot darf deshalb nie „hübsch erfunden" sein — jede Silhouette, Palette und Tint ist aus dem Genom ableitbar und per `variantKey` test-locked.

## 3.2 Art Direction — LifeSeedLab = Forschungsbuch + Papercraft-Welt (verbindlich)

- **Welt = Papierfläche.** Hintergrund: Kraftpapier (`--paper`) mit Korn/Noise (einmalig gebacken, `visual`-Namespace). Wege: aufgeklebte, leicht gewölbte Papierstreifen mit Drop-Shadow, ausgefranste Kanten, Fineliner-Rasterpunkte statt Grid-Linien.
- **UI = Notizen.** Menükarten, Panels, HUD-Chips wirken wie Post-its/Pappschilder mit Büroklammern — `#f5efdc` Fill, `#2b2b26` Ink-Border 2 px, 3 px Offset-Hard-Shadow, keine Blur-Glass-Ästhetik.
- **Kontrast = Nintendo-Pop.** Auf matter Papierwelt stehen satte, plastische Pflanzen/Gegner (kräftige Fills, feine Verläufe, Specular-Highlights, Ink-Contour 2+ px). Sie wirken wie aufgeklebte, lebendig gewordene Figuren — sofort unterscheidbar, auch in Graustufen.
- **Animation = Papier-Juice.** Squash & Stretch bei Schuss/Treffer, Konfetti aus Papierschnipseln/Blättern, Idle-Atmen/Schwanken — alles über `FeedbackLayer`/`MangaLayer`/`ParticlePool`, nie über Gameplay-State.
- **Skala:** 390×844 Portrait-first; alle Touch-Targets ≥ 44 px; kein Hover als Pflicht.

---

## 4. Persistenz-Vertrag (Zielbild, umsetzt QUALITY_SPEC B2)

Ein Owner: `persistence/storage.ts` (≤ 250 LOC). API:

```ts
load<T>(key, { version, migrate, fallback }): T   // prüft Version + Checksumme
save(key, value): void                            // schreibt mit Checksumme
// Checksumme: FNV-1a (aus core/hash-Familie) über das serialisierte Payload.
// Checksummen-Mismatch → Blob wird nach `${key}.corrupt` verquarantänt,
// fallback() liefert Defaults. Nie crashen, nie still Daten verlieren.
```

| Store | Backend | Inhalt | Warum |
|---|---|---|---|
| `meta` | localStorage (sync) | Sprache, Nektar, Stats, Sammlung, Loadout, `runId`, `breedGeneration` | muss **synchron vor erstem Render** liegen (Sprachwahl) |
| `run` | localStorage (MVP) → IndexedDB (Ziel) | Run-Snapshot v2 | größer, asynchron ok |

**Resume-Vertrag (fix):** Run-Save enthält `{version, runId, seed, tick, waveNumber, phase:'prep', energy, lives, score, combo, plants[], inventory, nektarEarned}` — **keine** enemies/projectiles/schedule. Resume baut den State in `prep` wieder auf; der nächste Wave-Start regeneriert das Schedule deterministisch aus `(seed, waveNumber+1)`. Begründung: fortlaufende Gegner exakt wiederherstellen hieße Event-Log-Replay — out of scope; ein Wellen-Neustart ist der ehrliche, testbare Vertrag.

`meta.ts` und `runSave.ts` werden zu dünnen Schema-Adaptern über `storage.ts` — kein direktes `localStorage` mehr außerhalb des Owners.

### 4.1 Discovery-Chain — Blockchain-lite ohne Blockchain (neu)

- **Prinzip:** append-only, hash-linked, lokal-first. Gleiche Eltern + gleicher Seed ⇒ gleicher `genome_hash` ⇒ deterministische Verifikation ohne externen Konsens.
- **Hash:** FNV-1a über kanonisches Genom (`id:power:4f:dominant` sortiert). `entry_hash` über stabil serialisierte Felder; `prev_hash` verkettet.
- **Eintrag:** `{ player_id, genome_hash, parents[2], seed, generation, timestamp, prev_hash, entry_hash }` — vgl. `src/discovery/chain.ts`.
- **UNIQUE(genome_hash)** lokal in `tryAppend` und remote in Supabase (`discoveries.genome_hash UNIQUE`) — erste Entdeckung gewinnt dauerhaft.
- **Teilen:** `lifeseed:<seed>:<gen>:<genome_hash>` — jeder kann die Zeile laden und exakt dieselbe Pflanze sehen (Seed ist die Zahl).
- **Supabase-Spiegel:** `supabase/migrations/001_discoveries.sql` — public read, insert via `syncEntryStub` (heute Stub, morgen echter INSERT). Kein Wallet, kein Token, keine Energie.

---

## 5. Datenfluss (unveränderlich)

```
Input (Pointer/Touch)
   ↓  makeCommand (Contract v1)
CommandQueue
   ↓  drain an Tick-Grenze
SimulationRoot.stepOnce()   →   Clock.step → Systeme in fester Reihenfolge
   ↓  publish
EventBus (Contract v1: eventId, tick, type, sourceId, version, payload)
   ↓ subscribe (read-only)
Observer: visualObserver → VisualCommands → Feedback/Manga-Layer + ParticlePool + Camera
          audioObserver → SFX (synth, gated by FX-Flag)
UI liest State via 10Hz-HUD-Snapshot, entscheidet nichts.
Canvas/React modifizieren Gameplay nie.
```

Verbotene Verbindungen (Gate 3): `Canvas → Simulation`, `React-Visual → Simulation`, `Particle → Gameplay`.

---

## 6. DevGate & Release-Fläche

Alle Entwicklerwerkzeuge (State-Hash, Tick, Event-Log, Partikelzähler, Seed/RunId, FX-Toggle, Entity-Inspector) leben hinter `?dev=1` / `#dev`. Die Release-Fläche zeigt **keine** technischen IDs, keine Seed-Badges, keine Phase-Labels, keine Zähler — Specs in QUALITY_SPEC B7.4/B7.6.

---

## 7. Offene Baustellen = Arbeitsliste

Verbindliche Klassifikation und Spezifikation: **`docs/QUALITY_SPEC.md`** (Part A Befunde, Part B Specs B0–B13). Ausführungsreihenfolge: B1→B2→B3 (Korrektheit) → B4–B6 (Identität + Feedback) → B7/B9/B10 (Screens + Art) → B12/B13 (Mobile + DoD). Jede Änderung an einer dieser Dateien muss die DoD-Checkliste des Specs erfüllen.
