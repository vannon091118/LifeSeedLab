<div align="center">

<img src="docs/banner.svg" alt="LifeSeedLab Banner" width="100%"/>

# LifeSeedLab

**PvZ × Isaac — deine Kreuzungen sind deine Türme.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/tests-429%20passing-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Determinismus](https://img.shields.io/badge/sim-deterministisch-4ade80)](docs/architecture/architecture-contract.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p>
  <sub><i>created by</i> <strong>VANNON</strong> · <a href="https://github.com/vannon091118/LifeSeedLab">GitHub</a></sub><br/>
  <sub><i>Volatile Agent Needing No Other Nonsense — Never Overly Nice, Never Average Vibe.</i></sub>
</p>

</div>

---

## 📋 Hallo vom Praktikanten! (Krix übernimmt das Wort)

> *„Hallo! Ich bin Krix — Praktikant, zweiter Stock, Fensterplatz direkt neben dem Kompost. In den offiziellen Institutsunterlagen stehe ich als ‚Strich mit Klemmbrett‘, aber du darfst Krix sagen. Das Klemmbrett habe ich selbst gemalt. Und dieses Labor hier? Das gehört jetzt quasi dir und mir.“*

Willkommen im **LifeSeedLab**! Vergiss alles, was du über langweilige Tower-Defense-Spiele weißt, bei denen man Münzen in vorgefertigte Plastik-Kanonen wirft. Hier wird **gezüchtet**. 

Wir nehmen Gene, Basen, dominante Merkmale und eine Prise Mutations-Glück — und erschaffen Verteidiger, die so lebendig sind, dass sie dir fast die Finger abbeißen. Wenn die Schädlinge anrollen, verteidigst du dein Beet nicht mit gekaufter Stangenware, sondern mit deinen eigenen botanischen und entomologischen Zuchterfolgen.

Ich glaube an dich. Schnapp dir eine Pipette, wir legen los!

---

## 🔬 Wie das Labor funktioniert

```
┌────────────────────────────────────────────────────────────────────────┐
│  1. SAMMELN & SÄEN     2. KREUZEN & BRÜTEN      3. VERTEIDIGEN        │
│  ┌───────────────┐     ┌─────────────────┐      ┌─────────────────┐   │
│  │ Grund-Samen   │ ──▶ │ Genetik-Labor   │ ──▶  │ Das Beet        │   │
│  │ & Käferlarven │     │ & Brutkammer    │      │ (Endless Waves) │   │
│  └───────────────┘     └─────────────────┘      └─────────────────┘   │
│         │                       │                        │             │
│         ▼                       ▼                        ▼             │
│    Erste Basen             Dominanz, Rezessiv,      Schädlinge stoppen,│
│    ernten oder von         Mutationen & Traits      Nektar sammeln,    │
│    Krix leihen             → Echte Nachkommen       neue Gene sichern  │
└────────────────────────────────────────────────────────────────────────┘
```

### 🌿 Die Labor-Stationen

1. **Das Zuchtlabor (Breeding Lab):**  
   Wähle zwei Elternpflanzen aus deiner Sammlung. Ihre Gene ringen um Dominanz: Schussfrequenz, Dornenschaden, Sporen-Auren oder Kettenblitze. Jedes Kind erbt Eigenschaften, überrascht mit Mutationen und erhält einen deterministischen Stammbaum.
2. **Die Brutstätte (Beetle Hatchery):**  
   Pflanzen allein reichen dir nicht? Züchte **Käfer (Brood)**! Aus Larven entstehen Begleiter mit Chitin-Panzern, Mandibeln und biochemischen Drüsen, die über das Feld patrouillieren und Schädlinge im Nahkampf zerlegen.
3. **Das Gewächshaus (Greenhouse):**  
   Kreuzungen brauchen Zeit! Während du draußen auf dem Feld Wellen überlebst, reifen deine Samen in den Pflanzbeeten heran. Jede überstandene Welle bringt sie der Keimung näher.
4. **Der Codex (Krix' Forschungsbuch):**  
   Jede Entdeckung wird in einer kryptografischen Kette (`genome_hash`) verewigt. Lokal, ehrlich, fälschungssicher. Entdeckst du eine seltene Spezies als Erster, gehört sie für immer dir.
5. **Das Beet (Tower Defense):**  
   30 Ticks pro Sekunde, unendliche Wellen, Bosse alle 10 Runden und ein gnadenloser Tag/Nacht-Zyklus. Dein Loadout (bis zu 4 gezüchtete Lieblinge) entscheidet über Sieg oder Kompost.

---

## 🧬 Der Kern: Echte Genetik statt Zufallssalat

Bei uns gibt es keine willkürlichen Würfel im Code. Alles basiert auf **Mendel-Genetik und deterministischer Mathematik**:

```
PlantVariant
├── id: "cross_01a3"          // Stabil & deterministisch
├── genome: Gene[]            // 10 Gen-Slots (Base / Extra / Effect)
├── stats: BredStats          // HP, Range, RoF, Damage, Pierce, Crit
├── traits: Trait[]           // Slow, Burn, Poison, Split-Shot
├── visual: ResolvedVisual    // Aus dem Genom generiert — treu im Aussehen!
└── generation: number        // Zucht-Generation im Stammbaum
```

*Krix' Merksatz:* **Gleiche Eltern + gleicher Seed = exakt dasselbe Kind.** Weltweit. Auf jedem Rechner. Teilbar als Code: `lifeseed:<seed>:<gen>:<hash>`.

---

## 🎨 Art Direction: „Papier trifft CGI“

LifeSeedLab sieht nicht aus wie ein generisches Mobile-Game. Die visuelle Identität folgt einem bindenden Vertrag:

- **Welt aus Notizpapier:** Karo-Muster, ausgefranste Kanten, Kaffee-Ränder, aufgetackerte Zettel und Bleistift-Notizen.
- **Leuchtender Nintendo-Pop:** Pflanzen, Käfer und Gegner brechen mit satten Fills, dicken 2.5px Tusche-Outlines und Glanzpunkten bewusst aus dem matten Papierhintergrund hervor.
- **Reine Handarbeit:** Keine fremde Game-Engine. Reines HTML5 Canvas 2D, handgezeichnete `Path2D`-Pfade und mathematisch generierte Offscreen-Texturen.

---

## 🏗️ Architektur & Determinismus (Das Herz unter der Haube)

Das Spiel folgt zwei unumstößlichen Endgleichungen:

```
SOURCE + SEED + CLOCK + PLAYER COMMANDS        = DETERMINISTIC GAME STATE
STATE  + EVENTS + VISUAL SOURCE + VISUAL SEED  = DETERMINISTIC PRESENTATION
```

- **Fixed Timestep (30 TPS):** `core/clock.ts` taktet die Welt starr und unabhängig von Render-Frames.
- **RNG-Isolation:** 8 isolierte Namespaces (`world`, `wave`, `enemy`, `plant`, `brood`, `loot` für Simulation; `visual`, `particle`, `cosmetic` für Darstellung). Kein `Math.random()`, kein `Date.now()`.
- **Single-Writer-Ownership:** Jedes State-Slice (Pflanzen, Gegner, Projektile, Score, Wellen) gehört exakt einem System.
- **State-Hash-Verifikation:** In jedem Tick wird der Zustand per FNV-1a gehasht. Gleiche Eingaben erzeugen auf die Sekunde identische Hashes.

---

## 🚀 Schnellstart für Forscher & Entwickler

```bash
# Repository klonen & Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Vite, Port 5173)
npm run dev

# Inkrementeller Typecheck (0 Fehler Pflicht)
node node_modules/typescript/bin/tsc -b --noEmit

# Test-Suite ausführen (Commit-Lane / berührte Tests)
node scripts/test-lane.mjs

# Komplette Test-Suite (429+ Tests, alle grün)
node scripts/test-lane.mjs --full

# Produktions-Build erzeugen
node node_modules/vite/bin/vite.js build
```

### 📱 Mobile-Test (Portrait 390×844)
Das Spiel ist **Portrait-First (390×844)** entwickelt:
1. `npm run dev` starten.
2. In den Chrome/Firefox DevTools: *Toggle Device Toolbar* → *Responsive* → **390 × 844** einstellen.
3. Touch-Targets sind mindestens 44×44px groß.

### 🧪 Das DevGate (`?dev=1`)
Hänge `?dev=1` an die URL an, um das geheime Labor-Panel freizuschalten:
- Live State-Hash, Tick-Zähler, Event-Stream.
- Fast-Forward (`window.__ff(n)`).
- Partikel-Budgets, Seed-Inspektor und FX-Toggles.
*(Im normalen Spiel bleibt all das unsichtbar!)*

---

## 🧭 Projektstruktur

```
src/
├── core/           # Clock (30tps), deterministischer RNG (8 Namespaces), IDs, Hashes
├── bus/            # EventBus & CommandQueue (strikte Contracts v1)
├── simulation/     # 6 Gameplay-Systeme + MapSystem + SimRoot (reine Spiellogik)
├── config/         # Content Truth (*.source.ts: Pflanzen, Gegner, Käfer, Map, Werte)
├── genome/         # Genom-Modell, Kreuzung, Mendel-Logik, Mutationen, Phänotypen
├── visual/         # Generator: Genom + visualSeed → ResolvedVisual
├── render/         # Canvas 2D Renderer, Papercraft-Offscreen, 9 Zeichen-Layer
├── observers/      # Read-only Beobachter (Partikel, SFX-Audio, Visual-Commands)
├── persistence/    # Speicher-Owner (storage.ts, Checksummen, Quarantäne, Save-Migration)
├── discovery/      # Discovery-Chain (lokaler Codex, kryptografischer Genom-Beweis)
├── components/     # React-Screens (Labor, Gewächshaus, Brutstätte, Beet, Krix-Tutorial)
└── i18n/           # Vollständig zweisprachig (Deutsch / Englisch)
```

---

## 📜 Regelwerk & Weiterführende Doku

- [`AGENTS.md`](AGENTS.md) — Kompakter, bindender Arbeitsvertrag für Entwickler & Agenten.
- [`docs/architecture/architecture-contract.md`](docs/architecture/architecture-contract.md) — Rechtsverbindliche System- und Ownership-Regeln.
- [`docs/architecture/architecture.md`](docs/architecture/architecture.md) — Ausführliche technische Dokumentation & Domänen-Verträge.
- [`docs/process/ROADMAP.md`](docs/process/ROADMAP.md) — Meilensteine, QA-Findings und Aufgabenliste in logischer Reihenfolge.
- [`docs/quality/quality-spec.md`](docs/quality/quality-spec.md) — Asset-Spezifikationen und DoD-Kriterien.

---

## 📄 Lizenz & Danksagung

- **Lizenz:** MIT License — siehe [`LICENSE`](LICENSE).
- **Entwickelt von:** VANNON (`Volatile Agent Needing No Other Nonsense`).
- **Besonderer Dank:** An Krix, der trotz verschüttetem Dünger und gefräßigen Raupen immer noch tapfer sein Klemmbrett hält.

<div align="center">
  <sub>🌱 <i>„Viel Glück da draußen. Ich bin Krix, der Strich, der an dich glaubt.“</i> 📋</sub>
</div>

## 🧭 Projektstatus

<!-- SHINON:STATUS:BEGIN -->
_Automatisch von Shinon aus dem realen Repository-Status erzeugt — nicht manuell pflegen._

| Kennzahl | Stand |
|---|---|
| Branch | `main` · Upstream: `origin/main` (+0/-0) |
| HEAD | `9824b54` — fix(spiel): karte überlebt den run, käfer laufen, krix ist lesbar |
| Arbeitsbaum | 4 gestaged, 1 geändert, 0 neu |
| Letztes Gate | 🛑 geschlossen (preflight, 0 Fehler, 2 Warnungen) |
| Gate-Modus | 🔒 Enforcement — Warnungen blockieren wie Fehler |
| Letzter Shinon-Commit | `9824b54` fix(spiel): karte überlebt den run, käfer laufen, krix ist lesbar |
| Letzter Push | ✅ origin/main |
| LOC-Hotspots | `src/meta/store.ts` 283/200 (142 %)<br>`src/meta/run.ts` 265/200 (133 %)<br>`src/components/Greenhouse.tsx` 480/400 (120 %)<br>`src/config/phenotype.source.ts` 239/200 (120 %)<br>`src/meta/economy.ts` 222/200 (111 %) |
<!-- SHINON:STATUS:END -->
