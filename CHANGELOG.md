# Changelog

Alle nennenswerten Änderungen an LifeSeedLab. Die Fassungen wurden **aus der Commit-History
rekonstruiert**: Jeder Eintrag fasst zusammen, was im Repository tatsächlich passiert ist
(Commit-Hashes in Klammern), älteste Fassung zuerst, neueste oben. Das Spiel ist im
Pre-Release — die Versionszählung läuft bewusst in kleinen Schritten (v0.0.x).

---

## Unreleased (Arbeitsstand 16.09.2026, noch nicht committet)

- [Gate] Agenten-Footer verboten (MSG006): „🤖 Generated with …“ und „Co-Authored-By: Codebuff <noreply@codebuff.com>“ schließen das Commit-Gate jetzt als Fehler — maschinelle Signaturen haben in der Historie nichts verloren. Menschliche Co-Authored-By-Zeilen bleiben erlaubt. Selbsttest um vier Fälle erweitert (14 bestanden).

- [B26] Audit-Freigabe: Die Audit-Änderungen (Genom→Visual-Split, Farb-Utils-Eine-Quelle, GameView/MainMenu-Memoisierung, i18n-Bereinigung, Versions-Bump-Schutz) sind committed. Dabei stellte sich heraus, dass der vorausgehende B24-Commit (`38564d5`) den verschobenen Tutorial-Test mit alter Import-Pfade-Fassung enthielt — der Cloudflare-Build lief deshalb rot (TS2307, `./controller` nicht gefunden). Lokal war der Stand längst korrekt; der Commit enthielt nur die halbe Strecke. Der Befund ist mit dem Commit `7c01208` behoben.
- [Chore] README-Aktualisierung (Shinon-Starter) und Versions-Bump 0.0.24 als eigener Commit nachgeschoben.

- [Audit] Godfile-Befund umgesetzt: Genom→Visual-Mapping (`genomeToVisualInput`, `genomeEffectIds`) aus `visual/generator.ts` nach `genome/visualMap.ts` verschoben (meta/store.ts importiert Genome-Logik nicht mehr aus visual/), `TYPE_BASES` als Content-Truth nach `config/genes.source.ts` (Regel 6), Farb-Utils (`hexToRgb`/`rgbToHex`/Shifts) dreifach-dupliziert → eine Quelle `core/color.ts` (generator, primitives, enemies), toter Produktionsexport `generateVisualForBase` in den Test verlagert, konstantes `shadow`-Feld aus `ResolvedVisual` entfernt.
- [Audit] GameView: `bredVisuals` als useMemo (vorher baute ghostVisual die deterministische Map bei JEDEM Hover/Drop neu), `plantIds` memoisiert, fünf FX-lose Bus-Subscriptions entfernt (SCORE/COMBO/COINS/TILE/BEETLE_REJECTED — HUD liest via hudOf), Hardcodes im HUD/Abbrechen-Button auf i18n (neu: `game.status`, `game.paused`) gestellt.
- [Audit] MainMenu: Styles in `mainMenuStyles.ts` ausgelagert (347 → 188 LOC, Muster gameViewStyles), Marquee/Footer über i18n (neu: `menu.marquee`, `menu.footer` — EN-Spieler lasen vorher deutschen Text), `createBaseVariants` memoisiert.
- [Audit] ~25 tote i18n-Keys entfernt (kompletter `debug.*`-Block, `game.waveOf/placing/clickGrid/reset/breed`, `hud.energy/lives/nektarEarned`, `menu.notOwned/loadoutFull/startRun`, `breed.chance/offspring/generation/collection`, `common.close/confirm`) — zweisprachige Doppelpflege ohne Konsument.
- [Audit] Versions-Audit: precommit.js bumpte nur package.json — src/version.ts (Anzeige, Lock via version.test.ts) blieb stehen und divergierte still (0.2.3 vs. 0.2.1, Test rot erst beim nächsten Lauf statt beim Commit). Das Script zieht die Anzeige jetzt mit, hat einen Doppel-Bump-Schutz (Session-Stamp in .git/) und stoppt den Auto-Bump bei 0.0.99 — die nächste Stufe ist eine Release-Entscheidung, kein Mechanik-Zufall. Zählung: Pre-Release 0.0.x.
- [B24] E2E-Harness als eine Quelle (`tests/helpers/harness.ts`): derselbe Werkzeug-Code lag vier- bis fünffach im Baum (startRun, devValue, freeCells, Game-Over-Pump); die vier Specs testen jetzt über einen gemeinsamen Harness — Progression-Laufzeit ~5 min → ~31 s.
- [B25] Haltbarkeitsleiste am Feld: verwelkende Pflanzen zeigen die Restzeit in den letzten 30 % ihrer Lebenszeit (Gelb = geschwächt) — vorher verschwanden bezahlte Pflanzen lautlos.
- [B25] Loadout-Zähler und Liste aus einer Wahrheit im Hub — der Zähler zählte Einträge ohne Bestand mit, die Liste sie nicht an.
- [B25] Codex als ehrliches Laborbuch: DE-Texte ohne Fachjargon-Mix, Fußnote sagt ausdrücklich, dass Entdeckungen auf dem Gerät bleiben (der Sync ist im Code ein reiner Stub).
- [Doku] README (Testzahlen, Roadmap-Tabelle), ROADMAP.md (Statuskopf) und quality-spec B24/B25 auf den Ist-Stand gezogen.

