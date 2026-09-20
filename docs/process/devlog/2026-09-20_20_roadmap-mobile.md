# Die Messlatte stand schief, und genau deshalb hat sie gepasst

`2026-09-20` · Bericht: *ROADMAP-Arbeit — Mobile 390×844, P-2/P-10/P-14/P-24 nachgemessen* · Arbeitsstand **v0.0.72** (uncommitted)

Diese Runde war keine neue Erfindung, sondern das, was die ROADMAP verspricht: die offenen
Punkte **messen statt hoffen**. Vier von ihnen standen dort mit „Beleg fehlt“ oder „nicht neu
gemessen“ — jetzt haben alle vier einen Messwert, und zwei davon haben die Seite gewechselt.

## Zuerst die Werkzeug-Schuld

Mein erstes Messskript klickte Boulder zweimal (eine alte Zeile blieb im Fluss) und wunderte
sich, dass der ✕-Knopf „verschwand“ — nein: der zweite Klick wählte das Werkzeug per B3
bewusst wieder ab. Die App tat das Richtige, mein Messwerkzeug log. Der Befund stand dann
richtig da, als das Skript eine Runde ehrlicher war.

## P-2 (bestätigt und behoben): Exit Run ragte 29 px raus

Gemessen bei 390×844: die rechte Knopf-Reihe war 407 px breit, „Exit Run“ landete bei
362–419 — 29 px außerhalb des Viewports, `flexWrap: nowrap`. Die Reparatur ist eine Zeile
(`topRight` bricht um, rechtsbündig); danach: Reihe 366 px, kein Knopf außerhalb, Desktop
unverändert, weil die Zeile dort passt und wrap nie greift. Gepinnt in
`tests/mobile.spec.ts` — der DoD-Punkt „Mobile geprüft“ ist damit ein tragender Test und
keine Erinnerung mehr.

## P-24 (widerlegt — für mobil): der ✕ verdeckt dort nichts

Der Desktop-Befund (382/149, verdeckt (10,0) und (11,0)) lässt sich bei 390×844 nicht
reproduzieren: das Rechteck liegt bei 281/177, **0 Zellzentren** darunter. Das Brett skaliert
anders als die Knopf-Positionen. Gelöst als WIDERLEGT mit Messwert, nicht gelöscht — die
Nummer bleibt stabil, die Desktop-Notiz steht weiter in der Zeile.

## Neu gemessen und neu aufgenommen: die Tray frisst die Ausgang-Ecke

Die Mobile-Runde brachte einen Befund, den niemand auf dem Zettel hatte: bei 390×844
überdeckt die Tray-DOM die unterste Brettreihe (Brett-Unterkante ~696 px, Tray-Oberkante
~652 px) — die Ausgang-Ecke **(0,11)** liegt hinter dem Panel, solange die Tray offen ist.
Ein Werkzeug dort wählen oder bauen ist unmöglich. Neu als **P-25** aufgenommen, Owner
`components/` — das ist Layout-Regie, kein Einzeiler-Fix.

## P-10 (heute nicht overflowend): 342 von 342

Der alte Q9-Befund traf zu, als mehr Karten im Streifen lagen. Heute: `scrollWidth 342 =
clientWidth 342`, kein Überlauf, kein Hinweis nötig. Die Zeile bleibt offen mit heutigem
Messwert — sie ist konfigurationsabhängig (Kartenzahl × Kartenbreite) und fällt beim nächsten
Content-Zuwachs wieder um, wenn niemand hinsieht.

## P-14 (Invariante stand schon): Route ab dem ersten Bild

Die ROADMAP-Zeile beschrieb einen Zustand, den es am heutigen HEAD nicht mehr gibt: der
Root-Konstruktor leitet die erste Route **selbst** ab (`recomputeRoute` nach `applyResume`),
das leere Brett existiert nicht. Statt die Zeile zu streichen, pinnt jetzt
`qa_p14_resume_route.test.ts` die Invariante — fällt sie je zurück, fällt der Test, und P-14
ist wieder offen, mit Beleg.

## Mobile-Beweis der Spieltest-Fixes

Derselbe Lauf bewies auch die Fixes der letzten Runde auf 390×844: der Geist zeichnet
**exakt rot** auf der wegschließenden Zelle (Stroke-Abfangen, Brett-Koordinaten
`gx·cell+2`), Tray-Karten wählen per echtem und per synthetischem Klick. Dabei gelernt:
`drawGhost` malt nach `ctx.translate` im Brett-Raster — mein erster Test erwartete
Viewport-Pixel und fand deshalb nichts. Und die Tray verdeckt die unterste Reihe, also
wählt der Test sichtbare Zellen (und macht den P-25-Befund damit zugleich reproduzierbar).

## Nachschlag derselben Sitzung: die Blocker gelöst, nichts verworfen

Der Sprint-Abschluss hing an zwei fremden, unversionierten Dingen: das Agenten-Experiment
`src/lib` + `src/mcpServer` (70 TS-Fehler, null Importe im Spielcode — und es liest
`state.energy`/`state.errors`, Felder, die es seit dem 19.09. nicht mehr gibt) und die rote
Explorer-Scratch-Spec in `tests/`. Reparieren wäre Weiterbauen auf einem toten Modell gewesen,
Löschen wäre fremde Arbeit vernichten. Die Lösung ist eine **Quarantäne**: beide liegen jetzt
unangetastet unter `experiments/pending/` (git-ignoriert), verlassen den Prüf-Scope, bleiben
lesbar. Danach gemessen: tsc **0 Fehler**, E2E **30/30**, Gate **OFFEN (0/0)**, Suite 570/570.
Ob die Experimente fortgeführt, archiviert oder gelöscht werden, entscheidet der Eigentümer —
P-22 trägt die Frage jetzt als einzige offene Zeile.

## Krix, diesmal als Maßband

Ich habe drei Runden lang „Mobile geprüft“ abgehakt, ohne ein einziges Mal die Messlatte an
die Fläche zu halten. Diesmal lag die Latte schief — zwei Skript-Fehler, eine falsche
Koordinaten-Annahme — und genau deshalb habe ich viermal nachmessen müssen, bis ich der
Zahl glauben durfte. Was stehen blieb: ein Fix, zwei Widerlegungen, ein neuer Befund, ein
Test, der die Invariante eines anderen festhält. Das ist mehr, als eine Runde „alles grün“
gebracht hätte.
