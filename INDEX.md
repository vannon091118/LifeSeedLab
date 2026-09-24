# LifeSeedLab — Repository-Index

<!-- GENERIERT von tools/indexer — nicht von Hand editieren. Quelle: der Code. -->

Einstiegspunkt für die Navigation: `AGENTS.md` → dieser Index → Modul-Index → Datei → Symbol → Relation.
Die maschinenlesbare Quelle aller Beziehungen ist `.index/index.json`; jeder Index hier ist ein Auszug daraus.

## PROJECT

```text
PROJECT
├── bus  (8 Dateien)
│   └── src/bus/INDEX.md
├── components  (58 Dateien)
│   └── src/components/INDEX.md
├── config  (18 Dateien)
│   └── src/config/INDEX.md
├── core  (7 Dateien)
│   └── src/core/INDEX.md
├── dev  (5 Dateien)
│   └── src/dev/INDEX.md
├── discovery  (9 Dateien)
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
├── simulation  (42 Dateien)
│   └── src/simulation/INDEX.md
├── src  (12 Dateien)
│   └── src/INDEX.md
├── testing  (3 Dateien)
│   └── src/testing/INDEX.md
├── visual  (4 Dateien)
│   └── src/visual/INDEX.md
├── world  (2 Dateien)
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
| `bus` | [`src/bus`](src/bus/INDEX.md) | 8 | `components`, `dev`, `meta` +5 | `components`, `dev`, `meta` +5 | `observers (2)`, `simulation (7)` |
| `components` | [`src/components`](src/components/INDEX.md) | 58 | `bus`, `meta`, `render` +2 | `bus`, `meta`, `render` +2 | `bus (4)`, `core (2)`, `observers (1)` +2 |
| `config` | [`src/config`](src/config/INDEX.md) | 18 | ``, `components`, `genome` +7 | ``, `components`, `genome` +7 | `core (1)` |
| `core` | [`src/core`](src/core/INDEX.md) | 7 | ``, `bus`, `components` +10 | ``, `bus`, `components` +10 | — |
| `dev` | [`src/dev`](src/dev/INDEX.md) | 5 | `components`, `render` | `components`, `render` | `simulation (3)` |
| `discovery` | [`src/discovery`](src/discovery/INDEX.md) | 9 | ``, `components`, `genome` | ``, `components`, `genome` | — |
| `genome` | [`src/genome`](src/genome/INDEX.md) | 20 | `components`, `config`, `discovery` +4 | `components`, `config`, `discovery` +4 | `config (1)`, `core (26)` |
| `i18n` | [`src/i18n`](src/i18n/INDEX.md) | 9 | `bus`, `components`, `simulation` +1 | `bus`, `components`, `simulation` +1 | — |
| `meta` | [`src/meta`](src/meta/INDEX.md) | 16 | `genome`, `simulation`, `src` +1 | `genome`, `simulation`, `src` +1 | `bus (1)`, `core (4)`, `persistence (8)` +1 |
| `observers` | [`src/observers`](src/observers/INDEX.md) | 5 | `bus`, `render`, `simulation` | `bus`, `render`, `simulation` | `bus (2)`, `core (5)`, `render (19)` +1 |
| `persistence` | [`src/persistence`](src/persistence/INDEX.md) | 8 | `components`, `discovery`, `meta` +4 | `components`, `discovery`, `meta` +4 | `bus (13)`, `simulation (11)` |
| `render` | [`src/render`](src/render/INDEX.md) | 18 | `bus`, `components`, `observers` +1 | `bus`, `components`, `observers` +1 | `bus (15)`, `components (7)`, `core (40)` +3 |
| `simulation` | [`src/simulation`](src/simulation/INDEX.md) | 42 | `bus`, `components`, `dev` +7 | `bus`, `components`, `dev` +7 | `bus (138)`, `core (18)`, `observers (8)` |
| `src` | [`src`](src/INDEX.md) | 12 | ``, `components`, `config` +8 | ``, `components`, `config` +8 | — |
| `testing` | [`src/testing`](src/testing/INDEX.md) | 3 | `bus`, `components`, `meta` +3 | `bus`, `components`, `meta` +3 | `bus (2)`, `core (1)`, `persistence (1)` +1 |
| `visual` | [`src/visual`](src/visual/INDEX.md) | 4 | `components`, `dev`, `genome` +2 | `components`, `dev`, `genome` +2 | — |
| `world` | [`src/world`](src/world/INDEX.md) | 2 | `components`, `persistence`, `render` +3 | `components`, `persistence`, `render` +3 | — |

## Hochfrequenz-Knoten (Fan-in)

Dateien, die viele andere Module kennen. Ein Fan-in-Knoten ist eine Vertragsgrenze:
Änderungen daran brauchen mehr als eine Datei und gehören in den Besitzer-Slice.

| Datei | Importiert von | Modul |
|---|---|---|
| `src/types.ts` | 59 | `src` |
| `src/core/rng.ts` | 32 | `core` |
| `src/testing/testkit.ts` | 30 | `testing` |
| `src/bus/events.ts` | 25 | `bus` |
| `src/i18n.tsx` | 25 | `src` |
| `src/config/economy.source.ts` | 24 | `config` |
| `src/core/ids.ts` | 20 | `core` |
| `src/config.ts` | 19 | `src` |
| `src/config/map.source.ts` | 18 | `config` |
| `src/bus/commands.ts` | 12 | `bus` |
| `src/visual/generator.ts` | 12 | `visual` |
| `src/config/beetles.source.ts` | 11 | `config` |
| `src/config/plants.source.ts` | 11 | `config` |
| `src/core/hash.ts` | 11 | `core` |
| `src/simulation/state.ts` | 11 | `simulation` |
| `src/config/effects.source.ts` | 10 | `config` |
| `src/config/vector_logic.source.ts` | 10 | `config` |
| `src/genome.ts` | 10 | `src` |
| `src/world/world_state.ts` | 10 | `world` |
| `src/genome/beetle.ts` | 9 | `genome` |

## Unaufgelöste Beziehungen

56 Kanten sind statisch nicht auflösbar. Sie bleiben im Index sichtbar,
statt geraten zu werden — eine vermutete Beziehung, die als aufgelöst ausgewgeben wird,
ist schlimmer als eine sichtbare Lücke.

| Quelle | Zeile | Kante | Grund |
|---|---|---|---|
| `src/App.tsx` | 31 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/App.tsx` | 32 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/App.tsx` | 33 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/App.tsx` | 34 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/App.tsx` | 35 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/App.tsx` | 31 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/App.tsx` | 32 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/App.tsx` | 33 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/App.tsx` | 34 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/App.tsx` | 35 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/components/GameView.tsx` | 232 | CALL (onExit as unknown as (m: unknown) => void) | Aufrufziel nicht auflösbar: (onExit as unknown as (m: unknown) => void) |
| `src/components/GameView.tsx` | 232 | PASS (onExit as unknown as (m: unknown) => void) | Zielsymbol nicht auflösbar: (onExit as unknown as (m: unknown) => void) |
| `src/components/gameIcons.test.tsx` | 17 | CALL it.each(glyphs) | Aufrufziel nicht auflösbar: it.each(glyphs) |
| `src/components/gameIcons.test.tsx` | 17 | PASS it.each(glyphs) | Zielsymbol nicht auflösbar: it.each(glyphs) |
| `src/config/sources.test.ts` | 92 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/config/sources.test.ts` | 103 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/config/sources.test.ts` | 115 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/config/sources.test.ts` | 92 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/config/sources.test.ts` | 103 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/config/sources.test.ts` | 115 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 21 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 22 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 85 | CALL import | Aufrufziel nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 21 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 22 | PASS import | Zielsymbol nicht auflösbar: import |
| `src/persistence/persistence_resume.test.ts` | 85 | PASS import | Zielsymbol nicht auflösbar: import |
| `tests/e2eLane.test.ts` | 44 | CALL s.areas.filter | Aufrufziel nicht auflösbar: s.areas.filter |
| `tests/e2eLane.test.ts` | 44 | CALL s.areas.filter((a) => !existsSync(a)).map | Aufrufziel nicht auflösbar: s.areas.filter((a) => !existsSync(a)).map |
| `tests/e2eLane.test.ts` | 64 | CALL plan.specs.filter | Aufrufziel nicht auflösbar: plan.specs.filter |
| `tests/e2eLane.test.ts` | 44 | PASS s.areas.filter | Zielsymbol nicht auflösbar: s.areas.filter |
| `tests/e2eLane.test.ts` | 44 | PASS s.areas.filter((a) => !existsSync(a)).map | Zielsymbol nicht auflösbar: s.areas.filter((a) => !existsSync(a)).map |
| `tests/e2eLane.test.ts` | 64 | PASS plan.specs.filter | Zielsymbol nicht auflösbar: plan.specs.filter |
| `tests/helpers/canvasProbe.ts` | 194 | CALL (() => {
                // Papier und Papier-Schatten haben Sättigung, aber ein | Aufrufziel nicht auflösbar: (() => {
                // Papier und Papier-Schatten haben Sättigung, aber ein |
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
| `tests/mobile.spec.ts` | 76 | CALL root.getSnapshot | Aufrufziel nicht auflösbar: root.getSnapshot |
| `tests/mobile.spec.ts` | 87 | CALL root.wouldClosePath | Aufrufziel nicht auflösbar: root.wouldClosePath |
| `tests/mobile.spec.ts` | 100 | CALL orig.apply | Aufrufziel nicht auflösbar: orig.apply |
| `tests/mobile.spec.ts` | 24 | PASS page.evaluate | Zielsymbol nicht auflösbar: page.evaluate |
| `tests/mobile.spec.ts` | 33 | PASS page.evaluate | Zielsymbol nicht auflösbar: page.evaluate |
| `tests/mobile.spec.ts` | 87 | PASS root.wouldClosePath | Zielsymbol nicht auflösbar: root.wouldClosePath |
| `tests/mobile.spec.ts` | 100 | PASS orig.apply | Zielsymbol nicht auflösbar: orig.apply |
| `tools/indexer/extract.ts` | 164 | CALL ctx.program.getResolvedModule | Aufrufziel nicht auflösbar: ctx.program.getResolvedModule |
| `tools/indexer/extract.ts` | 164 | PASS ctx.program.getResolvedModule | Zielsymbol nicht auflösbar: ctx.program.getResolvedModule |
