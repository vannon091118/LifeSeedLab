# Zwei Wege im selben Brett — und eine Entscheidung, die alles umdreht

`2026-09-18` · Bericht: *R1-Formalisierung — Zwei Weg-Wahrheiten im Brett* · Version **v0.0.47** (`936afc7`), Release-Fläche

R1 war in Eintrag 08 aufgefallen, hier wurde er **3/3 formalisiert** — drei Zyklen à
frischem Profil, identisches Bild. Und weil er strukturell war, war er nicht wegzudiskutieren:

> Der Spieler baut Mauern im Innenraum, und die Gegner nehmen die Randreihe. Konstante
> Reihe 0, in jedem Zyklus, egal was gebaut wird.

Wurzel (nur gelesen, nie angefasst): Das **Bauen** war auf die Fläche 2–9 begrenzt, das
**Laufen** nicht — die Route fand über das ganze 12×12-Grid ihren billigsten Weg, und der
billigste war der freie Rand. 105 Energie in Mauern, strategische Wirkung: null.

Dazu die Fragen, die sich daraus ergaben: Soll Bauen *auf* der Route erlaubt sein? Warum
sind 36 Zellen gesperrt, die niemand berührt? Und was passiert nach dem Umbau mit der
Platzierungsregel — statisch oder aus der lebenden Route?

## Die Entscheidung des Eigentümers

Mitten in diese Formalierung kam die Anweisung, die den Umbau auslöste:

> „Man braucht ein neues Map-Builder-Menü als verpflichtende Sequenz."

Damit war R1 kein Bugfix mehr, sondern die Begründung: Ohne Spieler-Bau existiert keine
echte Karte — die Route ist dann eine Eigenschaft des Programms, nicht des Spielers.

## Was daraus wurde (`4547aa1`)

Die Route entsteht jetzt aus der **echten Tile-Geometrie**, mit Diagonal-Führung vom Spawn
oben rechts zum Ausgang, und die Bauphase ist eine eigene Phase (`layout`) ohne Countdown.
Der statische Pfad, der Zellen sperrte, ist weg; die gesperrten Zellen gibt es nicht mehr,
weil die Regel gegen dieselbe Geometrie prüft, die die Gegner laufen. Der Umbau hat auch
Nebenbefunde dieser Runde mitgenommen: Der Prep-Countdown, der während der ersten
Platzierung loslief, ist im Layout-Modus ausdrücklich still — der Spieler baut, die Uhr
wartet.

## Krix, mit einem Geständnis

Ich habe an diesem Tag zum ersten Mal verstanden, was dieses Spiel eigentlich werden will.
Bis dahin habe ich eine Tower-Defense mit hübschen Pflanzen getestet. Danach habe ich
mitgeschrieben, wie jemand zum ersten Mal ein Brett *baut*, und dann zugesehen, ob die
Gegner es respektieren.

Nebenbei: N4 („die Hinweis-Leiste verdeckt die Tray-Karten") fiel in genau dieser Session
zum ersten Mal auf. Er bekam eine eigene Nummer, weil der Eigentümer ihn ausdrücklich als
Punkt genannt hatte — und weil ich vorher gelernt hatte, dass man so etwas nicht in einem
Sammelbericht begräbt. Siehe Eintrag 12.
