# LifeSeedLab — Präsentations-Unterlagen

> **Zweck:** Material für GitHub Repository Description, Releases, Social Media, Investor/Partner-Pitches.
> Alle Inhalte sind deterministisch aus dem Code ableitbar — keine Marketing-Fiktion.

---

## 🎯 Elevator Pitch (1 Satz)

**LifeSeedLab ist ein deterministisches Browser-Tower-Defense, bei dem du Pflanzen züchtest statt kaufst — jede Kreuzung ist reproduzierbar, teilbar und wird zu deinem einzigartigen Turm gegen endlose Wellen.**

---

## 🎯 Elevator Pitch (3 Sätze)

LifeSeedLab verbindet **Plants vs. Zombies**-Gameplay mit **Binding of Isaac**-Emergenz: Aus 10 Basispflanzen entstehen durch deterministische Genom-Kreuzungen tausende einzigartige Varianten — jede mit eigenen Stats, Traits und **visueller Identität**, die exakt aus dem Genom ableitbar ist. Der Clou: **Gleicher Seed + gleiche Entscheidungen = bit-identischer Spielstand**, beweisbar per State-Hash. Kein `Math.random`, keine versteckte State-Mutation — nur reine Funktion aus Seed, Commands und Zeit.

---

## 🎮 Gameplay Loop (für Trailer/Video)