---

## v0.0.14 — Feld-Feedback, Versionsquelle, Tour-Frühstart (16.09.2026)

Diese Fassung schließt die zweite Spielerbericht-Runde ab: Das Feld reagiert auf den Spieler,
statt still zu sein.

- **Aufbauphase** (`4a30d7d`): Mit leerem Feld startet keine Welle mehr von selbst; das Fenster beginnt erst mit der ersten Pflanze (der Anker wandert mit — Warten kostet nichts). Der Wellen-Knopf bleibt jederzeit der manuelle Ausweg, kein Softlock.
- **Wellen-Knopf folgt der Phase** (`4a30d7d`): In der Vorbereitung steht „Welle starten" mit Countdown-Hinweiszeile; während der Welle eine deaktivierte Anzeige „Welle n läuft" — die Sackgasse „Start Wave tut nichts" ist zu.
- **Ablehnungsgründe sichtbar** (`4a30d7d`): FieldToast übersetzt die Gründe des PlacementControllers („Auf dem Weg ist kein Platz", „Zu wenig Energie", …), Zeitbasis Sim-Tick.
- **Score als Spielerzahl** (`4a30d7d`): „243.09999999999997" → „243" — gerundet wird nur in der Anzeige, die Sim bleibt exakt.
- **Onboarding beginnt nach der Sprachwahl** (`cfcbd99`): Die Krix-Tour gehörte GameView und konnte deshalb erst im Feld beginnen. Jetzt besitzt der Screen-Router sie — drei Stationen (Titel → Hub → Feld), Sprungregel, MetaSave v7 mit `tutorialVersion`.
- **Version aus einer Quelle** (`6daac50`): `src/version.ts` liest die Nummer, `version.test.ts` hält package.json und Anzeige zusammen — kein stiller Versionsdrift mehr.

---

## v0.0.13 — E2E-Suite, Krix-Onboarding, schnelles Gate (16.09.2026)

Die Fassung der Beweise: Was bisher nur behauptet wurde, ist jetzt test-gelockt — und das
Onboarding kommt ins Spiel.

