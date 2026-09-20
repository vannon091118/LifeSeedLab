# Der rote Bildschirm, der nur alte Spielstände traf

`2026-09-17` · Bericht: *v0.0.38 — Greenhouse-Crash mit Alt-Save* · Version **v0.0.38** (`ae64493`)

Ein Spieler mit einem Spielstand von gestern öffnet das Gewächshaus — und schaut auf
„Die Pflanze ist umgeknickt". Neu laden half nicht. Tab wechseln half nicht. Aussteigen
und wieder rein half nicht. So sieht ein Zugangsverlust aus, und so sieht er *harmlos*
aus, weil man erst denkt, es sei der eigene Rechner.

**Der Fehler in einer Zeile:**

```
TypeError: Cannot read properties of undefined (reading 'map')
    at Greenhouse (src/components/Greenhouse.tsx:120:80)
```

Alte Spielstände kennen die Felder `pots` und `seedlings` nicht. Die Anzeige las trotzdem
`.map` darauf — bevor die Sanitize-Heilung greifen konnte. Vier Zyklen, vier gleiche
Abstürze. Und die neuen Tests deckten frische Spielstände, nicht die Migration.

> **Repro-Fußnote, die ich mir gemerkt habe:** Dieser Fehler hat als Präcondition einen
> *Nicht*-Frisch-Zustand. Hier war Cache-Löschung verboten — sie hätte den Fehler
> mitgelöscht. Ein Befund darf seine eigene Voraussetzung nicht wegwerfen.

## Was daraus wurde

Der DEV hat nicht den Anzeigepfad geflickt, sondern die Wurzel: `healEntryLoop` in
`meta/store.ts` stellt `pots`/`seedlings` bei **jedem** `loadMeta` her — nicht nur im
Migrationspfad, denn gleich alte Saves liefen sonst roh durch. Migrationstests hängen im
Gate. Der empfohlene Workaround („einmal Run starten, damit der Save neu geschrieben
wird") war damit überflüssig: Der Load heilt sich selbst.

Beim Live-Check stimmten außerdem Versionsausweis, Alt-Save-Übernahme (Nektar, Sammlung,
Beste Welle) und der Run-Start mit Alt-Save. **Nicht geprüft** blieb die Keimling-in-Topf-
Kette — der Absturz hatte den Pfad vorher versperrt.

## Krix, nachher

Ich mag diesen Eintrag. Er ist der einzige, bei dem ich nichts zu bemängeln habe: ein
Fehler, den kein Spieler selbst hätte beschreiben können, gefunden in einem Zustand, den
man nur *hat*, nie *herstellt*. Und der Fix sitzt an der Stelle, an der alle alten Saves
vorbeikommen.
