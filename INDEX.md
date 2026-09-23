# LifeSeedLab — Repository-Index

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Einstiegspunkt für die Navigation: `AGENTS.md` → dieser Index → Modul-Index → Datei → Symbol → Relation.
Die maschinenlesbare Quelle aller Beziehungen ist `.index/index.json`; jeder Index hier ist ein Auszug daraus.

## PROJECT

```text
PROJECT
├── bus  (10 Dateien)
│   └── src/bus/INDEX.md
├── components  (56 Dateien)
│   └── src/components/INDEX.md
├── config  (18 Dateien)
│   └── src/config/INDEX.md
├── core  (7 Dateien)
│   └── src/core/INDEX.md
├── dev  (5 Dateien)
│   └── src/dev/INDEX.md
├── discovery  (6 Dateien)
│   └── src/discovery/INDEX.md
├── genome  (20 Dateien)
│   └── src/genome/INDEX.md
├── i18n  (9 Dateien)
│   └── src/i18n/INDEX.md
├── meta  (16 Dateien)
│   └── src/meta/INDEX.md
├── observers  (5 Dateien)
│   └── src/observers/INDEX.md
├── persistence  (8 Dateien)
│   └── src/persistence/INDEX.md
├── render  (18 Dateien)
│   └── src/render/INDEX.md
├── simulation  (46 Dateien)
│   └── src/simulation/INDEX.md
├── src  (12 Dateien)
│   └── src/INDEX.md
├── testing  (2 Dateien)
│   └── src/testing/INDEX.md
├── visual  (4 Dateien)
│   └── src/visual/INDEX.md
├── world  (1 Dateien)
│   └── src/world/INDEX.md
├── Root-Infrastruktur
│   └── package.json
│   └── tsconfig.json
│   └── index.html
│   └── AGENTS.md
├── Dokumentation / Verträge
│   └── docs/architecture/
│   └── docs/quality/
│   └── docs/process/
├── Werkzeuge
│   └── tools/indexer/
│   └── tools/shinon/
│   └── scripts/
└── .index/index.json  (Beziehungsquelle: modules, files, symbols, relations, strings)
```

## Module

| Modul | Pfad | Dateien | Importiert | Importiert von | Aufrufe nach außen |
|---|---|---|---|---|---|
| `bus` | [`src/bus`](src/bus/INDEX.md) | 10 | `components`, `dev`, `meta` +5 | `components`, `dev`, `meta` +5 | `observers (2)`, `simulation (7)` |
| `components` | [`src/components`](src/components/INDEX.md) | 56 | `bus`, `meta`, `render` +2 | `bus`, `meta`, `render` +2 | `bus (4)`, `core (2)`, `observers (1)` +2 |
| `config` | [`src/config`](src/config/INDEX.md) | 18 | ``, `components`, `genome` +6 | ``, `components`, `genome` +6 | `core (1)` |
| `core` | [`src/core`](src/core/INDEX.md) | 7 | `bus`, `components`, `config` +10 | `bus`, `components`, `config` +10 | — |
| `dev` | [`src/dev`](src/dev/INDEX.md) | 5 | `components`, `render` | `components`, `render` | `simulation (3)` |
| `discovery` | [`src/discovery`](src/discovery/INDEX.md) | 6 | `components`, `genome` | `components`, `genome` | — |
| `genome` | [`src/genome`](src/genome/INDEX.md) | 20 | `components`, `config`, `meta` +3 | `components`, `config`, `meta` +3 | `config (1)`, `core (31)` |
| `i18n` | [`src/i18n`](src/i18n/INDEX.md) | 9 | `bus`, `components`, `simulation` +1 | `bus`, `components`, `simulation` +1 | — |
| `meta` | [`src/meta`](src/meta/INDEX.md) | 16 | `genome`, `simulation`, `src` +1 | `genome`, `simulation`, `src` +1 | `bus (1)`, `core (4)`, `persistence (8)` +1 |
| `observers` | [`src/observers`](src/observers/INDEX.md) | 5 | `bus`, `render`, `simulation` | `bus`, `render`, `simulation` | `bus (2)`, `core (5)`, `render (19)` +1 |
| `persistence` | [`src/persistence`](src/persistence/INDEX.md) | 8 | `components`, `discovery`, `meta` +4 | `components`, `discovery`, `meta` +4 | `bus (13)`, `simulation (11)` |
| `render` | [`src/render`](src/render/INDEX.md) | 18 | `bus`, `components`, `observers` +1 | `bus`, `components`, `observers` +1 | `bus (15)`, `components (7)`, `core (40)` +3 |
| `simulation` | [`src/simulation`](src/simulation/INDEX.md) | 46 | `bus`, `components`, `dev` +7 | `bus`, `components`, `dev` +7 | `bus (138)`, `core (18)`, `observers (8)` |
| `src` | [`src`](src/INDEX.md) | 12 | `components`, `config`, `discovery` +8 | `components`, `config`, `discovery` +8 | — |
| `testing` | [`src/testing`](src/testing/INDEX.md) | 2 | `bus`, `components`, `meta` +3 | `bus`, `components`, `meta` +3 | `bus (2)`, `core (1)`, `persistence (1)` +1 |
| `visual` | [`src/visual`](src/visual/INDEX.md) | 4 | `components`, `dev`, `genome` +2 | `components`, `dev`, `genome` +2 | — |
| `world` | [`src/world`](src/world/INDEX.md) | 1 | `components`, `persistence`, `render` +3 | `components`, `persistence`, `render` +3 | — |

