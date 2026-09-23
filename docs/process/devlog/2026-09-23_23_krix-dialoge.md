`2026-09-23` · Bericht: *Krix redet nur, wenn etwas passiert* · Version **v0.0.99** (Arbeitskopie; `package.json`/`src/version.ts` bleiben Regel-0-Vorsprung) · Commit über Shinon

## Was mich gestört hat

Der Auftrag stand seit Tagen im Raum und war jedes Mal derselbe: **Kürzer, gleicher Ton, aber granularer — und an den Screen gebunden.** Im Code war davon nichts zu sehen. Die Tour hing an langen Absatz-Blöcken, die pro Station alles auf einmal erklärten; der Text stand auch dann noch auf dem Schirm, wenn der Spieler längst nichts mehr tat. Die Sprechblase war im geführten Modus transparent — auf dem Screenshot lag ihre Schrift ohne Papier direkt über den Hub-Karten, und darunter stand in der Release-Fläche eine Popup-Blocker-Diagnose, die dort niemanden etwas angeht.

Drei Befunde, eine Wurzel: Der Dialog hatte **keinen Ereignisbegriff**. Er wusste, *welcher* Schritt offen war, aber nicht, *wodurch* er weitergeht — also redete er weiter, auch wenn die Welt stillstand.

## Was jetzt gilt

- **20 Einträge, 10 Prompt/Reaktion-Paare, `TUTORIAL_VERSION = 5`.** Jeder Prompt nennt genau eine Handlung; die Reaktion kommt erst nach dem echten Ereignis. Die Kanten sind explizit: `langChosen`, `screenLeft`, `cardSelected`, `placed`, `layoutDone`, `waveStarted`, `paused`, `running` — und `press` nur dort, wo der Spieler selbst die Notiz wegklickt.
- **Ohne Ereignis bleibt Krix still.** Der Controller merkt sich den Zustand beim Schritt-Eintritt (`entrySnapshot`); ein wiederholter Zustand ist kein Ereignis. `skipIfCurrent` fängt die bereits eingetretene Lage ab (z. B. die automatisch gestartete Welle), statt den Spieler in einer Schleife zu halten.
- **Jeder Dialog liegt auf genau einem Screen.** Start (Sprache, Startknopf), Hub (Endlos), Feld (Karte, Platzierung, Bau, Welle, Pause, Weiter, HUD, Abschluss). Die Sprungregel lässt Vorrennende weiterziehen; wer den Run verlässt, findet seinen Schritt beim Wiedereintritt unverändert vor.

## Die Texte, gemessen statt geschätzt

| Fassung | Einträge | Zeichen gesamt | Ø | Maximum |
|---|---|---|---|---|
| DE | 20 | 1512 | 76 | 93 (`tut.bau.text`) |
| EN | 20 | 1351 | 68 | 87 |

Eine Zeile pro Notiz, keine Zeilenumbrüche, kein Absatzblock. Der Ton bleibt Krix — Praktikant, zweiter Stock, Klemmbrett — nur ohne Vorlesung.

## Was am Bild passiert ist

Der Papierrahmen der Blase wird jetzt gemerged statt ersetzt (`bubbleFrameStyle`), im geführten Modus bleibt nur der Rahmen pointer-durchlässig und die echten Blasenknöpfe bedienbar. `bubbleLayout.ts` (reine Rechteck-/Avoid-Geometrie) sucht die Position außerhalb der mit `data-tut-avoid` markierten Hub-/Tray-Karten und klemmt sie in den Viewport; die Figur nutzt dasselbe Verfahren und wird ausgeblendet, wenn kein sicherer Platz bleibt, statt über Karten zu rendern. Die Versions-/Popup-Blocker-Zeile hängt am DevGate (`isDevActive()`): in der Release-Fläche ist sie weg, unter `?dev=1` steht sie weiter.

## Belege

- `node node_modules/typescript/bin/tsc -b --noEmit` → 0 Fehler
- `node node_modules/vitest/vitest.mjs run src/components/components_tutorial.test.ts src/i18n/i18n_texts.test.ts src/components/qa_befunde.test.ts` → 3 Dateien, 45 Tests grün
- `node scripts/test-lane.mjs` → 44 Dateien, 470 Tests grün; `--full` → **73 Dateien, 709 Tests grün**
- `node tools/indexer/cli.ts build` → 19 Dateien, 310 Quelldateien, 17 Module; `node tools/indexer/cli.ts check` → grün (63518 Kanten, 79 unaufgelöst, bewusst sichtbar)
- `node node_modules/@playwright/test/cli.js test` → **38 passed, 1 skipped**; darunter `tests/krix_bubble.spec.ts` (Release-Pfad `?tutorial=1` ohne DevGate: Papierhintergrund, `data-tutorial-layout="safe"`, 0 Kartenüberlappung)
- `node node_modules/vite/bin/vite.js build` → grün (543,77 kB JS, 169,40 kB gzip)
- Preview: 390×844 und Desktop manuell durchgespielt (Sprache → Start → Hub → Feld)

## Was offen bleibt

**P-15** steht unverändert: Der zugesagte Weg, die Krix-Notizen nach dem Überspringen freiwillig nachzulesen, ist noch nicht gebaut. Er ist ein Wunsch, kein Bug, und er gehört nicht in diese Runde. Alles andere aus der Aufgabenbeschreibung ist umgesetzt und belegt.

## Krix, zum Schluss

Zwanzig Notizen, jede an einen Ort gebunden, jede nur einmal. Ich habe drei Tage lang dieselbe Rückmeldung bekommen und sie dreimal nicht gelesen — das ist ein Personalvorgang, und diesmal steht er in meiner Akte. Was bleibt, ist die Regel: **Ich sage etwas, wenn du etwas tust. Wenn du nichts tust, bin ich still.** Das ist der einzige Teil meines Vertrags, den sie nicht gestrichen haben — und jetzt ist er endlich auch im Code.
