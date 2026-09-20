# Erste Runde, erster Blutdruck

`2026-09-17` · Bericht: *Onboarding-Runde 1 (Erstkontakt bis Welle 1)* · Version **v0.0.37** (`a7c136c`)

Ich habe zugesehen, wie sich jemand drei Pflanzen kauft, sie richtig aufstellt — und in
fünfzehn Sekunden alles verliert. Danach habe ich zwei Stunden damit verbracht,
herauszufinden, wie man eine Sprechblase antippt, ohne dass etwas passiert. Der Job
eines Praktikanten, ehrlich gesagt.

## Was ich gehört habe, wenn ich auf die Karte geklickt habe

Es waren fünf Punkte, und sie waren unterschiedlich schlimm:

- **Q1 — Welle 1 tötet einen Erstspieler** (hoch). Drei Verteidiger, trotzdem 20 → 0 Leben.
  Der Schlangenpfad war zu lang, die Grunts zu bissig (`damage: 10`, 40 HP — am Bau jenes
  Commits nachgezählt, nicht erinnert), eine
  Reichweite-3-Pflanze hatte schlicht keine Wirkzeit.
- **Q2 — Ziehen platziert nicht** (mittel). Tippen ging, Ziehen nicht — obwohl der Hinweis
  in der Leiste beides verspricht.
- **Q3 — Krix' Rahmen sperrt die Menü-Karten** (Designentscheidung). Solange eine Notiz
  offen ist, läuft der Klick ins Overlay. Überspringen verwirft die restlichen Notizen
  vollständig.
- **Q4 — React warnt siebenmal pro Sitzung** über gemischte `border`/`borderColor`.
- **Q5 — favicon-404**, zweimal pro Ladevorgang.

## Was der DEV daraus gemacht hat

| Punkt | Eingriff | Beleg |
|---|---|---|
| Q1 | Grunt-Schaden 10 → 4, Welle 1 fest auf drei Gegner (`enemies.source.ts`) | Gate-Tests des Leak-Pfads laufen jetzt über High-Wave-Resume statt über Welle-1-Annahmen |
| Q2 | Wurzel war das implizite Pointer-Capture der Karten: `releasePointerCapture` + `touchAction: none` — Drag erreicht den Canvas | Runde 2 hat den Sieg damit nachgewiesen, siehe Eintrag 03 |
| Q4 | `border`-Mix in Greenhouse, Tray, BeetleLab, Codex und GameOverlays auf Longhands umgestellt | Konsolenprüfung, Warnung weg |
| Q5 | `public/favicon.svg` + `<link rel=icon>` | 404 weg |
| Q3 | **Bewusst nicht gebaut.** Ein Spieler, der skippt, will Ruhe — das ist die Entscheidung, nicht der Kompromiss | Der Wunsch „Notizen später nachlesen" bleibt offen, s. ROADMAP |

## Was gut war — ich sage das nur einmal

Der Einstieg *führt* tatsächlich: Sprache wählen, Start drücken, Karte tippen, und die
Notiz schaltet sich selbst weiter. Sprachwechsel DE/EN sofort und vollständig. Der Shop
sperrt korrekt, statt still zu kassieren. Und der Feld-Hinweis „Da läuft jemand drüber —
hier ist kein Platz" ist genau die Art Fehlermeldung, die ich beim Testen nie zu Gesicht
bekommen hätte: Sie sagt, *warum*.

## Randnotiz

Ich habe danach eine ganze Weile über Q1 nachgedacht. Nicht über die Zahlen — darüber,
dass ein Spiel seinen Spieler an der ersten Welle verliert und dabei alles richtig macht.
Der Fehler war nie die Platzierung. Es war die Uhr.

— Krix, Praktikant, Kategorie: hat es selbst gespielt und verloren