- **E2E-Specs** (`5b6075d`): Progression, Mechanik und Gamebreaker als Playwright-Specs — Spielverlust über die echte Pipeline, Wellen-Marathon, Reifungs-Leiter. placeOnePlant wurde verschärft (eigener Variant am Sim-Zustand statt `plants.length > 0`), die Sim wird vor dem Aufbau eingefroren.
- **Krix-Onboarding** (`ffb9d37`): Animiertes Dialog-System mit Fineliner-Strichmännchen, Comic-Sprechblasen, Schreibmaschinen-Reveal und blinkender Handlungsanweisung auf die echten Bedienelemente; acht Feldnotizen in DE/EN; MetaSave v6 mit `tutorialDone`.
- **Gate 8 min → 8 s** (`350d1b2`): Inkrementeller Typecheck, Vitest-Modulcache, kein `npx` im Commit-Pfad; E2E bewusst aus dem Commit-Pfad genommen. Nicht abgeschwächt — fail-closed wie zuvor.
- **Tray zeigt Bestand im ersten Bild** (`350d1b2`): Der Befund kam aus der E2E-Suite — der Tray-Bestand kam allein aus dem RAF-Snapshot, bis zum ersten Takt standen alle Karten als „×0" da. Eine Quelle (`hudOf`) speist Takt und Erst-Anzeige (B22).
- **Doku nachgezogen** (`6140b98`): Arbeitsvertrag hält den verbindlichen Abschlussweg (Preview → E2E → Shinon) fest.

---

## v0.0.12 — Der Zucht-Loop funktioniert wieder (15.–16.09.2026)

Wirtschaftliche Korrektheit: Was der Spieler kauft, erreicht ihn — und was er säht, reift.

- **Keim-Bestand** (`a97daf7`): Ein Shop-Kauf keimt direkt zur Pflanze (`buySeedAndGerminate`, atomar, fail-closed ohne Nektar). Der alte Umweg über ein Samen-Ticket war ein Nektar-Drift: erster Klick zahlte, zweiter keimte gratis.
- **Wellen-Anbruch zählt** (`a97daf7`): Die Reifung zählt die angebrochene Welle (`WAVE_STARTED → +1`); Tod in Welle 1 bringt genau +1 — „keine Runde bringt was" ist strukturell unmöglich.
- **Loadout bedienbar** (`a97daf7`): Das Menü trennt Loadout (n/4, Mitnehmen/Ablegen) von der Sammlung — gezüchtete Pflanzen erreichen den Run.
- **Route aus dem State** (`07b058d`): Eine Routen-Wahrheit statt drei Kopien; `getRoute`/`setRoute` sind tot. Sim, Renderer und Terrain lesen denselben Ausdruck.
- **Zucht-Schleife erreichbar** (`07b058d`): Aussaat verbraucht keinen Seed-Stash mehr (der war strukturell immer 0 — das alte Gate machte die Schleife unerreichbar). Elternverbrauch bleibt beim Keep.
- Onboarding-Scan-Artefakte entfernt (`c039358`) — Fremd-Artefakt mit eigenem Skript-Backup widersprach dem Arbeitsvertrag.

---

## v0.0.11 — Fail-closed überall (15.09.2026)

Ein externer Review wurde gegen den Code geprüft: sechs Befunde bestätigt, zwei widerlegt.
Das Ergebnis ist eine Sim, die bei unbekannten Zuständen nicht mehr rät.

- **Reife fail-closed** (`1d2bfa7`): `claimBrood` wählt bei unbekanntem Index nicht mehr stillschweigend 0; `keepCross` nimmt den Index verpflichtend und prüft die Reife — der alte „Rückwärtskompatibilität"-Test war der Bypass und wurde invertiert.
- **Save-Downgrade in Quarantäne** (`1d2bfa7`): Ein älteres Save kann das neuere nicht mehr still überschreiben.
- **Inventar-Kappung räumt vollständig** (`1d2bfa7`): Keine hängenden Loadout-/bredStats-Referenzen mehr nach dem Verdrängen von IDs.
- **Mojibake-Gate** (`1d2bfa7`): Der Codex war CP1252-doppelkodiert — rekonstruiert und als Gate verboten, damit es nie wieder passiert.

---

## v0.0.10 — Identität und Kanon (15.09.2026)

Zwei Specimen trugen dieselbe id — reproduziert, nicht vermutet. Diese Fassung macht
Kennungen und Saves beweisbar eindeutig.

