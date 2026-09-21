# Task Plan — Visual-First: Reward-Reise (2026-09-21)

## Goal

Die sichtbar wichtigste aktuelle Lücke schließen: **Die Belohnung eines Kills hat keine Reise.**
Der Observer erfindet ihren Ursprung (`x:6, y:4` = Rastermitte), sie bewegt sich nicht auf ein Ziel
zu, es gibt kein Ziel (der Run-HUD zeigt die verdiente Währung überhaupt nicht) und keine Ankunft.
Vertrag B5.1 verlangt: **Quelle → Bewegung → Ziel → Ankunft.**

## Ist-Stand (verifiziert im Checkout, nicht aus Erinnerung)

| Stufe | Datei | Befund |
|---|---|---|
| Producer | `simulation/scoreSystem.ts:21` | `REWARD_GRANTED { reward, sourceId }` — **kein Ort**. `onEnemyDied` bekommt `px, py` (killReactor reicht sie durch) und verwirft sie: `void px; void py`. |
| Decision | `observers/visualObserver.ts:91` | `reward_flight`-Burst an **`x:6, y:4`** (erfundener Ursprung), Partikel driften mit `gravity -0.004`, kein Ziel. |
| Profil | `observers/particles.ts:42` | `reward_flight` existiert, hat aber keine Bahn-Semantik (ParticlePool kennt keinen Zielpunkt). |
| Ziel | `components/GameView.tsx` HUD | Chips = Leben, Welle, Combo, Laufweg, Pause — **kein Währungszähler**. B7.4 verlangt genau dort „resource counter, punch on gain"; der Energie-Zähler ist mit dem Energiesystem gestorben. |
| Ankunft | — | existiert nicht. |

Nebenbefund: `grantWaveReward` (Wellen-Bonus) bucht **keine** Ressource (nur Event) — der Wellen-Flug wäre eine Lüge. Bleibt Register-Befund, kein Umbau.

## Phasen

### Phase 1 — Quelle wird Wahrheit (Sim-Payload)
- `REWARD_GRANTED` trägt `px/py: number | null` (Kill: echter Ort; Welle: `null`).
- `scoreSystem` nutzt die schon durchgereichten Koordinaten statt sie zu verwerfen.
- **Status:** complete (Beleg: `gateB.test.ts` — Payload trägt den Kill-Ort; Wellen-Bonus `null`)

### Phase 2 — Bahn statt Burst (Observer → FeedbackLayer → Renderer)
- Neues Präsentations-Kommando `SpawnRewardFlight { x, y, seed, color, intensity }`.
- `FeedbackLayer` besitzt Flüge (Quelle → Anker, quadratische Kurve, 3 Dots) + Ankunfts-Pop.
- `Renderer` zeichnet sie im Screen-Raum; Anker kommt von der UI (einmal gemessen, kein Frame-Klon).
- **Status:** complete (Beleg: `observers.test.ts` — 4 neue Fälle inkl. Bewegung zum Anker und Ankunft)

### Phase 3 — Ziel sichtbar machen (HUD)
- `hudSnapshot` liefert `nektarEarned` aus dem Sim-State (eine Wahrheit).
- Erster HUD-Chip: Nektar-Zähler (B7.4-Slot „resource counter"), Position stabil (links vor allen anderen).
- **Status:** complete (Beleg: `hudSnapshot.test.ts` + Preview 0→10→132)

### Phase 4 — Beweis
- Tests: Anti-Erfindungs-Lock (Flug am Kill-Ort, nicht 6,4), kein Flug ohne Ort, Ankunft/Decay, HUD-Spiegel.
- `tsc` → `test-lane` → betroffene E2E → Preview Desktop + 390×844.
- Register: `visual.md` (B5.1), `ui.md` (B7.4), `eventAudience` (REWARD_GRANTED), ROADMAP, CHANGELOG.
- **Status:** complete (tsc 0 · 667/667 Unit · 30/30 E2E · Preview Desktop + 390×844)

## Nicht in dieser Scheibe (harte Vorgabe)

- Karl/Käfer: `beetles.ts`, `beetleOrgans.ts`, Käfer-Material — **nicht angefasst**.
- `vectorSystem`, `vector_logic.source`, `vectorField` — **nicht angefasst**.
- Keine zweite Renderpipeline, keine neue Economy, kein neuer Screen.

## Ergebnis

Umgesetzt und belegt. Neue offene Punkte stehen als P-27…P-30 in `docs/process/ROADMAP.md`;
`visual.md` (B5.1), `ui.md` (B7.4) und `bus/eventAudience.ts` (REWARD_GRANTED/ENEMY_DIED) sind auf
den heutigen Stand korrigiert, `CHANGELOG.md` hat den Eintrag.

## Next Step

Keiner in dieser Scheibe. Nächster sinnvoller Schritt wäre ein Register-Punkt (P-27 `grow`/`death`
oder P-29 Wellen-Bonus) — Entscheidung liegt beim Eigentümer.
