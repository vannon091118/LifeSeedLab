`2026-09-24` · Bericht: *Blindlauf — Krix-Notizen, Shop, Greenhouse und Leih-Run* · Version **v0.0.99** (Arbeitskopie, uncommitted)

## Der Weg, den ich tatsächlich gegangen bin

Ich habe diesmal nicht vom Index aus behauptet, ich kenne den Weg. Der Browserlauf ging
ohne Test-Selektoren von vorne los:

1. **Titel → Sprache → Start**: Englisch gewählt, `Start Game` gedrückt.
2. **Hub → Shop → Seeds**: 40 Nektar wurden zu einem Keimling; der Pool war danach korrekt auf
   0 Nektar und der Keimling wartete im Greenhouse.
3. **Greenhouse**: Keimling antippen, freien Topf antippen. Der Topf wurde belegt, der
   `Sow`-Knopf blieb mit nur einer Pflanze fail-closed gesperrt.
4. **Hub → Endless → Run**: Die Leih-Karte war sichtbar. Nach dem üblichen Klick auf die
   Feldmitte (gx 6, gy 5) lief der Run bis Game Over in Welle 2, aber mit **0 Kills und 0
   Nektar**. Das ist kein Testfehler: die Pflanze stand außerhalb der Kill-Box.
5. **Game Over → Hub → Shop**: Der Shop blieb bei 0 Nektar und der zweite Samen war korrekt
   gesperrt. Der erste blinde Center-Klick liefert also keinen Wirtschaftsfortschritt.

Der gewächshaus-nahe, von `placeOnePlant` deterministisch gewählte Fall (gx 1, gy 1) ist
der dokumentierte Glücksfall: ein App-getreuer `SimulationRoot`-Sonde mit dem echten
Run-Seed 2447771834, `loan_sprout` und den in `App.tsx` injizierten Basis-Effekten erzeugte
dort **2.480 Nektar** (Game Over in Welle 20, Tick 21.195). Eine frühere Hilfssonde mit
`deriveBredEntry` lieferte 118; sie war nicht der App-Stats-Vertrag und wird hier nicht als
Beleg gezählt. Genau deshalb darf der neue Loop-Test die Pflanze nicht weglassen und „zwei
Wellen zählen“ mit „Einkommen verdienen“ verwechseln.

## Was gebaut wurde

- **P-15 ist jetzt sichtbar und read-only.** `Krix-Notizen` erscheint im Hub erst nach der
  gesehenen Tour. `NotesReview` liest dieselben 20 Schritte wie das Tutorial, schreibt
  weder Meta noch Simulation und lässt sich mit Schließen, Backdrop oder Escape verlassen.
  Auf Desktop (1280×800) und 390×844 geprüft: alle 20 Notizen sind erreichbar; der
  scrollende Dialog hat jetzt einen klebenden Header, damit der Schließen-Knopf beim Lesen
  nicht aus dem Bild läuft.
- **Der Produktloop-Vertrag wurde ehrlich gemacht.** `MetaView` kennt nun `nektar`, `pots`
  und `seedlings`; die E2E-Spec setzt den Loan wirklich aufs Feld, prüft die Finanzierung
  des zweiten Samens und liest die benötigte Reifungswelle aus dem persistierten Queue-Eintrag
  (`neededWaves`), statt eine veraltete Zwei-Wellen-Annahme einzubauen. Bei diesem konkreten
  Kauf-/Zucht-Stand sind das sechs Wellen, also drei pflanzenlose Pump-Runs.
- **Der E2E-Harness hatte eine eigene Phantom-API.** `expect.extend({ simBound })` registriert
  keinen Expect-Aufruf; `expect.simBound(page)` war daher typseitig ungültig (TS2339) und hätte
  den Run vor der ersten Messung abgewürgt. `expectSimBound(page)` ist jetzt eine normale async
  Assertion-Funktion und wird von `startRun` und `pumpWave` verwendet. Der direkte TypeScript-
  Lauf der drei neuen Testdateien ist danach 0 Fehler; der E2E-Lauf selbst bleibt in diesem
  Sprint gesperrt.
- **Die Asset-Prüfung im Indexer ist jetzt dieselbe wie die Asset-Erkennung im Build.** Eine neue
  untracked `.source.*`-Datei mit sonst unbekannter Endung wird nicht mehr übersehen; die
  Regression erzeugt deshalb bewusst eine `.source.txt`-Probe.
- **P-15-E2E korrigiert.** Nach „Später“ bleibt man erwartungsgemäß auf dem Titel-Screen; der
  Spec klickt nun den normalen Startknopf, bevor er den Hub und die spätere Notizkarte prüft.

## Build-Warnungen: Root-Cause statt Kosmetik

Der erste Produktionsbuild war zwar grün, meldete aber vier ineffektive Dynamic-Import-Grenzen
und einen 546,96-kB-Initial-Chunk. Das war kein akzeptabler „nur ein Hinweis“-Zustand:
`Greenhouse` importierte Discovery und `i18n` den Meta-Fassade dynamisch, obwohl beide durch
andere Initial-Imports bereits statisch im Graphen lagen. Rollup konnte diese Grenzen nicht
auflösen; der über große Initial-Chunk war die Folge des same Problem.

