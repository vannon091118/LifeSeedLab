# Verifikation VI — Q17 3/3 (pressed-Zombie + fehlendes no_inventory-Feedback), Q18 entkräftet (v0.0.49, `6bbf286`)

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (sichtbarer Chrome, echte Maus) · **Vorgänger:** Verifikation V
**Abholprotokoll:** kein neuer `main`-Commit, keine DEV-Antworten — Messungen gegen bekannten Stand.

---

## 1. Q17 — Zyklus 3 abgeschlossen: **3/3, Befund geschärft in zwei Symptome**

Frischer Lauf (Skip-Tutorial, Endlos, echte Maus):

| # | Sequenz | Beobachtung |
|---|---|---|
| Z3a | Leihe wählen (`pressed=true`, Cancel sichtbar, crosshair) → `Spross×0`-Klick | **Nichts passiert**: Auswahl bleibt bei Leihe, kein Toggle, kein Abbruch. `selectFromTray` bricht still bei `count<=0` ab — der Klick ist ein No-op, **fühlt sich aber wie „Kaputt“ an** (Karte ist klickbar, reagierte aber nicht) |
| Z3b | Leihe auf (6,0) platziert (erfolgreich, `×0`) | Karte bleibt `pressed=true`, Cancel sichtbar, crosshair aktiv — **Auswahl-Zombie mit leerem Inventar** |
| Z3c | Klick auf die leere Karte | **Toggle funktioniert nicht** (pressed bleibt true, Cancel bleibt) — nur der ✕-Cancel-Button räumt auf |
| Z3d | Zell-Tap im Zombie-Zustand | **Kein `no_inventory`-Toast** — obwohl `field.reject.no_inventory` („Von dieser Pflanze ist keine mehr übrig.“) in der i18n existiert. Stiller Konsum. |

**Source-Wurzel (nur gelesen):**
- `PlacementTray.tsx:44-56`: Karte bei `count<=0` → `disabled`-Style, aber `aria-disabled` statt echtem `disabled`; der `onPointerDown`-Handler feuert **immer**. Basis-Karten sind klickbar, `selectFromTray` bricht still ab.
- Nach Platzierung räumt **kein** Pfad die Auswahl auf (`drop()` → `setPlacement(getState())` — `variantId` bleibt gesetzt, auch wenn das Inventar 0 ist).
- `drop()`/`reasonFor` könnten `no_inventory` liefern — aber nur, wenn `active`. Nach dem Zombie-Pfad (Klick auf ×0-Karte bei inaktiver Auswahl) ist `active=false` ⇒ `kind:'none'` ⇒ **kein Toast-Pfad**.

**DEV-Fix-Richtung (konkret):**
1. Karte mit `count<=0` → echtes `disabled` (oder Klick = Abbruch/Auswahlwechsel auf kaufbare Karte).
2. Nach erfolgreicher Platzierung: wenn Inventar der gewählten Sorte 0 → Auswahl automatisch lösen (oder Nachkauf-Karte fokussieren).
3. `no_inventory`-Toast im Zombie-Fallback sicherstellen (der i18n-String existiert, wird aber nie emittet, wenn `active=false`).

## 2. Q18 (Kandidat aus Runde IV: „TopBar schneidet Brett-Reihe 0 ab“) — **ENTKRÄFTET**

Exakter Scan aller 12 Spalten der Reihe 0 + Stichproben Reihe 1: **alle Treffer = `CANVAS[board]`**, TopBar greift in dieser Geometrie nicht ins Brett. Platzierung auf (6,0) gelingt auf Anhieb (`loan×0`, PATH QUALITY 100%). Die Runde-IV-Beobachtung (Hit=`DIV`, TopBar z:2) war **geometrieabhängig** (schmales Fenster, Canvas-Stretch) — als Kandidat verworfen, nicht als Befund meldbar. Bei schmalen Viewports (Mobile 390×844) bleibt das ein Beobachtungspunkt für die N4-Verifikation, aber 0/3.

## 3. N2-Bestätigung nebenbei

Im Welle-2-Verlauf verschwand die `loan_sprout×0`-Karte **komplett** aus dem Tray (nur Spross/Wurzel/Myzel ×0 blieben sichtbar) — N2 („Karte verschwindet bei 0 statt ×0+Nachkauf") erneut beobachtet, jetzt 2/3 (Runde 1: beobachtet, Runde 2: inkonsistent, jetzt: **Karte weg bei Bestand 0**). Inkonsistenz zur Runde 2 erklärt sich vermutlich über den `firstPlayable`-Cue-Mechanik-Ersatz — Source: `plantIds` kommt aus `PLANTS_SOURCE`+`loadout`, die Leihe ist **nicht** in `PLANTS_SOURCE` (nur Label-Fallback `id`), das Erklärungsmuster passt: Die Leihe-Karte rendert nur solange `loadout` sie enthält und verhält sich deshalb anders als Basis-Karten. → Q19-Kandidat (0/3): Leih-Karte ohne Label/ohne ×0-Nachkauf-Pfad = zweiter Karten-Typ mit anderem Verhalten.

## 4. Build/Umgebung

- `tsc -b --noEmit` → **0 Fehler** · Tutorial-Suite + maze_loan → **29/29 grün**
- Konsole des sichtbaren Chrome: keine neuen Fehler
- Spiel-Code unverändert (Report-only)

## Offene Posten (DEV-Priorität, aktualisiert)

1. **F6 (3/3, eskaliert)** — verdeckte Zonen → Echtgeld-Käufe
2. **Q16 (3/3)** — Hold schluckt Brett-Taps lautlos
3. **Q17 (3/3)** — pressed-Zombie + fehlendes no_inventory-Feedback (Fix-Richtung konkretisiert)
4. **N4 (3/3)** — Leiste über Tray (unverändert offen)
5. **N2 (2/3) + Q19 (0/3)** — Leih-Karte verhält sich wie ein zweiter Karten-Typ (kein Label, kein ×0-Nachkauf, verschwindet bei 0)