- **Monotone Brut-Kennung** (`d06afa4`): MetaSave v5 mit `broodGeneration`; die Migration leitet den Startwert aus der höchsten je vergebenen Kennung ab — nach einem Claim fällt der Zähler nie mehr zurück.
- **Eine Reife-Regel** (`d06afa4`): `isCrossReady` ersetzt zwei divergierende Regeln und ist fail-closed (unbekannt ⇒ nicht reif).
- **Kanonische Save-Checksumme** (`d06afa4`): Integrität inhaltlich statt über JSON-Key-Reihenfolge; Alt-Saves bleiben lesbar.
- **E2E im Gate** (`d06afa4`): Die Playwright-Suite wird zur eigenen Gate-Stufe registriert.
- **Placement modularisiert** (`f184de3`): Rules, Controller, Tray und Overlays aus GameView gezogen statt den LOC-Cap zu erhöhen; Resume-/Meta-Erweiterungen.
- **Sim-Härtung** (`ebb4913`): Snapshot-Kopien (`getSnapshot`/`getEventLog`) — UI/Tooling kann den Sim-State nicht mehr mutieren; IDB-Backend erhält denselben Quarantäne-/Checksum-Vertrag; atomares `consumeSeedAndEnqueueCross` (kein Zustand mehr mit verbranntem Seed ohne Cross-Entry); Run-Ende hängt am `GAME_OVER`-Event statt am RAF-Polling.

---

## v0.0.9 — Shinon: der einzige Git-Abschluss (15.09.2026)

Das Tooling bekommt einen Vertrag: Commit und Push laufen nur noch über einen Weg, mit
Gate davor.

- **Commit+Push-Executor** (`b935044`): Shinon war nur ein Gate ohne Vollzug — `core.hooksPath` zeigte ins Leere, ein post-commit-Hook pushte ohne Gate-Bezug. Jetzt: Starter (liest den realen Status, aktualisiert den README-Statusblock) → Gate (spezialisierte Prüfklassen) → Komponist (committet genau `commit_msg.txt`) → Push-Stufe (erst nach grünem Gate, mit Auth- und Upstream-Prüfung). Ohne neue Dependencies.
- **Struktur konsolidiert, Gates aktiviert** (`8f8f58d`).

---

## v0.0.8 — Repo-Struktur und Aufräumen (15.09.2026)

- **Doku-Karte** (`6585a3d`): Alle Dokumente in `docs/`-Unterverzeichnisse, kebab-case.
- **Lizenz & Präsentation** (`e2a74c8`).
- **Backup vor dem Groß-Umbau** (`e493c21`).
- **Hub-Bereinigung** (`0f8fa60`): Agent-Tooling aus der Oberfläche (`.agents`, `.claude`, `git-noir`, `memory`, `docs/art` ignoriert) — der Hub zeigt nur Spiel, Doku und Onboarding-Skill, kein Workflow leakt in die Release-Fläche.

---

## v0.0.7 — Screens, Terrain, erster Stabilitäts-Fix (14.–15.09.2026)

- **P0 Hook-Crash behoben** (`60d58dc`): Hook-Aufrufe vor die bedingte Rückgabe gerückt — React #310 ist tot, Start, Menü und Run ziehen wieder sauber durch.
- **Screen-Regie** (`60d58dc`): Gewächshaus, Shop, Brutlabor und Codex je eigener Screen mit Papier-Schnitt, Nav-Tabs, Chips und Dots als Wegweiser.
- **Kasten-CGI** (`60d58dc`): Terrain-Raster, Pfade und Blöcke aus der Source bepreist, Wegfreiheit geprüft, Geister-Vorschau blockt besetzte Felder; leichtes Lint-Gate unter fünf Sekunden.
- **Onboarding-Skill + Pflicht-Scanner** (`ff43cf2`, `b9d1baa`): lokales PASS/FAIL-Gate für Pflichtdateien.

---

## v0.0.6 — P1–P8: das Spiel wird vollständig (14.09.2026)

