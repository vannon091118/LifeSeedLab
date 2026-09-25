# Devlog 26 — Drei Defekte, die alle drei Tests grün hatten

**Datum:** 25.09.2026
**Bezug:** noch nicht committet (Arbeitsstand `main` bei `83038bb`); `CHANGELOG.md` fuehrt die drei
Schnitte unter „Unreleased".

Diesmal gab es keinen QA-Bericht. Ein Fuenf-Agenten-Review auf dem frisch gezogenen `main` hat drei
Stellen gemeldet, und ich habe jede gegen den Code geprueft, bevor ich sie angefasst habe. Zwei
haetten sich als erfunden herausgestellt; eine wurde von mir selbst erst falsch beschrieben und
danach widerlegt. Was blieb, waren drei Befunde mit derselben Form: **der Test war gruen, und die
Aussage, die er pruefte, war trotzdem falsch.**

## Der Käfer, der keine Neuheit messen konnte

`BEETLE_DESCRIPTOR_WEIGHTS` hatte zwei Eintraege weniger als `BEETLE_DESCRIPTOR_AXES` — 27 gegen
29. `weightedDistance` in `breeding.ts:171` paart die Arrays positionsweise und bricht bei
`Math.min(...)` kommentarlos ab. Ab Index 17 trug jede Achse das Gewicht ihrer Nachbarn, und
`pronotum` und `jumpLegs` fielen ganz heraus. Der Organ-Tausch, um den es ging, mass exakt 0:
`hardshell` und `jumper` konnten kein neues Tier erzeugen. Testfehler zurueckgenommen, gegengeprueft,
kam `expected 0 to be greater than 0` zurueck — die Fehlermeldung selbst war der Beweis.

Die Gewichte fuer `sheen` und `asymmetry` stehen jetzt auf 0. Das war **keine** Balancefrage, und
ich habe sie zuerst als eine gestellt: 0 wie beim Pigment, oder 0.3/0.6? Der Kommentar eine Zeile
darueber beantwortet sie — beide Achsen enden ausschliesslich im Renderer, und `beetlePhenotype.ts:71`
sagt woertlich, Farbe sei Anzeige und koenne das Neuheits-Mass nicht verschieben. Meine Frage war
schlecht gestellt, die Antwort stand im Repository.

Der Preis der Korrektur sind vier verschobene Brut-Pins in `brood_domain.test.ts`. Die habe ich
nicht ueberschrieben, sondern vorher gemessen — 72 Bruten (3 Gruender × 9 Paarungen × 8 Indizes),
vorher und nachher. Zwillinge 0/72 bleiben 0/72, der mittlere Formabstand sinkt leicht
(0,07953 → 0,07836), der **schlechteste** steigt (0,02322 → 0,02765), und die Organprofile werden
von 205 auf 207 unterscheidbar. Keine Rebalance — die aehnlichste Brut ist messbar weniger
klonig. Deshalb der neue Goldwert, mit der Begründung im Kommentar daneben.

## Die Kette, die 50 Schaden statt 50 Prozent tat

B6 verlangt seit jeher „50% damage". `killReactor.ts:41` rechnete 50. Gegen den Boss (800 HP)
war das nicht zu sehen, gegen Schwarm (15 HP) schon — dort ueberstieg die Kette den Treffer, der
sie ausgeloest hatte. Die Ursache war nicht der Betrag, sondern der Datenweg: `ENEMY_DIED` fuehrte
keinen Schaden mit, obwohl an beiden Emit-Stellen in `enemySystem.ts` die `amount`-Variable in
Reichweite lag. Der Kommentar `50 % Schaden` stand direkt ueber dem Code, der etwas anderes tat.

Der Anteil ist jetzt Content in `effects.source.ts`, abgeleitet ueber `chainSpecOf()` neben
`statusTicksOf` und `statusDotOf` — keine Zahl mehr im Reactor. Die Tests der Kette ziehen dabei
aus `gateB.test.ts` in ein eigenes `chainEffect.test.ts`: die Datei war durch die neuen Tests
ueber das Cap (319/300) gekommen, und ein Cap erhoeht man nicht, man teilt.

## Die Hooks, die lokal liefen und im Commit tot waren

Das war der aufwendigste, weil die Ursache zweimal hintereinander eine andere war. `installHooks`
setzte das Ausfuehr-Bit mit `fs.chmodSync`. Bei `core.fileMode=false` — Windows-Standard — liest Git
das Bit nicht und legt `100644` ab: lokal ausfuehrbar, im Commit tot. Eine Sonde zeigte die
zweite Haelfte, die ich nicht erwartet hatte: `update-index --chmod=+x` war zur Install-Zeit
**wirkungslos**, weil die Hooks da noch untracked sind. Erst `--add` schliesst die Luecke.

