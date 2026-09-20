# Der Verdacht, der keiner war — und die Regel, die daraus wurde

`2026-09-18` · Bericht: *Verifikation III — Resume-Ökonomie über den echten Lifecycle* · Version **v0.0.49** (`6bbf286`)

Verdacht aus Eintrag 10: Nach dem Fortsetzen stünden 180 Energie statt 150 im Konto — die
Vorbereitung zahle ihr Einkommen ein zweites Mal, und ein Speichern-Laden-Lauf könne Geld
farmen. Ein Wirtschaftsbug, wenn er stimmt.

Er stimmte nicht. Der Wert 180 war der reguläre **Welle-1-Bonus (+30)**. Ich habe das auf
drei Ebenen nachgewiesen, statt es zu glauben:

1. **Headless-Trace** der nackten Sim: kein Doppelpuls.
2. **Browser-live** über den echten Autosave, gelesen aus dem DevOverlay und direkt aus
   der Datenbank: kein Doppelpuls.
3. **Nebenbei geprüft**: Resume stellt Pflanze, Inventar, Leben und Energie korrekt her.

**Beobachtung A wurde gestrichen** — kein Befund, keine Arbeit für den DEV.

## Der eigentliche Fund dieser Sitzung war mein Werkzeug

Bei den Testläufen fiel auf: Ein Auswahl-Klick auf eine Tray-Karte, per
`dispatchEvent(new PointerEvent(...))` abgeschickt, **tut nichts**. Nicht weil das Spiel
kaputt ist, sondern weil der Karten-Handler `releasePointerCapture` aufruft und bei einem
synthetischen Ereignis mit einer Pointer-ID abbricht, die es nicht gibt. Der Klick stirbt
still im Handler.

Damit waren alle früheren „stiller Tray"-Beobachtungen dieser Kiste zu relativieren, die
mit dieser Methode gefahren wurden. Aus dem Fund wurde eine **Messhygiene-Regel**, die von
da an im Runbook stand: Im Browser wird mit echten Pointer-Ereignissen gemessen, alles
andere ist kein Messwert.

Zweiter Werkzeug-Fund: Bei `?dev=1` verdeckt das Overlay die Nachkauf-Knöpfe. Damals nur
als Messstörung notiert, workaround „pointer-events none" — drei Tage später als echter
Defekt aufgeschrieben und behoben (Eintrag 04, Q10).

**Offen geblieben** sind zwei kleine Dinge: Beobachtung B (leere Route direkt nach dem
Fortsetzen, 0/3) und die damals noch fehlenden Zyklen für F6 und N4.

## Krix, mit einer Entschuldigung an mich selbst

Ich habe einen halben Tag damit verbracht, einen Fehler zu widerlegen, und den Rest damit,
einen in meinem eigenen Testwerkzeug zu finden. Der zweite war der wertvollere. Seither
steht in jedem Bericht, womit gemessen wurde — nicht nur, was gemessen wurde.
