# Der Tag, an dem Welle 1 aufhörte, ein Grab zu sein

`2026-09-17` · Bericht: *Runde 2 — Weg-Lenkung & Schusslinien-Taktik* · Version **v0.0.38** (`ae64493`)

Das war die Gegenprobe zum Blutdruck-Eintrag: dieselbe Welle, dieselbe Version, aber
diesmal mit Taktik — Weg-Tiles (Gewicht 0,6 statt 1,0) um den Korridor gelegt, zwei
Schützen auf Töpfe flankiert. Ergebnis in drei Messpunkten:

```
t+0s:   Leben 20 · 2 Gegner · Energie 80
t+5s:   Leben 20 · 2 Gegner · Energie 121 · Score 44.9
t+10s:  Leben 20 · 0 Gegner · Energie 175 · Score 77.4   → Welle vorbei
```

**Welle 1 in unter zehn Sekunden, 20/20 Leben.** Damit war die pauschale Fassung aus
Runde 1 widerlegt — nicht „Welle 1 ist zu schwer", sondern „Welle 1 ohne Lenk-Wissen ist
tödlich". Zwei Befunde blieben stehen:

- **Q7 (hoch, 1/3):** Genau dieses Wissen — Wege lenken, Schützen flankieren — vermittelt
  das Onboarding nicht. Es führt zur Karte, nicht zur Taktik.
- **Q8 (mittel, 0/3):** Zweimal dieselbe Klickfolge, zweimal ein anderes Ergebnis (9 vs. 8
  gesetzte Weg-Tiles). Verdacht: Die Prüfung läuft gegen die **sich ändernde** Route, also
  verschiebt die Reihenfolge die Legalität. Alternativ hatte das DevGate die Klicks
  gefressen. Ohne drei saubere Zyklen kein Befund.

## Was daraus wurde — und warum dieser Eintrag anders endet als die anderen

Q7 und Q8 wurden nicht „gefixt". Sie wurden **überholt**. Der Umbau danach hat die
Route aus der echten Tile-Geometrie abgeleitet (Eintrag 11), und mit dem Bau-Modus als
eigener Phase hat der Spieler den Korridor, den er baut, zum ersten Mal wirklich *im
Spiel*. Die Wege-Margin, die Q8 verdächtigte, existiert in dieser Form nicht mehr.

Was von Q7 bleibt, ist keine Zeile Code, sondern eine Frage an das Tutorial: Weiß der
Spieler nach den ersten Krix-Notizen, **warum** er Wege legt? Heute steht die Antwort als
Chip im Feld („LAUFWEG 22 · min 22") und in Krix' Erklärung dazu.

## Krix, mit Abstand

Ich habe damals die Zahlen gefeiert, zwei Sekunden später die Frage gestellt, ob sie
irgendwem etwas nützen, wenn niemand weiß, wie man sie herstellt. Der Befund ist
verschwunden, die Frage nicht. Das ist in Ordnung — aber ich schreibe sie hier hin, damit
sie nicht als „mit dem Refactor erledigt" durchgeht.
