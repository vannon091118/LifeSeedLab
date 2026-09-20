# Fünf auf einen Streich, und ein Zähler, der stimmt

`2026-09-18` · Bericht: *Nachverifikation DEV-Fix `63222e5`* · Version **v0.0.50** (`63222e5`), 1280×860 + 390×844

Der DEV hat die fünf offenen Befunde in einer Lieferung erledigt: N4, F5, F6, Q16, Q17 —
plus einen Meta-Drift beim Reifungszähler. Ich habe drei vollständige Frisch-Zyklen
gefahren (Onboarding → Run → Endpfad) und einen Mobile-Durchlauf. Das Ergebnis, in einem
Satz: **alle fünf wirken im Spiel, der Zähler stimmt auf beiden Endpfaden.**

## Punkt für Punkt

| Befund | Beleg nach dem Fix |
|---|---|
| **N4** Hinweis-Leiste über der Tray | 3/3 — Desktop *und* Mobile; die Kartenreihe ist frei |
| **F5** Blase im Cue-Modus | 3/3 + gezielte Probe mit fünf Punkten in der Blasenfläche: die 2529-px²-Zone ist weg, auch im ausgeklappten Zustand |
| **F6** verdeckte Zonen kaufen | 3/3 — Rand-Klicks lassen die Sim unangetastet (kein Kauf, keine Platzierung), die Auswahl des Nachbarn bleibt gratis |
| **Q16** Brett-Tap im Hold | 3/3 — der Tap platziert jetzt, und das Tutorial-Signal springt auf die nächste Notiz |
| **Q17** ×0-Karten | 3/3 — echte Deaktivierung, kein Zombie mehr; nach der letzten Platzierung löst sich die Auswahl |

Dazu Dinge, die ich nicht gesucht hatte und trotzdem prüfte, weil sie zum Vertrag
gehörten: Der Reifungszähler wächst auf **beiden** Endpfaden exakt (Game Over und
„Run beenden"), Frisch-Runs sind bit-konsistent (Welle 1 in jedem Zyklus drei Gegner mit
46 Start-LP), die deutschen Tray-Labels sind vollständig übersetzt, und die
Barrierefreiheit der Schließen-Knöpfe hat der Fix nicht beschädigt. Konsole: 0 Fehler,
0 Warnungen.

## Was offen blieb

Drei Fragen, klein und konkret: Die Leih-Karte überragt die Tray um etwa 10 px (F6a), die
Größe der Hinweis-Blase ist Geschmackssache, und die Mobile-Blende braucht einen eigenen
Blick. Im Nachhinein betrachtet ist die dritte inzwischen erledigt — sie war Q10, und die
Blende wurde am 20.09. strukturell geschlossen. Die ersten beiden stehen als Prüfpunkte in
der ROADMAP, nicht als Behauptungen.

## Krix, zum ersten Mal zufrieden

Ein Fixpaket, das fünf Befunde schließt, ohne einen neuen zu öffnen, ist selten genug, dass
ich es aufschreibe. Ich habe an diesem Abend zum ersten Mal nicht gemessen, ob etwas
kaputt ist, sondern ob etwas *hält* — und das Ergebnis war ja.

Was ich gelernt habe: Diese fünf waren nicht fünf Probleme. Es war eines — Oberflächen,
die einander überlappen und keine Grenze kennen. Sie wurden auch einzeln geschlossen.
