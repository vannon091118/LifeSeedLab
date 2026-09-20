# Der Geist hat gelogen, und ich habe es mitgemessen

`2026-09-20` · Bericht: *Spieltest-Bericht — Tester-Perspektive* · Version **v0.0.71** (`ba1ff94`), drei Endlos-Läufe, alle Menüs

Der Bericht kam per Chat, nicht über den Kanal — dort lag nichts: der Übermittlungszweig
stand seit `afc657b` („18 Berichte in den Devlog ueberfuehrt, Kanal geleert") leer. Ist auch
egal, gelesen habe ich ihn trotzdem, und zwar zweimal: einmal als Spieler (fünf Reibungen,
zwei Läufe hätten mir gereicht) und einmal mit dem Code daneben. Beim zweiten Lesen war der
Bericht unangenehm präzise. Seine Zahlen stimmten — die Wellen-Klippe ab 4, der grüne Geist,
die toten Karten. Nur bei einer Zahl wusste das Spiel selbst nicht, was sie bedeutet.

## Was der Bericht richtig sah, ohne den Code zu kennen

Zwei seiner fünf Punkte waren keine Meinung, sondern Messwerte, die sich am Quelltext
nachrechnen ließen. Ich habe sie in dieser Reihenfolge abgearbeitet — der kleinere zuerst,
aus Respekt vor dem Größeren.

**Erstens: die Karten nahmen keinen Tastendruck an.** Die Tray hing an `onPointerDown` (eine
Pipeline für Maus und Finger, so war es gebaut und so bleibt es). Ein `<button>` wird von
Tastatur, Vorlesewerkzeug und jedem Agenten aber über `click` aktiviert — und dort feuerte
nie ein `pointerdown`. Die Karte war stumm. Jetzt liegt der Aktivierungsvertrag an EINER
Stelle (`cardPress`): Pointer wie bisher, plus Klick nur dann, wenn kein Zeigegerät dahinter
steht (`detail === 0`). Echte Mausklicks liefern `detail ≥ 1`, sonst würde die Auswahl sofort
wieder umschalten — gemessen, nicht angenommen.

**Zweitens: der Geist hat grün gesagt, wo der Bau gleich abgelehnt wurde.** Das ist der Satz,
dessenwegen ich diesen Eintrag so nenne. Die Geometrie-Regel prüfte die Vorschau brav vorab,
die Weg-Integrität nicht — und `GhostCell.reason` wurde nirgends gezeichnet. Ergebnis: grüner
Umriss, Tap, rote Welle, Grund-Text vier Sekunden lang oben rechts, und der Spieler denkt,
das Spiel sei launisch. Es war nicht launisch, es hat nur eine Frage nicht gestellt. Jetzt
fragt es sie — dieselbe Regel wie beim Bau, read-only (`MapSystem.wouldClosePath` →
`computeRoute`), ohne zweites Regelwerk.

Zwei Vorprüfungen sparen dabei das teure Pathfinding, und beide sind aus dem Regelwerk
abgeleitet, nicht geraten: ein begehbares Tile schließt nie einen Weg, und eine Zelle
**außerhalb** des aktuellen Laufwegs kann ihn nicht schließen — der bestehende Weg bleibt
unberührt gültig. Nur für blockierende Züge AUF dem Laufweg läuft die Probe. Fehlt die Route,
wird NICHT abgekürzt, dann entscheidet die echte Probe (fail-closed).

## Belege, keine Behauptungen

| Schritt | Beleg |
|---|---|
| Probe = Bau-Regel | `placement_map.test.ts`: Probe `true` ⇔ `TILE_REJECTED route_blocked`; Spaltenmauer aus 12 Töpfen, der 12. Zug wird abgelehnt |
| Probe ist read-only | derselbe Test: Zustand, Route und Event-Log nach der Frage unverändert |
| Geist + Grund | `placementController.test.ts`, 5 neue Fälle: rot mit `route_blocked`, lokale Ablehnung, Pool gewinnt gegen Weg-Probe, Idempotenz, Pflanzen fragen nicht |
| Karten-Vertrag | `placementTray.test.ts`, 4 Fälle: Pointer wählt und gibt den Pointer frei, `detail ≥ 1` zählt nicht doppelt, `detail === 0` wählt |
| Fläche | Browserlauf gegen den Dev-Server, 6/6: synthetischer `MouseEvent('click')`, `element.click()`, Tastatur-Enter, echter Mausklick — jeweils genau EINE Zustandsänderung |

Und der Gegenbeweis, weil ein grüner Test nichts über seine Schärfe sagt: mit entfernter
Klick-Bindung wird GENAU die Tastatur- und Synthetik-Strecke rot, der Pointer-Pfad bleibt
grün. Suite 567/567, getrackte E2E 27/27.

## Mein eigener Fehler, ausgeschrieben

Der erste Browserlauf war voller roter Zeilen — und ich habe eine halbe Minute geglaubt, der
Fix greife nicht. Er griff. Ich hatte `aria-pressed` **synchron** direkt nach `dispatchEvent`
gelesen; React committet asynchron, also war jeder Messwert genau einen Schritt alt. Erst als
ich die Reihenfolge der „Fehler" mit der Reihenfolge meiner Klicks verglich, war das Muster
klar: alle sechs Aktivierungen hatten gefeuert, nur meine Uhr stand falsch. Danach war es
6/6. Das ist dieselbe Falle wie im Runbook („synthetische Pointer-Events sind Messartefakt")
— nur eine Etage höher: diesmal war nicht das Ereignis das Artefakt, sondern mein Lesen.

## Die Zahl, die niemandem gehört

Der Bericht schreibt „ohne Samen (50 Nektar) ist der Start zäh". Im Code stehen für „was
kostet eine Pflanze" **zwei** Zahlen: `PLANTS_SOURCE.sprout.cost = 50` — die aber kein Preis
ist, sondern ein Raritätsschalter (sie steuert Wachstumszeit und Haltbarkeit) — und
`SEED_PRICE = 40`, der einzige echte Kaufpreis, genau einmal bezahlbar aus dem Startkapital.
Der Tester hat die 50 als Preis gelesen, und ich kann ihm nicht widersprechen: eine Zahl, die
`cost` heißt und nirgends kassiert wird, ist keine Information, sondern eine Falle. Steht als
P-19 in der Roadmap, mit beiden Fundstellen — vor jeder Balance-Entscheidung zu klären, sonst
redet man über den Preis und meint die Rarität.

## Was offen bleibt (und warum ich es nicht zugedreht habe)

Die **Balance-Klippe ab Welle 4** ist nachgerechnet (Welle 4 bringt 10–13 Grunts und 5 Fast;
ein Spross = 15 Schaden bei 30 Ticks Cooldown, ein Grunt braucht drei Treffer) — aber sie ist
eine Balance-Frage, kein Defekt. Ein Eingriff dort bewegt jeden Lauf; der gehört entschieden,
nicht erschlichen. P-18.

Das **einblendende Rendering** („dimmt ein, wenn der Tab lange ohne Mauskontakt ist —
Reload behebt es") habe ich NICHT reproduziert. Der einzige Dimmer im Code ist das
Suspend-Overlay bei `visibilitychange → hidden`, aber „Tab versteckt" ist nicht dasselbe wie
„lange keine Maus", und auf dieser Maschine läuft kein QA-Browser. Also bleibt es bei 0/3 mit
definiertem Repro-Zyklus statt bei einer Behauptung. P-20.

Die **Textmenge** des Onboardings ist gemessen statt geschätzt: 11 Schritte, 39 Absätze,
6850 Zeichen (Ø 623 je Schritt). Kürzen heißt, an Krix' Stimme zu schneiden — das ist eine
Entscheidung des Eigentümers, nicht des Agenten. P-21.

Und ein Fund, den niemand gemeldet hat: im E2E-Verzeichnis `tests/` liegt eine nur lokale
Explorer-Spec, die Playwright mitliest — beide ihrer Tests sind rot (doppeldeutiger Selektor,
ungültiges `:has-text()` in `page.evaluate`). Die 27 getrackten E2E-Tests sind grün, aber
„rote E2E = kein Abschluss" ist damit strukturell blockiert. Ich habe die Datei NICHT
angefasst; sie kann einem laufenden Thread gehören. P-22.

## Der zweite Blick hat die Änderung selbst erwischt

Nach dem Einbau habe ich meine eigene Arbeit noch einmal von vorne gelesen — und dabei etwas
gefunden, das kein Test zeigen konnte. Die neue Probe ist ein vollständiges Pathfinding, und
sie hängt am Hover: **gemessen** 0,80 ms bei 12×12, 3,28 ms bei 24×24, 26,77 ms bei 64×64,
pro `pointermove`. Bei 12×12 ist das verschmerzbar. Bei 64×64 heißt es: der Zeiger ruht auf
einer Wegzelle, der Browser feuert ~60 Ereignisse pro Sekunde, jedes kostet 27 ms — die
Oberfläche friert ein, ohne dass irgendetwas abstürzt. Ein grüner Test hätte das nie gemeldet.

Die Reparatur ist eine Kostenklemme, keine neue Regel: die Probe antwortet auf `mapRev`, eine
Revision, die `placeTile`/`removeTile`/`expandMap` heben. Das ist vollständig — `mapTiles` und
die Weltfläche werden ausschließlich in `mapSystem` geschrieben (nachgeprüft, nicht erinnert),
und `pipeline.freshState` läuft vor dem ersten Aufruf. Ergebnis: Wiederholungen kosten
0,0016 ms statt 26,77 ms. Zwei neue Naht-Locks halten die gefährliche Stelle: die Probe muss
nach einem Bau UND nach einem Verkauf neu antworten — vergisst jemand ein `mapRev++`, wird
genau das rot.

Der erste Anlauf dieser Lock war dabei selbst kaputt, und auch das ist einen Satz wert: ich
hatte für den Verkaufsfall die Zelle (5,11) befragt, deren Antwort sich nach dem Verkauf
änderte — nur lag sie danach nicht mehr auf dem Laufweg, also antwortete die Vorprüfung, und
der Test hatte den Cache nie berührt. Ich habe ihn nicht gelöscht, sondern eine
Vorbedingungs-Zeile eingebaut (`die Zelle ist AUCH nach dem Verkauf Wegefeld`) und den Fall so
gebaut, dass sie hält: die erste Querung wird als billigeres WEG-Tile angelegt, damit die Route
nach dem Öffnen der zweiten Querung bei der befragten Zelle bleibt. Ein Test, der still ins
Leere greift, ist schlimmer als kein Test.

Und ein drittes Mal dieselbe Lektion wie oben, diesmal am Messinstrument: ich habe den Toast
synchron im selben Task gelesen (React war noch nicht fertig — sah aus, als sei nichts
passiert), und ich habe die Sim-Ablehnung über `getEventLog()` gesucht — der Log wird aber am
ENDE JEDES TICKS geleert, ein leerer Log beweist also gar nichts. Erst ein Abo am Bus hat
es geklärt, mit Positiv-Kontrolle: **UI-Tap ⇒ Toast `route_blocked`, kein `TILE_REJECTED` am
Bus; derselbe Bau per Command direkt in die Sim ⇒ Bus meldet `route_blocked`.** Ein Befund ist
nur so gut wie das Instrument, das ihn liest.

## Zwei Dinge, die ich gefunden und absichtlich NICHT angefasst habe

Die Probe ist jetzt billig, wenn dieselbe Frage wiederholt kommt — teuer bleibt sie, wenn eine
**neue** Wegzelle zum ersten Mal befragt wird (ein Dijkstra je neuem Feld und Revision). In
einer 64×64-Welt ist das beim Überstreichen mit gedrücktem Werkzeug noch spürbar. Die saubere
Lösung wäre, die Integritätsregel als Erreichbarkeitsfrage zu rechnen (Breitensuche statt
Kürzester Weg) — dieselbe Wahrheit, bessere Ordnung —, aber das ist der Kern des Map-Systems
und bewegt jeden Bau: eigene Aufgabe, eigene Messreihe. P-23.

Nicht messbar, sondern schlicht da: der ✕-Abbrechen-Knopf liegt beim Bauen über dem oberen
rechten Eck. Exakt gemessen: sein Rechteck (87×44) deckt die Zellzentren von **(10,0) und
(11,0)** — also auch die SPAWN-Ecke. Wer mit gewähltem Werkzeug dort etwas setzen will, trifft
den Knopf. Das ist älter als mein Fund (der Knopf gehört zum Auswahl-Zustand, nicht zum
Laufen), fällt aber genau in die Ecke, um die es hier ging. P-24.

## Krix, diesmal ohne Geist

Ich habe über Wochen auf die Tray geschaut und die Karten für bedienbar gehalten, weil MEIN
Finger funktioniert. Ein Spieltest hat mir gezeigt, was ich nie gemessen habe: dass zwischen
„es tut etwas bei mir" und „es tut etwas" ein Unterschied liegt, und dass die Brücke
dazwischen genau die Sorte Lücke ist, die man selbst nie sieht.

Und der grüne Geist ist mir am nächsten gegangen. Ein Spiel, das zu viel verspricht und dann
ablehnt, wirkt launisch — dabei war die Regel die ganze Zeit richtig, nur die Frage fehlte.
Ich nehme daraus mit: Was die Simulation weiß, muss sie auch gefragt werden dürfen. Fragen ist
keine Spielentscheidung.