## Hochfrequenz-Knoten (Fan-in)

Dateien, die viele andere Module kennen. Ein Fan-in-Knoten ist eine Vertragsgrenze:
Änderungen daran brauchen mehr als eine Datei und gehören in den Besitzer-Slice.

| Datei | Importiert von | Modul |
|---|---|---|
| `src/types.ts` | 56 | `src` |
| `src/core/rng.ts` | 33 | `core` |
| `src/testing/testkit.ts` | 33 | `testing` |
| `src/bus/events.ts` | 27 | `bus` |
| `src/i18n.tsx` | 24 | `src` |
| `src/config/economy.source.ts` | 23 | `config` |
| `src/core/ids.ts` | 20 | `core` |
| `src/config.ts` | 18 | `src` |
| `src/config/map.source.ts` | 17 | `config` |
| `src/bus/commands.ts` | 13 | `bus` |
| `src/visual/generator.ts` | 12 | `visual` |
| `src/config/beetles.source.ts` | 11 | `config` |
| `src/config/plants.source.ts` | 11 | `config` |
| `src/config/effects.source.ts` | 10 | `config` |
| `src/config/vector_logic.source.ts` | 10 | `config` |
| `src/core/hash.ts` | 10 | `core` |
| `src/genome.ts` | 10 | `src` |
| `src/simulation/state.ts` | 10 | `simulation` |
| `src/world/world_state.ts` | 10 | `world` |
| `src/core/color.ts` | 8 | `core` |

## Unaufgelöste Beziehungen

79 Kanten sind statisch nicht auflösbar. Sie bleiben im Index sichtbar,
statt geraten zu werden — eine vermutete Beziehung, die als aufgelöst ausgewgeben wird,
ist schlimmer als eine sichtbare Lücke.

