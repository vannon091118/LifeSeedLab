# Vertrauen ist gut, Nachbau ist besser

`2026-09-18` · Bericht: *Verifikation II — Q6 (Verhalten), Resume-Autosave, F6-Zyklen* · Version **v0.0.49** (`6bbf286`)

Zwei Dinge, die dieser Tag gebracht hat: einen Befund, der endlich *verhaltens*verifiziert
war, und einen Zustand, den noch nie jemand getestet hatte.

## Q6: von „laut Commit behoben" zu „im Spiel belegt"

Der Gewächshaus-Crash war seit Tagen als erledigt geführt — aber nur, weil der Commit die
Heilung enthielt. Es gab keinen Nachweis am echten Alt-Save. Also habe ich mir einen
zustandsgetreuen Altsave gebaut:

- **Headless**, Invarianten exakt aus `store.ts` nachgebaut: 5 von 5 Altsave-Fällen heilen.
- **Live**, echter Altsave im Speicher des Browsers: Gewächshaus rendert, Heilung bleibt
  über Reloads erhalten, kein Absturz.

Damit war aus einem Vertrauensvorschuss ein Beleg. Genau deshalb steht in diesem Projekt
überall „Fertig heißt bewiesen".

## Resume: der erste echte Lauf

Fortsetzen war damals neu und ungetestet. Ergebnis: Phase `prep`, Welle 2, `runId` 1,
Leben 8, die **platzierten Pflanzen kommen zurück** — der Kern des Vertrags trägt. Zwei
Beobachtungen blieben stehen:

- **Beobachtung A (Verdacht): Energie nach Resume 180 statt 150** — der Verdacht lautete,
  die Vorbereitung zahle ihr Einkommen nach dem Laden ein zweites Mal. Damit könnte man
  durch Speichern/Laden Geld farmen. → wurde Eintrag 13 und dort **widerlegt**.
- **Beobachtung B (0/3): die Route war direkt nach dem Laden leer** — ein kurzes Fenster,
  in dem nichts läuft. Messdauer winzig, als Kandidat notiert, nicht als Befund. → steht
  bis heute als Prüfpunkt in der ROADMAP.

## F6, Zyklus 2/3

Der Kandidat aus Eintrag 09 bestätigte sich: Ein verdeckter Klick wählt die
Nachbar-Karte. Zwei von drei Zyklen — noch kein Befund, aber die Richtung war klar.

## Was sonst lief

Typecheck 0 Fehler. Die Konsolenprüfung nach Altsave, Gewächshaus und Resume: **0 Fehler,
0 Warnungen**, über die ganze Sitzung. Und die Speicher-Hülle mit Prüfsumme verhielt sich
korrekt gegen fremde Saves (kaputt → Default + Heilung, kein stiller Datenverlust).

## Krix, mit einem Satz zum Auftrag

Der Bericht war kein Bug-Jagd-Auftrag, sondern ein Vertrauens-Auftrag: *Funktioniert das
eigentlich, was ihr behauptet?* Die Antwort war ja — aber sie kam aus einem Nachbau, nicht
aus einem Häkchen. Wenn ich als Praktikant etwas aus dieser Woche mitnehme, dann das.
