# Progress — Visual-First: Reward-Reise (21.09.2026)

## Session-Log

**Start:** Ist-Stand geprüft (`git status`): Der Worktree trägt einen großen **gestageten** Satz aus
einer Parallel-Session (Vector-Engine, Bus, Packs). Nichts davon angefasst, nichts gestaged,
nichts committet.

**Verifizierter Befund (alle Stufen im Code gelesen):**

| Stufe | Datei | Ist-Stand vorher |
|---|---|---|
| Quelle | `simulation/scoreSystem.ts` | `void px; void py` — Kill-Ort verworfen; `REWARD_GRANTED { reward, sourceId }` ohne Ort |
| Erfindung | `observers/visualObserver.ts` | `reward_flight`-Burst an `x: 6, y: 4` (Rastermitte) |
| Bewegung | `observers/particles.ts` | Profil kennt kein Ziel — Partikel driften |
| Ziel | `components/GameView.tsx` | kein Währungszähler im Lauf-HUD |
| Ankunft | — | existierte nicht |

**Umgesetzt:** siehe `task_plan.md` (Phasen 1–6 abgeschlossen).

## Was gebaut wurde (Belege)

- `events.ts` / `scoreSystem.ts`: `REWARD_GRANTED` trägt `px/py` (Kill echt, Welle `null`).
- `visualObserver.ts`: Kommando `SpawnRewardFlight` (Ort aus dem Payload); kein Flug bei `null`.
- `render/layers/feedback.ts`: Flüge (quadratische Bahn, 3 ink-konturierte Gold-Dots) + Ankunfts-Puls am Anker.
- `renderer.ts` / `gameRuntime.ts`: Screen-Raum-Zeichnung + Anker von der UI (`setRewardAnchor`).
- `hudSnapshot.ts` / `GameView.tsx` / `GameIcons.tsx` / `gameViewStyles.ts`: Nektar-Zähler als erster HUD-Chip (B7.4-Slot), Lage einmal gemessen.
- `particles.ts`: toter `reward_flight`-Profileintrag gelöscht.

## Verifikation (jeweils echter Lauf, kein Plan)

| Prüfung | Ergebnis |
|---|---|
| `tsc -b --noEmit` | 0 Fehler |
| `test-lane --full` | 667/667 grün (7,8 s einmal, 12,0 s unter Last — Budget 10 s überschritten bei paralleler Session; kein Fehler) |
| `@playwright/test` (alle 30) | 30/30 grün (run, mobile, progression, mechanics, gamebreaker, router, preview) |
| Preview Desktop | Flight im eingefrorenen Frame sichtbar; Chip zählt live (0 → 10 → 132) |
| Preview 390×844 (Playwright, echter Viewport) | Ghost + Reichweitenring, Platzierung, Flight — Pixelprobe: Gold-Centroid 314→240 px Richtung Anker, `scrollWidth 390 = clientWidth 390` |
| Lokale Einzelprüfung | `version.test.ts` schlug **einmal** fehl (`0.0.83` vs `0.0.82`) — Zwischenzustand der Parallel-Session beim Versions-Bump, direkt danach 5/5 grün. Nicht mein Slice, nicht angefasst. |

## Entdeckte, NICHT behobene Brüche (Register)

ROADMAP §3: **P-27** (`grow`/`death`-Animationen werden emittiert, aber nicht gezeichnet),
**P-28** (`muzzle_puff` tot), **P-29** (Wellen-Bonus ohne Senke/Ort), **P-30** (Emoji-Endgrafik in
den Hub-Tabs).

**Widerlegt (nicht als Befund geführt):** Der Verdacht „Top-Bar läuft bei 390×844 rechts heraus"
kam aus einem Artefakt meiner Kontaktbogen-Seite. Messung im echten Viewport: `overflowing: []`.
