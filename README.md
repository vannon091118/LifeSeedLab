<div align="center">

<img src="docs/banner.svg" alt="LifeSeedLab Banner" width="100%"/>

# LifeSeedLab

**PvZ × Isaac — deine Kreuzungen sind deine Türme.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/tests-52%20passing-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Determinismus](https://img.shields.io/badge/sim-deterministisch-4ade80)](ARCHITECTURE_CONTRACT.md)

</div>

---

## Was ist das?

Ein Browser-Tower-Defense, bei dem du **Pflanzen züchtest statt kaufst**: Aus wenigen Grundsorten entstehen durch deterministische Kreuzungen immer neue Varianten mit eigenen Genomen, Traits und Stats — und diese Nachkommen sind deine Türme gegen prozedural generierte Gegnerwellen.

- 🌱 **Züchten** — Genome kreuzen, Mutationen entdecken, Sammlung aufbauen
- 🌊 **Endless** — unendliche, seed-basierte Wellen mit Bossen alle 10 Wellen
- 🧬 **Emergenz** — 10 Basen × 10 Extras × 10 Effects, visuell generiert, nie hardgecoded
- ⚖️ **Determinismus** — gleicher Seed + gleiche Commands = identischer Spielstand (per State-Hash prüfbar)
- 🍯 **Nektar** — persistentes Roguelike-Geld über Runs hinweg
- 🇩🇪🇬🇧 **Deutsch/Englisch** — vollständige Lokalisierung im Spiel

## Schnellstart

```bash
npm install     # Abhängigkeiten installieren
npm run dev     # Dev-Server auf 0.0.0.0:5173
npm run build   # Produktions-Build nach dist/
npm test        # Vitest-Suite (52 Tests)
```

## Architektur

Das Projekt folgt einem bindenden [Architekturvertrag](ARCHITECTURE_CONTRACT.md):

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS = DETERMINISTIC GAME STATE
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED = DETERMINISTIC PRESENTATION
```

| Modul | Pfad | Verantwortung |
|---|---|---|
| Clock | `src/core/clock.ts` | Fixed-Timestep-Spielzeit (30 Ticks/s) |
| RNG | `src/core/rng.ts` | Einzige Zufallsquelle, 8 Namespaces, `deriveSeed` |
| IDs | `src/core/ids.ts` | Stabile Entity-IDs (identische Runs → identische Sequenzen) |
| Hash | `src/core/hash.ts` | Kanonischer State-Hash für Determinismus-Prüfung |
| Bus | `src/bus/` | Event-/Command-Contracts, der einzige Handover zwischen Systemen |
| Simulation | `src/simulation/` | 6 Owningsysteme (Plant/Enemy/Projectile/Score/Combo/Wave) |
| Source | `src/config/` | Content-Truth: Pflanzen, Gegner, Effects, Extras, Bases |
| Visual | `src/visual/` | Generator: `visualSeed + Source = ResolvedVisual` |
| Render | `src/render/` | Canvas-Layer 0–8, Camera (Observer-owned) |
| Observer | `src/observers/` | Event→FX-Übersetzung, Partikel-Pool mit Budget |

**Kernregeln:** Gameplay ≠ Rendering · Graphics = Observers · Source = Content Truth · Bus = Handover · Kein `Math.random`/`Date.now` in der Spiellogik.

## Determinismus ausprobieren

1. Run starten (Seed wird aus Master-Seed + Run-Nummer abgeleitet)
2. Debug-Panel öffnen (`[D]`) — der **State-Hash** wird live angezeigt
3. **FX OFF** schalten → Gameplay-State bleibt bit-identisch
4. Gleicher Seed + gleiche Züge → gleicher Hash, gleiche Entity-IDs, gleicher Wellenverlauf

## Tests

```bash
npx vitest run          # komplette Suite
npx vitest run src/core # nur Clock/RNG/IDs/Hash
```

Abgedeckt: Clock-Determinismus, RNG-Isolation pro Namespace, Seed-Derivation, ID-Sequenzen, State-Hash, Event-Contracts, Sim-Integration (Seed+Commands → Hash), Source-ID-Validierung, Visual-Determinismus, Observer-Purity, Partikel-Budgets.

---

<div align="center">
<sub>Written with Buffy — Codebuff Agent</sub>
</div>