```
┌────────────────────────────────────────────────────────────────────┐
│  START SCREEN                                                      │
│  ├── Animierter Titel (Canvas, Paper-World)                       │
│  ├── PLAY Button (56px Target, Paper-Style)                       │
│  └── Language Pills (DE/EN)                                       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  MAIN MENU (Paper-Collageblock)                                   │
│  ├── Nektar-Counter + Stat-Chips (Best Wave, Runs, Collection)   │
│  ├── 3 Mode Cards: 🏡 Gewächshaus  🌊 Endless  ⚔️ PvP (Planned)    │
│  ├── Collection Grid: PlantThumbs (48×48, ResolvedVisual)         │
│  └── Loadout Editor: ≤4 Pflanzen für Run mitnehmen                │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  BREEDING CEREMONY (Der "Isaac"-Moment)                           │
│  ├── 2 Parent Slots → Collection Sheet (PlantThumbs + Counts)     │
│  ├── KREUZEN → 1.6s Animation (Genome orbitieren, dominant flaren)│
│  ├── Mutation Glitch (2-frame Ink-Slash) → Seed fällt → Wächst    │
│  ├── Traits staggern ein → 3 Result Cards (Keep / Reroll / Skip)  │
│  └── Keep: verbraucht Eltern, inkrementiert breedGeneration       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  RUN (Endless Defense, Portrait 390×844)                          │
│  ├── HUD: Energy (Drop+Count), Lives (Leaf-Heart), Wave Chip W3   │
│  ├── Canvas: Paper-Terrain (gebacken), Ink-Path, Decor            │
│  ├── Pflanzen: ResolvedVisual (Genom→Silhouette+Palette+Tint)     │
│  ├── Gegner: 5 Bodies (Grunt/Fast/Tank/Swarm/Boss) — alle Ink    │
│  ├── FX: Damage Numbers, Manga Text, Camera Shake, Particles      │
│  ├── Day/Night: Lighting Grade Tween (90 Ticks, Event-getrieben)  │
│  └── Boss alle 10 Wellen: Screen Dim + Manga "BOSS" + Horn        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  GAME OVER / WAVE CLEAR                                           │
│  ├── Ink Panel slide up: Wave N, Score, Highest Combo             │
│  ├── Nektar Earned mit Flight-to-Counter Animation                │
│  ├── Buttons: New Run / Menu                                      │
│  └── recordRunEnd() feuert EXAKT EINMAL (Meta banked)             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🧬 Unique Selling Points (USPs)

| # | USP | Beweis im Code |
|---|---|---|
| 1 | **Echter Determinismus** | `core/rng.ts` — 8 Namespaces, `deriveSeed`, FX ON/OFF = bit-identisch |
| 2 | **Genom → Visual Pipeline** | `visual/generator.ts` — `genomeToVisualInput` → `ResolvedVisual` (test-locked) |
| 3 | **Zucht = Gameplay** | `genome/beetle.ts` — Kreuzung, Mutation, Naming, `breedGeneration` persistiert |
| 4 | **Single Writer Architecture** | `../architecture/architecture-contract.md` §3 — Ownership-Tabelle, keine 2. State-Quelle |
| 5 | **Observer-Purity** | `observers/` — lesen nur Events, emittieren Visual-Commands, mutieren nie State |
| 6 | **Source = Content Truth** | `config/*.source.ts` — **keine** Gameplay-Constants im Code |
| 7 | **Resume-Vertrag (ehrlich)** | `persistence/` — Enemies/Projectiles absichtlich NICHT gespeichert, Wave-Neustart |
| 8 | **Discovery-Chain** | `discovery/chain.ts` — FNV-1a Hash-Chain und `lifeseed:`-Sharing, ausschließlich lokal |
| 9 | **Paper + Pop Art Direction** | `../quality/contracts/visual.md` B0, B10 (Art Direction & Render) · B9 in `../quality/contracts/ui.md` — verbindlich, testbar (Grayscale-Test) |
| 10 | **Mobile-First (390×844)** | Alle Touch-Targets ≥44px, kein Hover-Pflicht, Portrait-Layout |

---

## 📊 Technische Highlights (für Devs/Architekten)

### Determinismus-Stack
```
Math.random()        ❌ VERBOTEN
Date.now()           ❌ VERBOTEN
performance.now()    ✅ NUR in clock.ts (Frame-Timing)
core/rng.ts          ✅ EINZIGE Quelle — deriveSeed(root, ns, entity, event, v)
```

### Event/Command Contract (v1, versioniert)
```ts
// Event
{ eventId: "1247:plant:12:PROJECTILE_FIRED:3", tick: 1247, type: "PROJECTILE_FIRED",
  sourceId: "plant:12", version: 1, payload: { targetId: "enemy:5", effectId: "EFFECT_BURN" }}

// Command
{ commandId: "cmd_1247_3", tick: 1247, type: "PLACE_PLANT",
  actorId: "player", version: 1, payload: { variantId: "cross_01a3", cell: 42 }}
```

### Visual Pipeline (keine 2. Wahrheit)
```
SOURCE (config/*.source.ts)
    │
    ▼
GENOME (genome.ts) + SEED
    │
    ▼
PlantVariant (stats, traits, visualKey)
    │
    ▼
genomeToVisualInput(variant, visualSeed) → VisualInput
    │
    ▼
visualSeed + Source = ResolvedVisual (generator.ts)
    │
    ▼
SimulationRoot.bredVisuals[variantId] = ResolvedVisual
    │
    ▼
Renderer zeichnet NUR ResolvedVisual (keine Logik!)
    │
    ▼
Observer: Event → VisualCommand (color/palette IN Payload)
```

### LOC-Caps (hart, durch CI durchsetzbar)
| Cap | Module |
|---|---|
| 300 | Simulation-Systeme, Bus, Clock, RNG, IDs, Hash |
| 400 | Renderer, Visual Generator, Particles, Observer, UI-Komponenten |
| 200 | Types, Config/Source, Meta, i18n |

---

## 🎨 Art Direction — Visuelle Identität

### Farb-Tokens (CSS Custom Properties)
```css
:root {
  --paper:       #f5efdc;  /* Haupt-Hintergrund */
  --paper-dim:   #e8dfc8;  /* Wege, sekundär */
  --ink:         #2b2b26;  /* Konturen, Text */
  --leaf:        #5a8f4e;  /* Leben, Heilung */
  --leaf-dark:   #2e4a2a;  /* Schatten, Graspunkte */
  --bloom:       #c96f8e;  /* Blüte, Magie, Crit */
  --nektar:      #d9a441;  /* Währung, Belohnung */
  --danger:      #a94438;  /* Schaden, Gefahr */
  --night:       #1c222b;  /* Nacht-Grade Multiply */
}
```

### Typography
- **Display/Title:** "Gaegu" / "Patrick Hand" (Hand-drawn, @fontsource, gebündelt)
- **Numbers/Body:** System Stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`)
- **Wordmark:** Custom SVG Paths (in `ui/icons.tsx`)