| Quelle | Zeile | Kante | Grund |
|---|---|---|---|
| `playwright.config.ts` | 78 | CALL pipe.on | Aufrufziel nicht auflösbar: pipe.on |
| `playwright.config.ts` | 83 | CALL pipe.on | Aufrufziel nicht auflösbar: pipe.on |
| `playwright.config.ts` | 78 | PASS pipe.on | Zielsymbol nicht auflösbar: pipe.on |
| `playwright.config.ts` | 83 | PASS pipe.on | Zielsymbol nicht auflösbar: pipe.on |
| `src/components/GameView.tsx` | 230 | CALL (onExit as unknown as (m: unknown) => void) | Aufrufziel nicht auflösbar: (onExit as unknown as (m: unknown) => void) |
| `src/components/GameView.tsx` | 230 | PASS (onExit as unknown as (m: unknown) => void) | Zielsymbol nicht auflösbar: (onExit as unknown as (m: unknown) => void) |
| `src/components/Greenhouse.tsx` | 116 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 117 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 135 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 144 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 116 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 117 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 135 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/components/Greenhouse.tsx` | 144 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/components/gameIcons.test.tsx` | 17 | CALL it.each(glyphs) | Aufrufziel nicht auflösbar: it.each(glyphs) |
| `src/components/gameIcons.test.tsx` | 17 | PASS it.each(glyphs) | Zielsymbol nicht auflösbar: it.each(glyphs) |
| `src/config/sources.test.ts` | 92 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/config/sources.test.ts` | 103 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/config/sources.test.ts` | 115 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/config/sources.test.ts` | 92 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/config/sources.test.ts` | 103 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/config/sources.test.ts` | 115 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/i18n.tsx` | 27 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/i18n.tsx` | 27 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 21 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 22 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 85 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 21 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 22 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 85 | PASS import | Zielsymbol nicht auflösbar: import |
| `tests/e2eLock.ts` | 19 | CALL process.kill | Aufrufziel nicht auflösbar: process.kill |
| `tests/e2eLock.ts` | 19 | PASS process.kill | Zielsymbol nicht auflösbar: process.kill |
| `tests/helpers/canvasProbe.ts` | 194 | CALL (() => {
                // Papier und Papier-Schatten haben Sättigung, aber ein | Aufrufziel nicht auflösbar: (() => {
                // Papier und Papier-Schatten haben Sättigung, aber ein |
| `tests/helpers/harness.ts` | 58 | CALL expect.simBound | Aufrufziel nicht auflösbar: expect.simBound |
| `tests/helpers/harness.ts` | 324 | CALL expect.simBound | Aufrufziel nicht auflösbar: expect.simBound |
| `tests/helpers/harness.ts` | 58 | PASS expect.simBound | Zielsymbol nicht auflösbar: expect.simBound |
| `tests/helpers/harness.ts` | 324 | PASS expect.simBound | Zielsymbol nicht auflösbar: expect.simBound |
| `tests/helpers/runLedger.ts` | 148 | CALL root.bus.subscribe | Aufrufziel nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 180 | CALL root.bus.subscribe | Aufrufziel nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 186 | CALL root.bus.subscribe | Aufrufziel nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 191 | CALL root.bus.subscribe | Aufrufziel nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 197 | CALL root.bus.subscribe | Aufrufziel nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 199 | CALL root.bus.subscribe | Aufrufziel nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 148 | PASS root.bus.subscribe | Zielsymbol nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 180 | PASS root.bus.subscribe | Zielsymbol nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 186 | PASS root.bus.subscribe | Zielsymbol nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 191 | PASS root.bus.subscribe | Zielsymbol nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 197 | PASS root.bus.subscribe | Zielsymbol nicht auflösbar: root.bus.subscribe |
| `tests/helpers/runLedger.ts` | 199 | PASS root.bus.subscribe | Zielsymbol nicht auflösbar: root.bus.subscribe |
| `tests/mobile.spec.ts` | 24 | CALL page.evaluate | Aufrufziel nicht auflösbar: page.evaluate |
| `tests/mobile.spec.ts` | 26 | CALL (window as any).__simRootRef.current.getSnapshot | Aufrufziel nicht auflösbar: (window as any).__simRootRef.current.getSnapshot |
| `tests/mobile.spec.ts` | 75 | CALL root.getSnapshot | Aufrufziel nicht auflösbar: root.getSnapshot |
| `tests/mobile.spec.ts` | 86 | CALL root.wouldClosePath | Aufrufziel nicht auflösbar: root.wouldClosePath |
| `tests/mobile.spec.ts` | 99 | CALL orig.apply | Aufrufziel nicht auflösbar: orig.apply |
| `tests/mobile.spec.ts` | 24 | PASS page.evaluate | Zielsymbol nicht auflösbar: page.evaluate |
| `tests/mobile.spec.ts` | 33 | PASS page.evaluate | Zielsymbol nicht auflösbar: page.evaluate |
| `tests/mobile.spec.ts` | 86 | PASS root.wouldClosePath | Zielsymbol nicht auflösbar: root.wouldClosePath |
| `tests/mobile.spec.ts` | 99 | PASS orig.apply | Zielsymbol nicht auflösbar: orig.apply |
| `tests/progression.spec.ts` | 186 | CALL expect(mid.savedVariants?.map((v) => v.id), 'die gekeimte Pflanze steht in der B | Aufrufziel nicht auflösbar: expect(mid.savedVariants?.map((v) => v.id), 'die gekeimte Pflanze steht in der B |
| `tests/progression.spec.ts` | 186 | CALL mid.savedVariants?.map | Aufrufziel nicht auflösbar: mid.savedVariants?.map |
| `tests/progression.spec.ts` | 187 | CALL expect(mid.seedlings?.length, 'Keimling wartet im Gewächshaus auf seinen Topf'). | Aufrufziel nicht auflösbar: expect(mid.seedlings?.length, 'Keimling wartet im Gewächshaus auf seinen Topf'). |
| `tests/progression.spec.ts` | 188 | CALL expect(mid.nektar).toBe | Aufrufziel nicht auflösbar: expect(mid.nektar).toBe |
| `tests/progression.spec.ts` | 205 | CALL expect(potted.seedlings?.length).toBe | Aufrufziel nicht auflösbar: expect(potted.seedlings?.length).toBe |
| `tests/progression.spec.ts` | 206 | CALL expect(potted.pots?.filter(Boolean).length).toBe | Aufrufziel nicht auflösbar: expect(potted.pots?.filter(Boolean).length).toBe |
| `tests/progression.spec.ts` | 206 | CALL potted.pots?.filter | Aufrufziel nicht auflösbar: potted.pots?.filter |
| `tests/progression.spec.ts` | 231 | CALL (await meta(page)).pots?.filter | Aufrufziel nicht auflösbar: (await meta(page)).pots?.filter |
| `tests/progression.spec.ts` | 231 | CALL expect((await meta(page)).pots?.filter(Boolean).length).toBe | Aufrufziel nicht auflösbar: expect((await meta(page)).pots?.filter(Boolean).length).toBe |
| `tests/progression.spec.ts` | 186 | PASS expect(mid.savedVariants?.map((v) => v.id), 'die gekeimte Pflanze steht in der B | Zielsymbol nicht auflösbar: expect(mid.savedVariants?.map((v) => v.id), 'die gekeimte Pflanze steht in der B |
| `tests/progression.spec.ts` | 186 | PASS mid.savedVariants?.map | Zielsymbol nicht auflösbar: mid.savedVariants?.map |
| `tests/progression.spec.ts` | 187 | PASS expect(mid.seedlings?.length, 'Keimling wartet im Gewächshaus auf seinen Topf'). | Zielsymbol nicht auflösbar: expect(mid.seedlings?.length, 'Keimling wartet im Gewächshaus auf seinen Topf'). |
| `tests/progression.spec.ts` | 188 | PASS expect(mid.nektar).toBe | Zielsymbol nicht auflösbar: expect(mid.nektar).toBe |
| `tests/progression.spec.ts` | 205 | PASS expect(potted.seedlings?.length).toBe | Zielsymbol nicht auflösbar: expect(potted.seedlings?.length).toBe |
| `tests/progression.spec.ts` | 206 | PASS expect(potted.pots?.filter(Boolean).length).toBe | Zielsymbol nicht auflösbar: expect(potted.pots?.filter(Boolean).length).toBe |
| `tests/progression.spec.ts` | 206 | PASS potted.pots?.filter | Zielsymbol nicht auflösbar: potted.pots?.filter |
| `tests/progression.spec.ts` | 231 | PASS (await meta(page)).pots?.filter | Zielsymbol nicht auflösbar: (await meta(page)).pots?.filter |
| `tests/progression.spec.ts` | 231 | PASS expect((await meta(page)).pots?.filter(Boolean).length).toBe | Zielsymbol nicht auflösbar: expect((await meta(page)).pots?.filter(Boolean).length).toBe |
| `tools/indexer/extract.ts` | 164 | CALL ctx.program.getResolvedModule | Aufrufziel nicht auflösbar: ctx.program.getResolvedModule |
| `tools/indexer/extract.ts` | 164 | PASS ctx.program.getResolvedModule | Zielsymbol nicht auflösbar: ctx.program.getResolvedModule |
| `tools/shinon/tests/test-lane-verdict.test.ts` | 6 | IMPORTS FULL_BUDGET_MS, MS_PER_TEST_BUDGET, TEST_BUDGET, fullBudgetVerdict | Relativer Import nicht auflösbar: ../../../scripts/test-lane-verdict.mjs |