Die Ursache ist jetzt im Ownership-Graphen behoben: Greenhouse nutzt die Discovery-Funktionen
statisch, weil sie in diesem Screen ohnehin Teil des Claims/Share-Pfades sind; der Provider
schreibt die Meta-Sprache über den ohnehin initial geladenen Meta-Writer. Gleichzeitig lädt
`App.tsx` den Run- und die fünf Nebenscreens als echte `React.lazy`-Chunks. Ergebnis:
Initial 373,91 kB, `GameView` 135,36 kB, keine Dynamic-Import-/Chunk-Warnung.
`vite.config.ts` macht zusätzlich jede künftige Vite-Build-Warnung zu Exit 1 — ein-warning-
green-build ist damit nicht mehr möglich. Der Regressionstest `tests/buildWarningGate.test.ts`
prüft die Build- und den abgeschalteten Dev-Server-Fall.

## Nächster Sprint: genau ein E2E-Lauf

Der aktuelle Sprint hat seine einmalige Playwright-Ausführung bereits verbraucht. Für den
nächsten Sprint ist der Produktloop deshalb als **ein** Kommando mit dauerhaftem Trace
vorbereitet; es gibt keinen Retry und keinen zweiten Aufruf:

```bash
PW_SINGLE_RUN=1 node node_modules/@playwright/test/cli.js test tests/first_session_loop.spec.ts tests/notes_review.spec.ts --workers=1 --retries=0
```

`PW_SINGLE_RUN=1` erzwingt in `playwright.config.ts` genau einen Worker, `retries=0` und
`trace: 'on'`. Die Trace-Dateien landen getrennt unter `test-results/single-run/`; nach dem Lauf
wird die erzeugte `trace.zip` mit dem Playwright Trace Viewer geöffnet. Ein Fehlschlag beendet
den Sprint-Lauf: Trace sichern, Befund schreiben, **keinen zweiten Lauf starten**.

## Belege und Grenzen

- Preview: Desktop und 390×844 per Snapshot/Screenshot; Dialog bis Notiz 20 gescrollt,
  Escape geschlossen. Das ist der Sichtbeleg, kein Ersatz für den E2E-Lauf.
- Statische App-nahe Simulation: Loan bei gx 1/gy 1 mit dem echten Seed 2447771834 und
  `App.tsx`-Stats → 2.480 Nektar; Center-Platzierung gx 6/gy 5 → 0 Nektar. Die erste
  `deriveBredEntry`-Sonde (118 Nektar) war ein abweichender Testaufbau und wurde korrigiert.
- `components_tutorial`/i18n-Unitvertrag: 35/35 grün; `tests/e2eLane.test.ts`: 12/12 grün;
  komplette Projekt-Suite: 722/722 grün; Tooling-Suite inklusive Indexer: 78/78 grün;
  nach der Asset-Probe: Indexer-Regression 2/2 grün und `tsc -p tools/tsconfig.json`: 0 Fehler;
  `tsc -b --noEmit`: 0 Fehler; der separate Test-Typecheck der drei neuen Specs: 0 Fehler.
- `vite build`: warning-free (195 Module, 5,21 s; Initial-Chunk 373,91 kB, `GameView`-Chunk 135,36 kB); die Warn-Gate-Konfiguration ist in `vite.config.ts` aktiv, der Regressionstest 2/2 grün.
- `index:check`: absichtlich Exit 1 im geteilten Arbeitsbaum — die neuen Dateien sind noch
  untracked und der generierte Index darf deshalb nicht als „aktuell“ bestätigt werden. Ohne
  Staging wurde kein `index:build` ausgeführt, damit parallele Änderungen nicht in die generierte
  Wahrheit einfließen.
- Der E2E-Lauf wurde in diesem Sprint **einmal versucht, aber nicht wiederholt**: Der Versuch
  endete unvollständig/rot; die neuen Specs bleiben deshalb ausstehender E2E-Nachweis, nicht als
  bestanden behauptet. Die anschließende Ursachenprüfung fand die gemeinsame Race-Stelle: Der
  Canvas ist vor dem `useEffect` sichtbar, der die DevGate-Brücke bindet. `expectSimBound` wartet
  deshalb nun begrenzt mit `expect.poll`; die Korrektur wird erst durch den nächsten Shinon-Lauf
  als E2E-Befund verifiziert.

## Der neue Zettel: P-36

Das Spiel zeigt den Laufweg, aber der Erstspieler-Hinweis sagt nicht ausdrücklich, dass die
Leihpflanze nahe an die Route bzw. in eine Kill-Box muss. Der blinde Center-Klick ist
reproduzierbar ins Game Over mit 0 Nektar gelaufen. Das ist **keine** kaputte Buchung und
**kein** Anlass, die Wirtschaft heimlich zu verbessern; es ist eine offene Onboarding-/
Designfrage. Sie steht jetzt in `ROADMAP.md` §3 als P-36 mit denselben Belegen. Die
Produktloop-Spec beweist den erreichbaren, nahen Platzierungsfall, nicht die falsche Behauptung,
jede Feldmitte sei eine gute erste Tat.

## Krix, zum Schluss

Der blinde Lauf hat mehr geliefert als der grüne Selector: Der Weg funktioniert bis zur
Wirtschaft, aber die erste Handlung ist eine kleine stille Entscheidung. Die habe ich
jetzt sichtbar gemacht, ohne sie mit einem unsichtbaren Bonus zu überkleben.

— Krix