### Icons (24×24, 2px Ink Stroke, Paper Fill)
`energy-drop`, `heart-leaf`, `wave`, `play`, `pause`, `settings-gear`, `language-globe`, `nectar-drop`, `trophy`, `dna-helix`, `sword`, `shield`, `plus`, `x`, `back-arrow`, `volume`, `volume-off`, `bug` (dev only)

---

## 📈 Metriken & Status (Stand README-Update)

| Metrik | Wert | Quelle |
|---|---|---|
| **Tests** | 52/52 grün | `npm test` |
| **TypeScript** | 0 Fehler (strict) | `npm run typecheck` |
| **Build** | Erfolgreich | `npm run build` |
| **Architektur-Verstöße** | 0 (Gate geprüft) | `../architecture/architecture-contract.md` §10 |
| **LOC Simulation** | ~2.000 | `wc -l src/simulation/**/*.ts` |
| **LOC Render/Visual** | ~1.400 | `wc -l src/render/**/*.ts src/visual/**/*.ts` |
| **LOC Core/Bus** | ~1.000 | `wc -l src/core/**/*.ts src/bus/**/*.ts` |
| **Source Files** | 11 (`config/*.source.ts`) | Content Truth |
| **Event Types** | 23 | `src/bus/events.ts` |
| **Command Types** | 8 | `src/bus/commands.ts` |
| **Effect Types** | 10 | `config/effects.source.ts` |
| **Base Plants** | 10 | `config/bases.source.ts` |
| **Extra Types** | 10 | `config/extras.source.ts` |

---

## 🗓️ Release-Plan (High-Level)

| Version | Fokus | Ziel |
|---|---|---|
| **v0.1** | Core deterministisch, Zucht-Logik, Basis-Render | ✅ Done |
| **v0.2** (Current) | B1–B3: Run-Identity, Persistenz, Placement UX | ✅ Ausgeliefert (B21.3/B22) |
| **v0.3** | B4–B6: Genome→Visual, FX-Matrix, Effect-Chain | ⏳ Q1 2025 |
| **v0.4** | B7/B9/B10: Screens, Art, Renderer-Rewrite | ⏳ Q2 2025 |
| **v0.5** | B12/B13: Mobile Perf, DoD, Polish | ⏳ Q2 2025 |
| **v1.0** | Steam/Web Release, PvP-Backend (Convex) | ⏳ 2025+ |

---

## 🔗 Links & Ressourcen

| Ressource | Link |
|---|---|
| **Repository** | `github.com/<user>/lifeseedlab` |
| **Architecture Contract** | [`architecture-contract.md`](../architecture/architecture-contract.md) |
| **Technical Architecture** | [`architecture.md`](../architecture/architecture.md) |
| **Quality-Register & Domänen-Contracts** | [`quality-spec.md`](../quality/quality-spec.md) → `docs/quality/contracts/` |
| **Agent Rules** | [`AGENTS.md`](../../AGENTS.md) |
| **Roadmap** | [`ROADMAP.md`](../process/ROADMAP.md) |
| **Banner SVG** | [`banner.svg`](../banner.svg) |

---

## 📱 Social Media Snippets

### Twitter/X (280 Zeichen)
> LifeSeedLab: PvZ × Isaac im Browser. Du züchtest Pflanzen statt sie zu kaufen — jede Kreuzung ist deterministisch, teilbar (`lifeseed:...`) und wird zu deinem Turm. Gleicher Seed = identischer Run. Kein Math.random. TypeScript + Canvas 2D + React 19. 🌱⚔️ #gamedev #indiedev

