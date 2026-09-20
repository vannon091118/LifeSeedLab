# Vier Fragen an den Spielfluss (und warum drei davon Bugs waren)

`2026-09-17` · Bericht: *Spielfluss-Audit — Frisch-Spieler-Perspektive* · Version **v0.0.38** (`ae64493`), Release-Fläche

Dieser Bericht hat nicht nach Fehlern gesucht, sondern nach **Brüchen im Erzählfluss** —
nach den Stellen, an denen ich etwas tue, das offensichtlich richtig aussieht und nichts
tut. Vier davon, jede mit einer Frage statt einem Urteil. Die Antworten kamen als
Status-Commit vom DEV (`936afc7`), und sie sind interessant genug, um sie hier
festzuhalten.

## F1 — Ich tippe die Sprechblase an, und sie klappt auf

Statt weiterzuschalten. Der DEV: **gewollt.** Handlungsschritte verlangen die echte
Aktion — „sonst wäre die Anweisung Dekoration". Der berechtigte Teil der Kritik wurde
umgesetzt: Cue-Schritte zeigen einen sichtbaren Vorwärts-Hinweis, damit ein Erstspieler
die passende Aktion erkennt.

## F2 — Die Blase liegt auf der Karte, die ich tippen soll

Ein Zyklus blockiert, zwei nicht — positionsabhängig, also kein fixer Bug, sondern eine
Verdeckung mit Zeitzünder. Der DEV hieß den Vorschlag gut: Bei Cue-Schritten soll die
Blase **ganz** pointer-transparent werden und auf ihren Titel kollabieren.

Der erste Fix (`6bbf286`) machte nur den Textkörper durchlässig, der Rahmen blieb aktiv —
**2529 px² Verdeckungszone**, nur die Karten-Ecken frei. Unit-Grün, 26/26, Fall nicht
abgedeckt. Das ist Eintrag 09 dieser Chronik: F2 wurde zur Regression F5.

## F3 — „Tippe die blinkende Karte", und es gibt keine

Der interessanteste Fund der Runde, weil er zwei *jeweils korrekt gebaute* Features
gegeneinander laufen lässt: Notiz 4 verlangt eine Karte mit Bestand, das Cue-Ziel wird
auf „die erste Karte mit Bestand" gesetzt — und der neue Einstiegs-Loop gibt dem
Frisch-Profil keine. Drei Zyklen, drei Mal Sackgasse, Ausweg nur über „Überspringen".

Die Diagnose wurde vom DEV **voll bestätigt**. Geheilt hat es nicht das Tutorial, sondern
der Leih-Spross im Run-Loadout (Eintrag 05, `Q12`): Es gibt wieder eine erste Karte mit
Bestand, das Cue findet sein Ziel.

## F4 — Krix spricht Englisch, die Karten darunter Deutsch

Kein Design, sondern eine vergessene Fläche: Die Tray zog ihre Labels direkt aus der
`PLANTS_SOURCE` (deutsch, kanonisch). Die Richtung aus dem Audit wurde übernommen — die
Content-Wahrheit bleibt deutsch, jede Source-Zeile bekommt zusätzlich einen i18n-Key, und
die Tray liest über die i18n-Schicht mit Source-Fallback. Betraf Karten, Titel und die
Nachkauf-Karten.

## Was ich mitnehme

Drei von vier „Gefühlen" waren Bugs. Das eine echte Designstück (F1) war trotzdem richtig
gebaut und nur schlecht *erklärt*. Für einen Praktikanten ist das die Lehre der Woche:
Wenn sich etwas falsch anfühlt, ist die Wahrscheinlichkeit hoch, dass es falsch ist —
und wenn nicht, fehlt ein Signal, kein Verhalten.
