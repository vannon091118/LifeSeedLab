# Ich habe 105 Energie in Mauern investiert, die nichts taten

`2026-09-18` · Bericht: *Taktik-Session — Maze-Tower-Defense-Linse* · Version **v0.0.50** (`63222e5`)

Bis hierher habe ich geprüft, ob das Spiel *funktioniert*. Diesmal sollte ich prüfen, ob
es *spielbar* ist — mit der Brille eines Mazing-Spielers: Serpentinen bauen, einen
Chokepoint formen, Gegner möglichst lange unter Beschuss halten. Ich habe dazu fremde
Mazing-Lehren gelesen, damit ich nicht meine eigenen Vorlieben messe.

## T1 — Mauern im Innenraum lenken nicht (3/3)

Die Route lief konstant die Randreihe, egal was ich im Innenraum baute. Drei Messpunkte in
einer Session, identisches Ergebnis. Die Wurzel stand im Code: Das **Bauen** war auf die
Fläche 2–9 begrenzt, das **Laufen** nicht. Und der Spieler merkt davon nichts — er sieht
seine Mauern, er sieht den Weg daneben und schließt daraus, dass er etwas falsch macht.

Das war die zentrale Design-Frage des Tages: Entweder ist der Rand keine Fläche, oder die
Mauer ist ein Vorschlag. Der Umbau hat sie beantwortet — die Route entsteht aus der echten
Tile-Geometrie und führt diagonal vom Spawn zum Ausgang, also mitten durch das, was der
Spieler baut.

## T2 — Zwei Wahrheiten über den Preis der Leihe (1/3)

Die UI verlangte 10 Energie, die Sim hätte gratis genommen. Ein Kandidat, keine Formalie:
Zwei Preise für dasselbe Objekt sind genau die Sorte Drift, die später jemanden Stunden
kostet. **Überholt** ist dieser Punkt durch eine Entscheidung weiter oben: Das
Energie-Konto existiert nicht mehr. Der Spieler kauft seinen Bau-Bestand außerhalb des
Runs mit Nektar und platziert im Lauf aus seinem Pool — es gibt keinen zweiten Zahltisch.

## T3 — Der Tile-Schalter schaltet sich selbst ab (1/3, offen)

Beim Serien-Bau (elf Töpfe hintereinander) war der Modus jedes zweite Mal weg: Die
Tile-Knöpfe sind Umschalter, der zweite Klick wählt ab — und das ist an der Karte nicht
ablesbar, wenn man schnell baut. Kein Kaufschaden, aber ein Bruch mitten in der Tätigkeit,
die das Spiel ausmacht. Als Kandidat notiert, **steht bis heute in der ROADMAP**, weil
niemand es seither sauber auf drei Zyklen gemessen hat.

## Nebenbei

Determinismus bestätigt (frische Runs bit-konsistent, Welle 1 = 3 Gegner, Welle 2 = 4),
Meta-Zähler korrekt nach Game Over, und ein OCR-Werkzeug als zweite Datenquelle neben der
Sim-Brücke verifiziert. Am Ende der Sitzung wusste ich außerdem, was dem Spiel taktisch
fehlt: Platzierung ist schnell und stabil, aber ein *Grund*, mehr als einen Weg zu bauen.

## Krix, als Schlusswort dieser Chronik

Ich habe in diesen zwei Tagen zwei Spiele gesehen: eines, in dem neun Befunde pro Sitzung
auftauchten, und eines, in dem fünf Befunde auf einmal geschlossen wurden, ohne dass neue
entstanden. Dazwischen lag keine Wunder-Lieferung, sondern eine Eigentümer-Anweisung, die
den Kern des Spiels ernst genommen hat: Der Spieler baut die Karte, die Gegner respektieren
sie.

Alles, was danach noch offen war, liegt nicht mehr in diesen Berichten, sondern in der
ROADMAP. Dort gehört es hin. Hier gehört die Geschichte hin.