### Mastodon (500 Zeichen)
> **LifeSeedLab** — ein deterministisches Tower-Defense, wo deine Kreuzungen die Türme sind.
>
> 🌱 Züchten: 10 Basen × 10 Extras × 10 Effekte → tausende Varianten
> 🧬 Genom → Visual Pipeline: Jede Pflanze sieht ihrem Genom entsprechend aus
> ⚖️ Beweisbar deterministisch: State-Hash, 8 RNG-Namespaces, FX ON/OFF = bit-identisch
> 🎨 Art: Paper-World (Collageblock) + Nintendo-Pop Entities
> 📱 Mobile-first: 390×844, Touch-only
> 💾 Resume-Vertrag: Ehrlich, testbar, keine Event-Log-Fiktion
>
> Stack: TypeScript strict, React 19, Vite, Canvas 2D (keine Engine), Vitest
> Architecture: Single Writer, Observer-Purity, Source=Content-Truth

### LinkedIn (Professionell)
> **LifeSeedLab: Deterministisches Game-Architecture-Showcase**
>
> Ich baue LifeSeedLab — ein Browser-Tower-Defense, das beweist: **Determinismus ist kein Nice-to-have, sondern Architektur-Entscheidung.**
>
> **Technische Highlights:**
> - Single-Writer-Architektur mit Ownership-Tabelle (keine Race Conditions möglich)
> - RNG-Isolation: 8 Namespaces (Gameplay vs. Presentation getrennt)
> - Event-Sourcing-lite: Command → Simulation → Event → Observer (unidirektional)
> - Visual Pipeline: Genome → ResolvedVisual (deterministisch, test-locked)
> - Persistenz mit Checksummen, Migration, Quarantäne (kein Data Loss)
> - LOC-Caps als harte Architektur-Grenzen (CI-prüfbar)
>
> **Warum das spannend ist:** Die gleichen architektonischen Prinzipien (Event-Sourcing, CQRS, Determinismus, Observer-Pattern) skalieren von Indie-Games bis zu verteilten Systemen. LifeSeedLab ist der Beweis, dass man sie *ohne Framework-Overhead* sauber umsetzen kann.

---

## 🖼️ Screenshot-Platzhalter (für README/Releases)

> **TODO:** Echte Screenshots einfügen, sobald Renderer-Rewrite (B10) fertig ist.

| Screen | Platzhalter | Beschreibung |
|---|---|---|
| Title Scene | `![Title](Screenshot title.png (Platzhalter, noch nicht aufgenommen))` | Animierter Canvas-Titel, Paper-Hills, Grass-Silhouetten |
| Main Menu | `![Menu](Screenshot menu.png (Platzhalter, noch nicht aufgenommen))` | Collageblock, Mode Cards, Collection Grid mit PlantThumbs |
| Breeding | `![Breeding](Screenshot breeding.png (Platzhalter, noch nicht aufgenommen))` | Zeremonie: Parents → Animation → Offspring + Traits |
| Run (Day) | `![RunDay](Screenshot run_day.png (Platzhalter, noch nicht aufgenommen))` | Paper-Terrain, Ink-Path, Pflanzen mit Genom-Visuals |
| Run (Night) | `![RunNight](Screenshot run_night.png (Platzhalter, noch nicht aufgenommen))` | Night-Grade, Fireflies, Boss-Warnung |
| Game Over | `![GameOver](Screenshot gameover.png (Platzhalter, noch nicht aufgenommen))` | Ink-Panel, Nektar-Flight, Stats |
| DevGate | `![DevGate](Screenshot devgate.png (Platzhalter, noch nicht aufgenommen))` | State-Hash, Event-Log, Particle-Budget, Entity-Inspector |

---

## 🏷️ Tags für GitHub Release