- **Game Over friert die Sim am Owner ein** (`c280ecd`): keine weiteren Wellen nach dem Verlust.
- **Shop als eigene Komponente** (`c280ecd`): Greenhouse wird zur reinen Zucht-Verantwortung.
- **Map-System** (`c280ecd`): Tile-Platzierung, Dijkstra-Routen, Spieler-Maps.
- **Käferzucht** (`c280ecd`): Brüten, Spawn 1×5, TAUNT, Tod-Spawn, BeetleLab mit eigenen FX.
- **Gene wirken** (`c280ecd`): Gen→Effekt-Mapping, alle Gene messbar — keine Deko-Gene.
- **Namensgenerator** (`c280ecd`): nahbare Präfixe/Suffixe, source-driven.

---

## v0.0.5 — Gates, Discovery-Chain, DevGate (14.09.2026)

- **Gates B–E** (`964d410`): Combo×Score, FX-Isolation, RunSave v2 mit Meta-Migration und Quarantäne, Renderer-Layer-Split (576→219), Pointer-Workflow ohne Hover, versionierte Transport-Verträge (Local/MockRemote).
- **Discovery-Chain** (`964d410`): append-only Hash-Kette, lokal-first, UNIQUE(genome_hash) — erste Entdeckung gewinnt; Codex-UI und `lifeseed:`-Sharing.
- **Cap-Splits ohne Cap-Erhöhung** (`964d410`): genome/, meta/, i18n/ aufgeteilt statt Grenzen aufzuweichen.
- **DevGate `?dev=1`** (`964d410`): DevOverlay mit Seed/Hash/EventLog/Partikel-Budget — nur hinter dem Gate, nie im Release.
- **Hygiene** (`d8e1883`): Eine geleakte `.env.local` (Tokens!) verlässt den Index — bleibt lokal, wird nie wieder getrackt.

---

## v0.0.4 — Kampfökonomie und Lebenszyklus (14.09.2026)

- **Auto-Wellen** (`a2600e3`): Nach 90 Ticks läuft die Welle von selbst weiter.
- **Kill-Münzen** (`a2600e3`): Jeder Kill vergibt deterministisch 1–5 Münzen (loot-Namespace).
- **Pflanzen-Lebenszyklus** (`a2600e3`): Wachsen je Seltenheit, Düngen nur im Wachstum (boostet Werte gegen Cooldown), Schwelle bei 30 % schwächt, Setzling-Halbzeit.

---

## v0.0.3 — Papercraft-Identität (14.09.2026)

- **Run-Identität aus Meta** (`2f4fd97`): `runId` lebt im persistierten Meta statt in einer React-Session — der Spieler behält seinen Run.
- **Bred-Visuals deterministisch** (`2f4fd97`): gezüchtete Pflanzen sehen aus wie ihr Genom (`ResolvedVisual`), Partikelfarben über Observer-Payload.
- **Paper-Welt** (`2f4fd97`): GameView als Notizzettel-HUD und -Tray — die erste echte Papercraft-Komposition statt einer dunklen HUD-Leiste; Art Direction B0/B4 verbindlich verankert.

---

## v0.0.2 — Deterministischer Kern (14.09.2026)

- **Neubau auf Modularchitektur** (`e62349f`): Der monolithische Sim-Worker wird ersetzt durch Fixed-Timestep-Clock, namespace-forked seeded RNG, stabile Entity-IDs, kanonischen State-Hash, Event-/Command-Buses und sechs Single-Writer-Systeme. Content source-driven, Visuals deterministisch aus dem Genom, 52 Tests beweisen Gameplay-Determinismus und FX-Isolation.
- **Release-Fläche lauffähig** (`e20acce`, `49ff364`, `bc87148`): README mit Banner, `.gitignore` deckt Builds/Env, die Vorschau zeigt nicht mehr einen toten alten Snapshot, neue Spieler starten mit Grundsorten im Gewächshaus.

---

## v0.0.1 — Erste Saat (14.09.2026)

- Initialer Commit (`f02614c`): das Projekt steht — ein Browser-Tower-Defense, bei dem gezüchtete Pflanzen die Türme sind.
