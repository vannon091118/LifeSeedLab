# QA-Bericht: Onboarding-Runde 1 (Erstkontakt bis Welle 1)

- **Datum:** 2026-09-17
- **Version/Commit:** v0.0.37 (`a7c136c`)
- **Umgebung:** Chrome 153 (CDP-Bridge, sichtbar, Profil `~/.config/lifeseedlab/mcp-profile`), Dev-Server localhost:5173
- **Ablauf:** Krix-Intro (Notizen 1–3) → Shop-Kauf → Gewächshaus → Loadout → Endlos-Run → Welle 1 → Game Over

## Befunde

### Q1 — Schwere: hoch (Balance/Onboarding)
**Welle 1 tötet einen Erstspieler in ~15 Sekunden.** 20 Leben → 0 trotz dreier
Verteidiger (Spross, Wurzelmauer-Blocker, Keimling). Der 20,5-Zellen-Schlangenpfad
bietet einer Reichweite-3-Pflanze wenig Wirkzeit; Grunts (40 HP, 15 dmg/Schuss)
brauchen 3 Treffer ≈ 3 s pro Gegner bei ~0,6 Zellen/s Laufzeit.
**Erwartung:** Welle 1 mit Minimal-Bau überlebbar. Passt zu den offenen
Balance-Punkten (Kampfwerte/Brutstätte-Einstieg) im quality-spec.

### Q2 — Schwere: mittel (Interaktion)
**Drag-Platzierung wirkt nicht.** Getestet: press→move→release (2 Varianten,
Schritte/Verzögerungen variiert) — keine Platzierung, keine Reaktion. Nur reiner
Tap/Klick auf die Zelle platziert. Tray-Hint verspricht beides („ziehe den Geist
übers Feld — Tap platziert“). Deckt sich mit dem offenen Punkt
„Platzierungs-Zuverlässigkeit am Touch-Pfad“ (B16).

### Q3 — Schwere: mittel (UX-Entscheid prüfen)
**Tutorial-Overlay blockiert die Menü-Kärtchen**, solange die passende Krix-Notiz
offen ist (Klick auf „Endlos-Modus“ läuft ins Overlay: `data-tut-overlay intercepts
pointer events`). „Überspringen“ verwirft die restlichen Notizen (3→10) komplett.
Prüfen: Ist Verwerfen gewollt, oder sollen geskippte Notizen später auffindbar sein?

### Q4 — Schwere: niedrig (Konsolenhygiene)
**React-Style-Warnung (7× in einer Session):** „Removing borderColor border …
don’t mix shorthand and non-shorthand properties“ — `borderColor` (longhand)
kollidiert mit `border` (shorthand) im Rerender. Wahrscheinlich Toast- oder
Tray-Komponente (Stilkonflikt tritt bei Krix/Toast-Einblendungen auf).

### Q5 — Schwere: trivia
`favicon.ico` 404 (zwei Requests pro Session).

## Positiv (funktioniert explizit gut)

- Krix-Onboarding ist **kontextabhängig**: Notiz springt automatisch weiter, wenn
  der Spieler die Aktion ausführt (Sprache → Start → Hub).
- Sprachwechsel DE/EN instant und vollständig (inkl. Krix-Texte).
- Shop-Logik korrekt: „Exotisch“ sauber deaktiviert bei 60 Nektar; nach Kauf sind
  alle Buttons korrekt gesperrt. Kauf → neue Sorte sofort in Sammlung (2/3 → 3/4,
  mit „Keim 1“-Etikett).
- **FieldToast mit Ablehnungsgrund** (B22): „Da läuft jemand drüber — hier ist kein
  Platz.“ bei Topf auf dem Gegnerpfad — exakt das spezifizierte Verhalten.
- Game-Over: sauberer Freeze, Platzierung hinter dem Overlay geblockt
  (Freeze-Vertrag hält, vgl. progression.spec).