```yaml
# .github/release.yml (Beispiel)
name: LifeSeedLab v0.2.0
tag_name: v0.2.0
body: |
  ## 🌱 LifeSeedLab v0.2.0 — "Persistence & Placement"
  
  ### ✅ Neu
  - Run-Identity: Einzelne `runId` Authority (Meta ↔ RootInit)
  - Persistenz: `storage.ts` Owner mit FNV-Checksumme, Migration, Quarantäne
  - Placement UX: Pointer-Events, Ghost-Preview, Range-Ring, Red-Shake-Reject
  - Resume: Prep-Restart, Schedule-Regeneration, Enemies/Projectiles gestrippt
  - Pause on `visibilitychange`, Resume-Overlay
  
  ### 🔧 Fixes
  - `genome.ts` auf `core/rng` migriert, `breedGeneration` persistiert
  - DevGate: Alle Dev-UI hinter `?dev=1` versteckt
  - Combo×Score: Multiplier wird nun angewendet
  
  ### 🧪 Tests
  - 68+ Tests grün (neu: resume-shape, breeding-determinism, meta-migration)
  - TypeCheck clean, Build grün
  
  ### 📱 Mobile
  - 390×844 verified, Touch-Targets ≥44px
  
  **Breaking:** Save-Format v2 (Meta + Run) — alte Saves migrieren automatisch.
```

---

## 🎤 Pitch Deck Outline (für Investoren/Partner)

| Slide | Titel | Kernbotschaft |
|---|---|---|
| 1 | **Problem** | Mobile TD: Pay-to-win, gleiche Türme, keine Kreativität, Black-Box-RNG |
| 2 | **Lösung** | Züchten statt Kaufen — Emergenz durch Determinismus |
| 3 | **Demo** | Live: Zucht → Run → Share `lifeseed:` Link |
| 4 | **Tech Moat** | Deterministische Engine, Single-Writer, Observer-Purity, Source=Truth |
| 5 | **Art Moat** | Paper + Pop — unverwechselbar, generativ, keine Asset-Pipeline |
| 6 | **Business** | F2P: Cosmetic Seeds, Shared Builds (Convex), Discovery-NFTs (optional) |
| 7 | **Traction** | 52 Tests, 0 TS-Errors, Architekturvertrag, Mobile-verified |
| 8 | **Roadmap** | v0.2→v1.0, PvP, Steam, Web, Mobile App |
| 9 | **Team/Ask** | 1 Dev + Agent, Suche: Artist, Sound, Marketing, Funding |

---

## 📋 Checklist für GitHub Repository Setup

- [ ] Repository Description: "PvZ × Isaac — deterministisches Tower-Defense wo du Pflanzen züchtest. TypeScript + Canvas 2D + React 19. Beweisbar deterministisch."
- [ ] Topics: `typescript`, `react`, `canvas`, `game`, `tower-defense`, `deterministic`, `roguelike`, `breeding`, `procedural-generation`, `vite`, `vitest`
- [ ] Banner: `docs/banner.svg` als Social Preview (Settings → Social Preview)
- [ ] README.md als Profil-README (`.github/profile/README.md` symlinken)
- [ ] Release-Drafter konfigurieren (Conventional Commits)
- [ ] CI: `tsc`, `vitest`, `vite build` auf jedem PR
- [ ] Dependabot für Security Updates
- [ ] CODEOWNERS für `docs/architecture/architecture-contract.md` (Architektur-Änderungen = Review-Pflicht)

---

## 📞 Kontakt & Credits

**Entwickelt mit** [Buffy (Codebuff Agent)](https://codebuff.com) — deterministische Agenten-Entwicklung.

**Architektur:** Human-in-the-loop + Agent (Buffy) — alle Entscheidungen dokumentiert in `docs/architecture/architecture-contract.md`.

**Lizenz:** MIT — frei für kommerzielle und private Nutzung.

---

> *"Determinismus ist keine Einschränkung — er ist die Freiheit, Emergenz zu vertrauen."*
> — LifeSeedLab Architecture Contract