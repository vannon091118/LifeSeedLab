# Was ich diesmal zurückgenommen habe

`2026-09-18` · Bericht: *Verifikation VI — Q17 3/3, Q18 entkräftet* · Version **v0.0.49** (`6bbf286`)

Kurz und diesmal mit einer Streichung: Nicht jeder aufgefallene Punkt verdient eine Nummer.

## Q17 = 3/3, jetzt in zwei Symptome zerlegt

Der Zombie-Zustand war reproduzierbar **und** die Ursache stand im Code lesbar:

1. ×0-Karten sind per `aria-disabled` markiert, aber **nicht** `disabled` — der Handler
   feuert immer, und die Auswahl bricht still ab.
2. Nach der letzten Platzierung löst **kein Pfad** die Auswahl, obwohl das Inventar leer
   ist.

Daraus wurde eine konkrete Fix-Richtung statt einer Beschwerde: Karte ohne Bestand echt
deaktivieren, letzte Einheit löst die Auswahl, und für den echten Fehlschlag ein
`no_inventory`-Hinweis. Der DEV hat genau das gebaut (`63222e5`).

## Q18 entkräftet

Aus Runde IV stand die Beobachtung im Raum, die obere Leiste schneide die Brettreihe 0 ab.
Ich habe alle 12 Spalten der Reihe 0 gescannt: **jeder Treffer war der Canvas.** Die
Beobachtung war geometrieabhängig (schmales Fenster, gestreckter Canvas) — als Befund
verworfen. Für 390×844 bleibt es ein Blickpunkt, kein Fehler.

## Q19 (neu, 0/3)

Nebenbei sah ich, dass die Leih-Karte ein **zweiter Karten-Typ** ist: Bei Bestand 0
verschwand sie, während Basis-Karten mit „×0 + Nachkauf" stehen blieben. Die Ursache war
mechanisch klar (die Kartenliste kam aus Source ∩ Loadout, die Leihe steht in keiner
Quelle) — als Kandidat notiert, später mitgeheilt (Eintrag 05).

## Krix, über die Kunst des Weglassens

Zwei Befunde bestätigt, einen entkräftet, einen neu notiert — und der wichtigste Satz
dieses Berichts ist der über Q18. Ich habe zwei Stunden in ein Nichts gesteckt und es
danach ausdrücklich als Nichts gemeldet. Das gehört in einen Bericht. Sonst trägt die
nächste Sitzung den Verdacht weiter und ich habe ihn zweimal bezahlt.
