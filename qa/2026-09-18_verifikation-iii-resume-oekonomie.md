# Verifikation III — Resume-Ökonomie über den echten Lifecycle (v0.0.49, `6bbf286`)

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (Preview-Tab + vitest + idb-Lesung) · **Anlass:** Verifikations-II-Beobachtung A — „Energie nach Resume **180 statt 150**: Prep-Einkommens-Puls wurde nach Resume nochmal gezahlt, ein Save/Load-Loop könnte Einkommen farmen."
**Status der Beobachtung A: WIDERLEGT (3/3-Methode, alle drei Ebenen).** Der Wert 180 war der reguläre **Welle-1-Bonus (+30)**, kein Doppelpuls.

---

## Methode

Drei unabhängige Ebenen, jede mit Energie-Buchführung an jeder Kante:

1. **Headless (vitest, echte Pipeline):** `SimulationRoot` → `START_WAVE` → Welle ausspielen → Snapshot (exakt die `saveRun`-Felder) → `SimulationRoot({ resume })` → E0-Assertion → Welle 2. Temp-Testdatei, nach der Messung gelöscht (kein Spielcode im Commit).
2. **Browser-Live (Preview-Tab, `?dev=1`):** echter Autosave-Pfad — idb `lifegamelab/runs/run` vor/nach Resume, HUD-Chips gegen idb, DevOverlay-Eventlog als Reward-Beweis.
3. **Source-Audit:** Energie-Schreiber enumeriert (`scoreSystem.ts`: nur `onEnemyDied` + `grantWaveReward`; `plantSystem.ts:55`: „0 passives Einkommen" — Source-getragen).

## Ergebnisse

### E1 — Headless-Trace (Zyklus 1: nackte Sim, Zyklus 2/3: mit Pflanze + Rebuild)

| Kante | Assertion | Ergebnis |
|---|---|---|
| E0 nach `applyResume` | `=== snapshot.energy` (strikt, nie addiert) | ✅ 222→222, 247→247 |
| `START_WAVE` | Δ = 0 (zahlt nichts) | ✅ beide Iterationen |
| Welle 1 (mit Leihe/Spross auf Route) | Ende `prep`, Δ = Kills×reward + Bonus(20+10·wave) | ✅ 150→180 (Δ30 = exakt Bonus) |
| Idempotenz | gleicher Snapshot → zwei Roots → identische E0 | ✅ |
| Iteration 2/3 (Welle 2) | Resume-Pflanze restored (`sprout@0,0`), E0 strikt | ✅; Welle 2 mit 1 Pflanze → `gameover` (Balance, kein Ökonomie-Bug; Δ25 = 1×fast(15)+1×grunt(10), **kein** Bonus bei gameover — formel-konsistent) |

**Test-Fußnote:** `loan_sprout` existiert im nackten Test-Root nicht (kommt im Spiel via Hub-Loadout) — die Nachricht „kein Doppelpuls" wurde deshalb gegen `sprout` (Basis-Inventar) und im Browser gegen die echte Leihe geführt. Trace-Fehlschläge meines ersten Anlaufs (NaN/undefined) waren meine flache Snapshot-Übergabe, nicht die Sim.

### E2 — Browser-Live über den echten Autosave (DevOverlay + idb-Lesung)

| Kante | Beobachtung |
|---|---|
| idb `run` vor Resume | `energy:150, wave:1, lives:20, plants:[]` |
| Nach Resume-Klick (HUD) | **E=150, lives=20, Wave 1** — exakt idb, kein Aufschlag |
| `START_WAVE`-Klick | E bleibt 150 (Δ0) |
| Welle 2 (leakt durch, 0 Pflanzen) | Endstand E=150 — **kein Bonus** bei gameover, `GAME_OVER {wave:2}` im Log |
| idb nach GAME_OVER | `runs`-Keys: **leer** — toter Run ist nicht resumierbar (Vertrag hält) |
| Frischer Run → Nachkauf (−100) → Platzierung `sprout@6,3` | E 150→50→50; Platzierung kostet Inventar, kein ⚡ (B37 bestätigt) |
| Welle 1 gewonnen (echte Kill-Schüsse, `PROJECTILE_HIT`/`DAMAGE_DEALT` im Log) | `REWARD_GRANTED {"energy":30,"sourceId":"wave-1"}` — **genau ein** Wellen-Reward |
| Autosave (10 s) → idb | `energy:80, lives:8, wave:2, plants:[sprout@6,3]` — **byte-gleich mit HUD** |

EinResume ⇒ genau ein Bonus. Der vermutete „Nachzahl-Puls" existiert in keiner Ebene.

### E3 — Nebenbei verifiziert

- **Resume-Vertrag:** Pflanze/Inventar/Lives/Energie restored, `currentRoute` leer bis zum ersten Tick (bekannter Kandidat B, unverändert), Phase `prep`, Auto-Waves-Schalter resets auf Session-Wert (B32-Vertrag).
- **Placement-Tray im Live-Test:** Auswahl per JS-dispatchtem `pointerdown` **tut nichts** — der Tray-Handler ruft `releasePointerCapture` und bricht bei synthetischen Events still ab (Pointer 1 existiert nicht). **Alle bisherigen „stiller Tray"-Beobachtungen dieser Kiste, die mit `dispatchEvent` gefahren wurden, sind mit diesem Artefakt zu relativieren**; gültig sind nur `preview_click`/echte Maus-Läufe. (Q13-Rückblende bleibt korrekt — dort wurde per `preview_click` gemessen.)
- **DevOverlay quillt über den Tray:** Bei `?dev=1` verdeckt das Overlay die Nachkauf-Buttons (QA-Instrument, nicht Release-Fläche — aber als Messstörung dokumentiert; Workaround `pointerEvents:none`).

## Konsequenzen

- **Beobachtung A gestrichen:** kein Befund, keine DEV-Aktion. Die Ökonomie ist über alle drei Ebenen dicht.
- **Offen bleibt:** Beobachtung B (`currentRoute` leer direkt nach Resume — 0/3-Kandidat, Renderer-Fenster), F6-Zyklus 3, N4-Fix-Verifikation wenn der DEV liefert.
- **Messhygiene-Regel (Runbook-Ergänzung):** Sim-Interaktion im Browser nur über echte Pointer-Ereignisse (`preview_click` oder CDP-`Input`); `dispatchEvent(new PointerEvent(...))` ist als **invalide Methode** für Tray-/Karten-Aktionen vermerkt.
