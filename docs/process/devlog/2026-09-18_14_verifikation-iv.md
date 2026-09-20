# Der Hold, der alles schluckt

`2026-09-18` · Bericht: *Verifikation IV — Runde 3: Tutorial-Hold, N4-Messung, F6-Zyklus 3* · Version **v0.0.49** (`6bbf286`)

Diesmal habe ich das Onboarding als echter Spieler durchgespielt — nicht geklickt, sondern
*gemacht*, was Krix verlangt. Dabei fiel der unangenehmste Fund der Woche auf.

## Q16 (neu, 2/3): Während des Holds passiert nichts

Feldnotiz 5 verlangt eine Pflanze und hält dafür die Simulation an (`hold: true`). Der
Geist folgt der Maus, das Fadenkreuz ist aktiv — und der Tap aufs Brett kommt als
**„Da läuft jemand drüber — hier ist kein Platz"** zurück, obwohl die Zelle frei ist. Die
Quelle war im Code lesbar: Der Hold stoppt die Sim, die Platzierung läuft aber durch die
Sim. Also zeigt die Vorschau etwas anderes an als die Sim tut.

## N4, dritte Messung: endlich genau

Die Hinweis-Leiste liegt **31 px** auf der oberen Kartenhälfte. Neu war die Erkenntnis,
dass bei breitem Fenster zusätzlich **die Reihen sich gegenseitig überlappen** — die
PFLANZEN- und die FELD-Reihe schieben sich übereinander. Ein Klick auf die verdeckte
Kartenmitte wählt damit die verdeckende Karte. Zwei unabhängige Verdeckungsursachen, ein
Symptom — und der Grund, warum dieser Punkt als eigener Befund geführt wird.

## F6 wird formal (3/3)

Drei Zyklen, echte Maus: Ja, ein Klick in eine verdeckte Zone wählt die Nachbar-Karte.
Damit war F5 offiziell nicht mehr „Blase zu groß", sondern „Blase zu groß **und** Reihen zu
eng".

## Kleinkram, ehrlich notiert

Nach einer Platzierung blieb `pressed = true` an einer Karte mit Bestand ×0 stehen — ein
blinkender „ausgewählt"-Zustand ohne Auswahl. Als Kandidat notiert, wurde Eintrag 16.
Beobachtung B (leere Route nach dem Fortsetzen) blieb bei 0/3: nicht reproduziert, damit
kein Befund — und damit auch keine Arbeit, die sich jemand erfindet.

## Krix, mit einer Beobachtung zum Onboarding

Zwei Notizen lang war ich Spieler, dann wieder Tester. Der Übergang war der Tap aufs Brett,
bei dem nichts passierte. Genau an dieser Stelle hätte das Tutorial einen Spieler
verloren — und genau dort hat es danach einen Fix bekommen.