Dann der zweite Befund: `core.autocrlf=true` macht die Shell-Skripte beim Checkout kaputt (CRLF
in einem `/bin/sh`-Skript ist „command not found"). Meine erste Hypothese war, `.gitattributes`
siehe falsch — ich habe sie im Repo gegengeprueft und sie war **richtig**: `git hash-object`
meldete die Datei bereits als LF-konform, waehrend auf der Platte CRLF lag. `checkout-index`
ueberspringt unveraenderte Dateien. Der Zustand musste physisch neu materialisiert werden
(loeschen und aus dem Index auschecken); danach war er weg. `.gitattributes` ist damit die
dauerhafte Absicherung, nicht der Fix.

Ein Fehler von mir, weil ich ihn benennen will: `git rm --cached` auf vier Dateien, um das
erzwingen zu wollen, war kein erforderlicher Schritt. Die Dateien waren danach aus dem Index
verschwunden. Sofort per `git reset` aus `HEAD` wiederhergestellt, `100755` an allen drei Hooks
verifiziert, Diff leer. Kein Schaden entstanden — aber die Aktion gehoerte nicht dorthin.

## Das Review danach: vier Agenten, eine echte Stelle

Am Ende kam noch ein Review ueber diese drei Schnitte — vier Agenten, getrennt, mit denselben
Grenzen (nur lesen) und ohne Vorinformation ueber das, was ich glaubte. Das ist der Punkt von
 unabhaengigem Lesen: alle vier sind unabhängig auf **eine** Zeile gestoßen.

`installHooks` in `hooks.ts:64` rief `git.markExecutable(relative)` auf und warf den Rückgabewert
weg. `markExecutable()` liefert genau dafür ein `boolean` — `update-index` sagt, ob es geklappt
hat. Ein gescheitertes `update-index` (EPERM, read-only Index, `.git/index.lock`) liess die Zeile
trotzdem in `written` landen, `describeHookInstall` meldete „Hooks installiert", und der Aufrufer
glaubte, der Gate-Zwang reise im Commit mit. Er reiste als `100644`. Das ist die teuerste
Fehlerklasse, die dieses Werkzeug haben kann: kein Fehlschlag, sondern ein stillschweigend
abgeschalteter Zwang.

Beide Testhaelften fehlten bisher. Der `100755`-Test beweist den Erfolgsfall auf einer Platte, die
gerne kooperiert — er setzte `core.fileMode` nicht, und unter Windows heisst das: der Weg, den
der Defekt ueberhaupt ausloest, war im Test unsichtbar. Und der Fehlerfall ueberhaupt nicht. Der
Test pinnt jetzt beides: `core.fileMode=false` fuer den Erfolgsfall, ein `markExecutable`, das
`false` liefert, fuer den Fehlerfall. Der Fix liest den Index danach ein zweites Mal, statt dem
Aufruf zu glauben, und wirft mit einer Meldung, die `.git/index.lock` und Schreibrechte nennt
statt nur „fehlgeschlagen". B33.3 in `docs/quality/contracts/process.md` haelt die Regel fest.

## Zwei Befunde, die ich widerlegt habe

Der dritte gemeldete Punkt war, Ketten-Kills verlören ihren Score (`root.ts:250-254`). Ich habe
die Datenstrecke gelesen — `publish()` schiebt nach `pendingKills`, `stepOnce` leert den Puffer,
`reactToKills` wertet aus, `chainAftermath` zündet — und kam zu dem Schluss: doch, sie werden
gewertet. Also gemessen. Und meine erste Messung war Müll: ich habe Gegner in den Rückgabewert von
`getSnapshot()` gepusht, und das ist ein `structuredClone` — meine Gegner existierten im Live-Zustand
nie, `enemies=0` war eine Tautologie und kein Befund. Genau die Sorte Beleg, die aussieht wie ein
Ergebnis und keines ist. Mit dem Muster aus `enemy_death.test.ts` (echter `spawn` auf dem echten
Zustand) dann: zwei Gegner, beide tot, `nektarEarned` steigt von 0 auf **2** — zwei
`onEnemyDied`-Aufrufe. Der Ketten-Kill wird verbucht. Der Befund ist widerlegt, und zwar nicht
durch Nachdenken, sondern durch die Messung, die mich zuerst belogen hat.

Zweiter Punkt: der `100755`-Test würde den Index-Nebenwirkungseffekt übersehen, weil
`update-index --add` die drei Hooks in einen Index schreibt, in dem vielleicht schon andere Arbeit
lag. Gestimmt, und gleich geprüft: `update-index --add --chmod=+x -- <pfad>` fasst ausschließlich
den benannten Pfad an (`FREMDE.txt` blieb draussen). Kein Defekt, kein Eingriff.

Die dritte und vierte Meldung waren Testhärte: `beetlePhenotype.test.ts` prüft Länge, nicht
Gewicht-Zuordnung, und `chainEffect.test.ts` benutzt ein synthetisches `ENEMY_DIED`, nicht den
echten Emit-Pfad in `enemySystem.ts:238`. Das ist berechtigt. Der zweite Punkt ist mit diesem
Devlog Eintrag allerdings geschlossen: die Live-Messung oben fährt durch `applyDamage` und
`stepOnce`, also durch genau den Emit-Pfad, der dem synthetischen Ereignis fehlte.

## Was offen blieb

Nichts von diesen drei Befunden. Offen bleibt, was nicht mein Task war: die Frage zu `brood`,
der im urspruenglichen Gewichtsblock als Kommentar steht — ob die Brut-Praesentation zwei Gewichte
verlangt. Ein Wert fuer `brood` passt auf die Fuenf-Organ-Zeile ohne Rest, deshalb wurde es so
umgesetzt; das ist eine **Ableitung, keine Gewissheit**, und ich schreibe es als solche hin.

Und die Zahl, die jetzt stimmt: 732 Projekt-Tests ueber 78 Dateien, 126 Tooling-Tests
(vorher 123 — zwei aus den Hooks, einer aus diesem Review), 42 E2E. Das Gate stand am Ende offen mit
0 Fehlern und 0 Warnungen.

Und noch etwas, das nicht passt und trotzdem so bleibt: Die Zusammenfassung, die ich zuerst
geschrieben habe, war falsch. Ich hatte behauptet, `.gitattributes` koenne die roten
`100755`-Tests gruen machen. Das konnte es nicht — ein Exec-Bit ist Index-Metadatum, kein
Zeilenenden-Attribut. Erst die Sonde mit `git update-index --chmod=+x` hat den Unterschied
gemacht. Eine falsche Diagnose ist schlimmer als gar keine, weil sie in die richtige Richtung
zeigt.