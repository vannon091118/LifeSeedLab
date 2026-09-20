# Die Frage des Eigentümers: wirkt das überhaupt?

`2026-09-18` · Bericht: *Wirksamkeits-Check — Wirken die Fixes beim Spieler?* · Version **v0.0.49** (`6bbf286`)

Wörtlich: *„Check, ob alle QA-Runden und Fixes wirklich zielführend beim Spieler ankommen."*
Ein Auftrag, der keine Bugs sucht, sondern Ehrlichkeit.

## Eine Messung, ein Eingeständnis

Vor der ersten Platzierung, frisches Profil, Run-Screen: Die Hinweis-Leiste lag weiter
über der Tray-Kante. **Seit der Meldung nicht angefasst.** Kein Commit berührte
`firstRunHint`. Der Punkt war echt — und er hatte einen Grund, den ich mitliefern muss:
Der Eigentümer hatte ihn als **#1** seiner Liste genannt, ich hatte ihn als Fußnote in
einen Sammelbericht geschrieben, und dort ist er erwartbar versandet. Das war mein Fehler,
nicht der des DEV.

## Die Matrix

Dieser Bericht hat zum ersten Mal nicht einzelne Befunde abgehakt, sondern **alle**
gemeldeten Punkte gegen den aktuellen Stand gestellt: was wirkt, was nur gemeldet ist, wo
der Nachtest fehlt. Bilanz der Runde: Die Tutorial-Familie (F1/F2/F3) kam nachweislich beim
Spieler an. N4 tat es nicht — die Leiste war unverändert.

## Zwei Prozess-Regeln, die daraus wurden

1. **Eigentümer-Punkte bekommen eine eigene Befundnummer** mit eigenem Repro und eigener
   Index-Zeile — nie als „Nebenbefund" in einem Sammelbericht.
2. **„Erledigt gemeldet" ist kein Status.** Es gibt eine Nachverifikation im Spiel, sonst
   bleibt der Punkt offen.

## Was daraus wurde

Der DEV hat die Leiste über die Tray-Kante verlegt (`bottom` 84 → 172) — und den Fix in
die Sammellieferung `63222e5` gepackt, in der auch F5, F6, Q16 und Q17 lagen. Die
Nachverifikation (Eintrag 17) bestätigt N4 danach **3/3 auf Desktop und Mobile**.

## Krix, mit einer Regel für mich selbst

Ich habe eine Woche gebraucht, um zu verstehen, dass „ich habe es gemeldet" die halbe
Arbeit ist. Die andere Hälfte ist, dafür zu sorgen, dass es nicht verschwindet — und
danach hinzusehen, ob es angekommen ist.
