# LifeSeedLab Onboarding

Dieses Skill ist die verpflichtende Einlassschleuse für einen Agenten, bevor er LifeSeedLab analysiert, ändert, testet oder Dateien schreibt.

## HARTE REGEL

**OHNE `ONBOARDING = PASS` KEIN SCHREIBEN, KEINE IMPLEMENTIERUNG UND KEIN WEITERARBEITEN AN DER EIGENTLICHEN AUFGABE.**

Der Agent darf den Scan nicht durch eine eigene Zusammenfassung ersetzen. „Ich habe ein gutes Bild“ ist kein Nachweis.

## Zwingende Lesereihenfolge

Die Dateien werden vollständig und exakt in dieser Reihenfolge gelesen:

1. `AGENTS.md`
2. `ARCHITECTURE_CONTRACT.md`
3. `ARCHITECTURE.md`
4. `docs/QUALITY_SPEC.md`

Nicht vorspringen. Nicht parallel durch die vier Dokumente springen. Keine Implementierung zwischen den Leseschritten.

## Pflicht-Scanner

Nach der vollständigen Lesereihe wird **genau ein Scanner** ausgeführt:

`node .agents/skills/lifeseedlab-onboarding/scripts/scan.mjs`

Der Scanner prüft den realen Repository-Zustand, die Pflichtdateien, Git-HEAD, die erwarteten npm-Skripte und die Basisverifikation (`typecheck` + `test`). Er schreibt den lokalen Gate-Zustand nach:

`.git/lifeseedlab-onboarding.json`

Dieser Zustand gehört nicht zum Projekt und wird nicht versioniert.

## PASS-Gate

Der Scanner darf erst PASS erzeugen, wenn alle Pflichtschritte erfüllt sind.

Danach muss der Agent den Gate-Zustand prüfen:

`node .agents/skills/lifeseedlab-onboarding/scripts/scan.mjs --check`

Nur `ONBOARDING=PASS` erlaubt die eigentliche Aufgabe.

## FAIL-Verhalten

Bei `FAIL`:

- nicht schreiben
- nicht weiteranalysieren, um das Gate herum
- Ursache aus der Scanner-Ausgabe beheben
- Scanner erneut ausführen
- erst bei `PASS` fortfahren

Ein alter PASS für einen anderen Commit ist ungültig. Der Scanner bindet das Gate an den aktuellen Git-HEAD und die aktuellen Pflichtdokumente.

## Was der Agent nach PASS tun darf

Erst jetzt darf die eigentliche Aufgabe beginnen. Der Agent verwendet weiterhin `AGENTS.md`, `ARCHITECTURE_CONTRACT.md`, `ARCHITECTURE.md` und `docs/QUALITY_SPEC.md` als Projektwahrheit und folgt den darin enthaltenen Ownership-, LOC-, Determinismus-, Bus- und DoD-Regeln.

## Absichtlich nicht enthalten

Dieses Skill baut keinen zweiten Agenten-State, keinen Memory-Service, keinen zusätzlichen EventBus und keine neue Projektarchitektur. Es ist nur die vorgeschaltete Zwangsreihenfolge plus PASS/FAIL-Nachweis.
