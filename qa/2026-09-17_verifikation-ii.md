# Verifikation II — Q6 (Verhalten), Resume-Autosave, F6-Zyklen-Protokoll

**Datum:** 2026-09-18 (Session fortgesetzt) · **Gerät:** QA-Kiste · **v0.0.49** · **main `6bbf286`** (unverändert, DEV hat F5/N4 noch nicht adressiert)
**Preview-Tab als unabhängiger Repro; alle Klicks als echte Pointer-Events mit Koordinaten/Hit-Testing.**

---

## 1. Q6 — `erledigt` jetzt VERHALTENS-verifiziert (war bisher nur DEV-Claim)

**Headless (Invarianten-Nachbau exakt aus `store.ts`):** 5/5 Altsave-Fälle heilen
(v0.0.37-ohne-Felder, pots-zu-kurz, pots-Müll, seedlings-kein-Array, leeres Meta → stets
`pots=[null×3]`, `seedlings=string[]`), **Idempotenz** bestätigt.

**LIVE mit echtem Altsave im localStorage:**
1. Envelope v7 mit `appVersion:"0.0.37"`, **ohne** `pots`/`seedlings` geschrieben.
2. Reload → App lädt ohne Fehler; Speicher zeigt: Felder im Storage weiterhin **undefined**
   (heal wirkt im Memory — Storage-Write erst bei `persistMeta`; wichtiges Nebenergebnis).
3. Hub → **Greenhouse geöffnet: KEIN Crash** — 3× „Pot free" gerendert (exakt der
   sanitizePots-Default), Sow-Flow korrekt disabled („2 plants needed first").
4. Nachfolgender Run-Start persistierte den geheilten Stand: Storage danach
   `pots:[null,null,null]`, `seedlings:[]`, `appVersion:"0.0.49"`.
→ **Q6-Status bleibt `erledigt`, jetzt mit Verhaltens-Nachweis statt Quellen-Vertrauen.**
Nebenfund (kein Bug, aber für Support relevant): `lifegamelab_meta.corrupt` existierte nach dem
Alt-Save-Versuch — der Storage-Layer hat einen Checksum-Envelope (v+checksum) und mein roher
v7-Envelope ohne Checksum wurde als corrupt geführt, das Spiel fiel auf Defaults/Heilung. Robust.

## 2. Resume-Verhalten v0.0.49 (nie zuvor getestet) — mit zwei Beobachtungen

Ablauf: Run gebaut (Leihe auf (0,0), Welle lief bis 2, lives 8) → Reload → Hub zeigt
**„▶️ Resume run — Saved run at wave 2"** → Resume geklickt.

**Ergebnis (Sim nach Resume):** `phase:prep`, `wave:2`, `runId:1`, `lives:8`, **Pflanze
`loan_sprout@0,0` wieder da**, Inventar korrekt (`loan_sprout:0`), Energie 180, Konsole clean.
**Kern-Resume funktioniert: Zustand inkl. Plazierungen kommt zurück.**

**Beobachtung A (ökonomisch relevant):** Energie nach Resume **180** — der Vorbereitungs-
Einkommen-Puls wurde nach dem Resume **nochmal gezahlt** (150 Basis + 30 Prep-Einkommen).
Ob das doppelt gezählte Einkommen über viele Resume-Zyklen als Geld-Exploite taugt (speichern/
laden-Loop), ist ein Kandidat für einen eigenen Befund (R-Nummer folgt, 1/3, Kopf-notiert).

**Beobachtung B:** `currentRoute` war direkt nach Resume leer (`routeDa:false`) — die Route
baut sich erst mit dem ersten Prep-Tick. Renderer-Bake hängt an derselben Quelle (Terrain-Bake
an `currentRoute`) — **kurzzeitig könnte das Feld ohne gezeichneten Weg sein** (Flacker-Risiko).
Reproduktions-Dauer winzig; als Kandidat (0/3) notiert, Screenshot-Familie nötig.

## 3. F6 — Zyklus 2/3 (Zyklus 1 = Vortag): Nachbar-Auswahl reproduziert

Identisches Setup (frisches Profil → Notiz 4): Klick in die verdeckte Kartenzone (unten-rechts
der loan_sprout-Karte, Treffer: Blumentopf) → **Blumentopf `pressed=true`**, Ziel-Karte
`pressed=false`. **2/3.** F6-Formalisierung braucht noch Zyklus 3.

## 4. N4-Präzision (Berichtssprache für den DEV-Fix)

Der Zustand ist **zustandsabhängig**: `placedCount === 0` ⇒ fixe Leiste (580–642, verdeckt
Tray-Oberkante, `pe:none` — visuell verdeckt, interaktiv frei); `placedCount > 0` ⇒ der
abschaltbare Zettel-Button (interaktives Element! `pe:auto` — kann dann wirklich klicken).
Auf dem Alt-Save-Resume (Pflanze stand) war korrekt **keine** Leiste. Der N4-Fix muss also
zwei Fälle treaten: Erstplatzierung (Leiste weg vom Tray) und Zettel (Position ok, aber
Positionierung prüfen). Präzisiert im N4-Eintrag des Wirksamkeits-Checks (kein Statuswechsel).

## 5. Was sonst lief

- `tsc -b --noEmit` → **0 Fehler** (vor Session-Start, Code unverändert).
- Preview-Konsole nach Altsave+Greenhouse+Resume: **0 Fehler/0 Warnungen**.
- Storage-Envelope mit Checksum: robust gegen Fremd-Saves (corrupt → Default+Heal), keine
  player-sichtbaren Fehler.

## Offene Liste fürs nächste Paket

1. F6 Zyklus 3 → Formalisierung (2/3).
2. Resume-Einkommen-Doppelzahlung (Beobachtung A) → eigener Befund, 3-Zyklen-Protokoll
   (speichern/laden-Loop, Energie-Buchführung je Iteration).
3. Route-Leer-Fenster nach Resume (Beobachtung B) → Screenshot-Familie, 0/3 → 3/3 oder verwerfen.
4. DEV erwartet: F5-Fix + N4-Fix (beide 3/3+ gemeldet, in-arbeit beim DEV offen).
