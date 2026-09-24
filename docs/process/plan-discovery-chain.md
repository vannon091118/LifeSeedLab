# Plan-Prüfung: Discovery-Chain & Ticket-Wurzel

**Stand:** 19.09.2026 · **geprüft gegen:** `9824b54` · **Status:** Bewertung + Plan; **P1, P2 und P2' (`plant_ref`, nachgetragen als Schema v3) sind umgesetzt** (siehe §7). Der Feldname hieß bis v2 `plant_hmac`; die Umbenennung samt Migration steht im Nachtrag vom 21.09.2026.

> **Umsetzungsstand:** P1 (Wurzel als Kontext), P2 (versionierte Einträge + Migration) und
> P2' (`plant_hmac` statt Klartext-Seed) sind implementiert und gepinnt (`src/discovery/epoch.test.ts`,
> `src/discovery/chain.test.ts`). Alles andere in §3 ist geplant, nicht gebaut — insbesondere
> existiert KEIN Server: `plant_hmac` trennt die zwei Wahrheiten, schützt aber noch nicht
> gegen Offline-Vorausberechnung (erst P3/P4).

---

## 1. Behauptungen gegen den Code

| # | Behauptung | Beleg | Urteil |
|---|---|---|---|
| 1 | Ein aktiver Online-Sync existiert nicht | `src/discovery/chain.ts` und `src/discovery/codex.ts` | **bestätigt** — der frühere No-op-Stub wurde entfernt; der Codex bleibt lokal |
| 2 | Supabase ist ein Register, keine Kette | `supabase/migrations/001_discoveries.sql:29` (`genome_hash … unique`); `prev_hash` je Zeile, kein serverseitiger Tip | **bestätigt** — global eine MENGE mit Ordnung je Spieler |
| 3 | Die Migration nennt Hash-Squatting selbst | `001_discoveries.sql:11-17` („RESTRISIKO … Anzeige-Spiegel, kein Beweis") | **bestätigt** |
| 4 | Der Server rechnet `entry_hash` nicht nach | ebenda: nur CHECKs auf **Form** (`^[0-9a-f]{8}$`, Eltern-Arity, `player_id`-Muster) | **bestätigt** |
| 5 | Anon-Insert-Lücke | **bereits geschlossen (19.09.):** Policy trägt jetzt `to authenticated`, UPDATE/DELETE ohne Policy | **überholt** — Befund war korrekt |
| 6 | FNV-1a, 32 Bit, 8 Hex | `src/core/hash.ts:26` `fnv1aHex` | **bestätigt** — für ein globales UNIQUE eng: erste Kollision im Erwartungswert ≈ 2^16 (≈ 65 000 Einträge) |
| 7 | Gleiche Eltern ⇒ gleiches Kind für **alle** Spieler | `src/genome/gacha.ts:74` `deriveSeed(GAME_SEED,'plant',parentA.id,parentB.id,generation)`; `:64` `deriveGachaSeed(generation)` | **bestätigt** |
| 8 | Die Wurzel ist eine Konstante | `src/config.ts:7` `GAME_SEED = 1337` | **bestätigt** |
| 9 | Run-Wurzel aus lokalem Zähler | `src/meta/run.ts:35` `runId = Math.max(meta.runId, meta.runs) + 1` | **bestätigt** — kein Netz, kein Ticket |
| 10 | `crossPair` ist rein ⇒ nachrechenbar | `gacha.ts:73-96`: nur Eltern-IDs + Generation, kein `Date`, kein `Math.random` | **bestätigt** — Worker-Nachrechnung technisch möglich |
| 11 | Kein Worker | kein Wrangler/DO/D1 im Repo; `src/cloud/` ist die LLM-Bridge (`browserUseCloud`), nicht der Sync | **bestätigt** |
| 12 | Kein CI | kein `.github/` | **bestätigt** |
| 13 | „Kein versionierter Hook" | Genauer als behauptet: `scripts/check-changelog.sh` und `scripts/test-lane.mjs` sind **getrackt** — aber `.gitignore:51` nimmt `/scripts/*` aus, die **Hook-Logik selbst ist nicht getrackt**. Dazu zeigt `core.hooksPath` in den ignorierten Ordner `git-noir/hooks` (`.gitignore:43`) | **teilweise** — im frischen Klon läuft **kein** Gate |
| 14 | Identität ist selbstgewählt | `src/discovery/codex.ts:26-41`: `player_${randomUUID().slice(0,8)}` bzw. Geräte-Fingerabdruck, lokal gespeichert | **bestätigt** — beliebig viele Identitäten je Client |
| 15 | Ein Replay-Verifier könnte „erspielt" beweisen | Determinismus ist da, **aber** kein Persistenz-Ort fürs Kommando-Log (kein `commandLog`/`replay` in `src/persistence/`, kein Feld in RunSave) | **Lücke** — Planwortlaut stimmt, Voraussetzung fehlt |
| 16 | Der Playtest-Bericht liest sich wie ein Agentenbericht | `docs/process/playtest-report.md:4` „220 Unit-Tests" vs. `:62` „429 Tests (44 Dateien)" — zwei Zahlen im selben Dokument; `:129` nennt `localhost:5174/` | **bestätigt** |
| 17 | Testzahlen driften | README.md:12 Badge „429", :128 „429+", ROADMAP.md:15 „429+ in 44 Testdateien"; Ist (heute gemessen): **529 in 54 Dateien, 10,0 s** | **bestätigt** |
| 18 | Version ist ein Commit-Zähler | `package.json` 0.0.60 bei 67 Commits; der lokale Pre-Commit-Hook hebt den Patch je Commit (von der Ignore-Regel in `.gitignore:51` ausgenommen sind nur die zwei Gate-Skripte) | **bestätigt** (näherungsweise) |
| 19 | Doku-Masse ist die größte Datei | `docs/quality/quality-spec.md` — 1367 Zeilen, größte Datei im Repo | **bestätigt** |
| 20 | „Ticket/Epoche" existiert nirgends | kein `EPOCH_ROOT`, kein Ticket, kein Sync-Endpunkt | **bestätigt** — reiner Neubau |

---

## 2. Drei Konsequenzen, die aus dem Code folgen

1. **Vorrechenbarkeit.** Die Wurzel ist konstant und `crossPair` rein (`config.ts:7` +
   `gacha.ts:73-74`): Kind und damit jeder seltene `genome_hash` sind vorab berechenbar.
   Seltenheit ist heute ein **Zeitstempel-Wettlauf**, keine Eigenschaft des Fundes.
2. **Keine Gesamtordnung.** `prev_hash` verkettet korrekt **lokal** (`verifyChain`/`tryAppend`),
   ohne einzigen Schreiber gibt es global aber keinen Tip. Die Begründung für „ein Worker" ist
   also **Ordnung**, nicht Last.
3. **Nachrechnen ist billig — gemessen, nicht geschätzt.** Sonde auf dieser Maschine (V8, warmer
   Lauf, 20 000 Kreuzungen, danach gelöscht): volle Kreuzung inkl. Stats/Farbe/Name **81 967/s**
   (10⁶ ≈ 12 s, 10⁹ ≈ 3,4 h); der Pfad, den ein Angreifer wirklich braucht (Seed → Genome →
   `genome_hash`, ohne Stats/Farbe/Name) **46 512/s** (10⁶ ≈ 22 s, 10⁹ ≈ 6 h); 20 000 von 20 000
   Läufen ergaben verschiedene Hashes (100 %). Eine Gegenmessung aus dem Umfeld nennt 220 000/s
   (≈ 3× schneller) — deren Aufbau ist hier nicht reproduzierbar, deshalb stehen beide Zahlen
   samt Methode nebeneinander statt einer „Wahrheit". **Die Folgerung ist von der Zahl
   unabhängig:** ein Fund mit 1:10⁶ kostet Sekunden bis Minuten. „Noch nicht fertig" schützt nur
   bis zum ersten eingefrorenen Stand — danach rechnet jemand den Baum in Minuten durch.

---

## 3. Der Plan in Phasen

| Phase | Inhalt | Vorbedingung / Risiko |
|---|---|---|
| **P1 — Wurzel durchfädeln** | `ctx.root` statt `GAME_SEED` an allen `deriveSeed`-Aufrufstellen; Epoche 0 = 1337, Verhalten **bitgleich** | Golden-Tests auf Epoche 0 sind der Beweis, dass nichts bricht. Heute der einzige kostenlose Schritt |
| **P2 — Codex v2** | Eintrag trägt `epoch_id`, `type`, `schema_version`; Migration v1 → v2 | Altbestand braucht eine Regel (unsignierte „Gründer"-Einträge?) — sonst sind Altfunde unverifizierbare Daten |
| **P3 — Sweep-Test** | viele Tickets durch die Sim, Verteilung + „kein unspielbarer Start" | Läuft vor dem Live-Schalten der Varianz; Leih-Spross bleibt seed-unabhängig fest |
| **P4 — Worker (ein Schreiber)** | `/ticket`, `/submit`, `/chain?from=`; Nachrechnung über das reine `crossPair` | DO oder D1 — KV ist ungeeignet (eventual consistent ⇒ Tip-Forks). Plattform-Entscheidung offen |
| **P5 — START-Flow & Pool** | Ticket wird beim Ausstellen verbrannt, jeder Start ist ein neuer Einstieg | Netz beim Start; Offline-Fallback = Sandbox als `unranked` |
| **P6 — Seltenheit & Fund-Feed** | Signatur-Klassen + Zähler („Nr. 3 von 5.000") | **Der eigentliche Produkt-Haken.** Braucht keinen Worker, siehe §5 |
| **P7 — Replay-Verifier** | Kommando-Log nachspielen, oberste Stufen bis dahin `pending`; Fehlschlag → Tombstone | **Voraussetzung fehlt:** es gibt kein persistiertes Kommando-Log (§1.15) |
| **P8 — Identitäten härten** | SHA-256 über `crypto.subtle` für Identitäten/Entry-Hashes; FNV bleibt für Seed-Mischung und Save-Prüfsummen | 32 Bit reichen für ein globales UNIQUE nicht (§1.6) |

---

## 4. Was der Plan nicht ausspricht

- **Direktes Client-Schreiben ist der dokumentierte Squatting-Pfad.** Gibt es keinen Worker, müssen
  die Clients selbst in Supabase schreiben — genau die Lücke, die die Migration als Restrisiko
  benennt (§1.2/§1.3). `to authenticated` hilft nur, wenn im Projekt **keine anonymen Sign-ins**
  aktiv sind: Supabase vergibt Anon-Sessions ebenfalls die Rolle `authenticated`. Das ist lokal
  **nicht prüfbar** (Dashboard-Einstellung) und muss vor jeder Aktivierung dort nachgesehen werden.
- **Das Replay-Log früh bauen.** Es ist die Voraussetzung für „erspielt statt errechnet" (§1.15),
  es ist klein — und es hat sofort einen zweiten Nutzen: QA-Agenten können einen gemeldeten Bug
  nachspielen, statt ihn zu beschreiben. Der Nutzen tritt also lange vor der Chain ein.
- **Beleg ohne Rohdaten.** Für Evidenz reicht der SHA-256 des Pakets im Repo plus eine geschwärzte
  Zusammenfassung — nicht das offene Fund-Archiv.
- **Kein Gate im frischen Klon.** Die Prüfskripte liegen im Repo, ihre Verdrahtung nicht (§1.13):
  wer klont, hat Tests, aber keinen Hook und keine CI. Der „Beweis" gilt bis heute nur maschinenlokal.
- **Identitätsbruch.** Eine neue Wurzel entwertet alles, was aus der alten abgeleitet wurde:
  Codex-Einträge, Reifungs-Einträge ohne gespeichertes Kind. Gleiche Klasse wie B30 — bewusst,
  dokumentiert, mit Pins. Dass die Chain ein Stub ist, macht jetzt zum billigsten Zeitpunkt.
- **Zwei Spielerklassen.** Sobald Knappheit global sein soll, braucht der Start ein Ticket und
  damit Netz. „Local-first" bleibt dann Zierde für den `unranked`-Pfad.
- **Replay ist heute nicht möglich** (nur die Voraussetzung fehlt, nicht die Mechanik).
- **`genome_hash` je Exemplar** verliert seine Eindeutigkeit, sobald jeder Spieler eine eigene
  Wurzel hat — „erste Entdeckung" muss auf eine **Form-Signatur** wandern, nicht auf den Hash.

---

## 5. Die eine Entscheidung, an der alles hängt

**A — Wettlauf bei identischem Baum (heute):** Kind = `f(Eltern, Generation)` für alle gleich.
Billig, kein Worker. „Nr. 3 von 5.000" wäre ehrlich, aber trivial: alle finden dasselbe.
Kein Identitätsbruch.

**B — Wurzel-Varianz je Ticket (Plan):** jeder Spieler hat einen anderen Baum, Seltenheit wird
echt eigentümlich. Kosten: Netz beim Start, Worker als Schiedsrichter, Codex-Bruch (§4).

**Empfehlung (nach Einwand überarbeitet): erst P1 + P2, dann A öffentlich, dann B.**

Als **Produktexperiment** („kommt jemand zum Reinschauen?") bleibt A richtig: der Fund-Feed braucht
keinen Worker. Als **Schutz** ist A allein nicht tragfähig — ohne Worker schreiben die Clients
selbst nach Supabase und laufen direkt in den dokumentierten Squatting-Pfad (§4). Deshalb in dieser
Reihenfolge:

1. **P1 + P2 zuerst** (Wurzel durchfädeln, Eintrag trägt `epoch_id`/`type`/`schema_version`), noch
   ohne jede öffentliche Fläche: damit tragen A-Einträge schon `epoch 0`, und der spätere Wechsel
   auf Ticket-Wurzeln ist eine **Migration** statt eines Identitätsbruchs.
2. **A lesbar schalten** (Signatur-Klassen, Zähler, Feed) — rein lesend, aber erst mit P1/P2 im Rücken.
3. **B** (Ticket, Worker, Replay) — die Wurzeln sind dann vorbereitet, und `genome_hash` muss nicht
   mehr die Eindeutigkeit tragen, weil das die Form-Signatur tut.

Ohne Schritt 1 ist jedes spätere B ein Bruch an Daten, die schon öffentlich sind.

---

## 6. Offene Entscheidungen (beim Betreiber, nicht beim Agenten)

1. A, B oder A → B (§5) — bestimmt jede weitere Phase.
2. Worker-Plattform: Durable Object, D1 oder Supabase-RPC mit einem Schreiber.
3. Ticket-Regeln: Pool-Größe offline, Ablauf, was im `unranked`-Modus fehlt.
4. Codex-Altbestand: unsignierte „Gründer"-Einträge behalten — ja/nein.
5. Reihenfolge zum Rest: vor oder nach Käfer-Fähigkeiten (Plan B) und den Ballistik-Fusionen.

---

## 7. Umsetzungsstand P1 + P2 (nachgetragen)

**P1 — Wurzel als Kontext:** `src/config.ts` definiert `EPOCH_ROOT: number = GAME_SEED` und
`EPOCH_ID = 0`. Alle zehn Ableitungsstellen (gacha, beetle, enemyPhenotype, economy, loan,
testkit, enemyVisuals, world_state, App) lesen `EPOCH_ROOT` statt der Konstante. Beweis der
Bitgleichkeit: `deriveSeed(EPOCH_ROOT, …) === deriveSeed(GAME_SEED, …)` gepinnt, Suite unverändert
grün. Ein späterer Worker tauscht nur den Wert, nie die Ableitungen.

**P2 — versionierte Einträge:** `DiscoveryEntry` trägt `epoch_id`, `type` (`'cross' | 'found'`)
und `schema_version: 2`; `entryPayload` erweitert additiv-konditional (D8-Muster — v1-Hashes
bleiben, solange die Felder fehlen). `createEntry` setzt die Felder aus `EPOCH_ID`/Defaults.

**Migration v1→v2 mit gelerntem Vertrag:** Altbestand sind Epoche-0-Gründer. Der erste
Migrations-Entwurf (stille Feld-Anreicherung) brach die Hash-Kette — ein v1-Hash ist ohne die
Felder gebildet, verifyChain rechnet mit ihnen nach. Die Umsetzung (`codex_migration.ts`)
NEUVERKETTET deshalb eine Kette mit v1-Gliedern als Ganzes im v2-Schema; gepinnt in
`src/discovery/epoch.test.ts` (8 Tests, darunter gemischte Ketten und Idempotenz).

**P2' — `plant_hmac` statt Klartext-Seed (nachgetragen):** Einträge NEUER Bauart tragen den
öffentlichen Beleg `plant_hmac` und keinen Seed; Gründer-Einträge behalten ihren historischen
`seed` (Epoche-0-Wurzel ist öffentlich — dokumentierte Herkunft, kein Leck). `entryPayload`
bleibt additiv-konditional und schreibt GENAU EINE Seed-Form je Eintrag; `verifyChain` lehnt
Einträge mit beiden oder keinem ab. Die Ableitung lebt in `src/discovery/plantRef.ts`
(`plantRefOf`; der damalige Modul- und Feldname ist im Nachtrag oben erklärt) — ein READER der
bestehenden Ableitung, kein zweiter Seed-Writer: `gacha.ts`
bleibt der einzige. Share-Format und Codex-Anzeige nennen den Beleg statt des Seeds.

**Bewusst NICHT gebaut (Doppelungs-Verbot):** ein zweites `seedVault.ts` mit eigener
`crossPair`-Kopie wurde verworfen — es hätte `src/genome/gacha.ts:crossPair` dupliziert
(Verbot 1) und einen Dev-Account-Modus ohne Aufrufer eingeschleppt. Die P3-Rolle „Account-Root
hält den geheimen Teil" braucht einen SERVER; bis dahin wäre sie eine Attrappe. Der Platz
bleibt der Austauschpunkt `plantRefOf` (eine Funktion, keine Parallelstruktur).

**Schutzgrenze, ehrlich benannt:** auf Epoche 0 ist `EPOCH_ROOT` öffentlich, damit auch
`deriveSeed(EPOCH_ROOT, 'plant', a, b, gen)`. `plant_hmac` TRENNT heute die zwei Wahrheiten
(privater Seed vs. öffentlicher Identifier) und macht Entry, Share-Format und SQL-Spiegel
serverfertig; Schutz gegen Offline-Vorausberechnung gibt erst der geheime Account-Root (P3).
Gemessen: ~81.967 volle Kreuzungen/s, Angreiferpfad ~46.512/s (warm, diese Maschine) —
„noch nicht fertig" ist kein Schutz.

**Migration 001 (Supabase) nachgezogen:** `plant_hmac` als nullable Spalte, `seed` nullable,
Constraint `discoveries_identity_singular` erzwingt genau eine der beiden Formen, plus
`plant_hmac`-Formprüfung. Die Migration ist weiterhin NICHT angewandt — vor Aktivierung muss
sie zu P3/P4 passen (Server-Verifikation gegen den Account-Root).

**Nachtrag 21.09.2026 — das Feld heißt `plant_ref` (Schema v3):** Der Name `plant_hmac`
versprach einen HMAC; die Funktion war und ist ein schlüsselloser FNV-Mischwert über
öffentliche Eingaben plus Seed. Der Kommentar sagte das ehrlich, der Feldname überlebte ihn.
Jetzt heißt die Sache, was sie ist — Modul `src/discovery/plantRef.ts` (`plantRefOf`), Feld
`plant_ref`, Wert-Präfix `pr-` statt `ph-`. Preis, ehrlich benannt: Der Feldname steckt IM
GEHASHTEN PAYLOAD (`entryPayload`), die Umbenennung ist also keine kosmetische Änderung,
sondern eine Schema-Migration mit NEUVERKETTUNG (`codex_migration.ts#migrateToPlantRef`,
Scheiben-Idempotenz in `epoch.test.ts` gepinnt). Nebenfund, der dabei aufgedeckt wurde: der
Speicher-Owner ruft eine Migrationskette nur auf, wenn der Codex-Load sie ÜBERGIBT — die
bestehende v1-Anreicherung wurde nie ausgeführt, ältere Ketten wären still verschwunden.
Beides ist mit `migrateCodexSave` verdrahtet. SQL folgt additiv als `002_plant_ref.sql`
(001 bleibt unangetastet, weil eine angewandte Migration nicht nachträglich umgeschrieben wird).

**Nicht umgesetzt (bewusst):** P3 Sweep-Test, P4 Worker, P5 START-Flow, P6 Fund-Feed,
P7 Replay-Log, P8 SHA-256-Identitäten. P5 (Ghost Map) wurde NICHT begonnen: sie braucht den
Server-Endpunkt aus P4, ein lokaler Attrappen-Snapshot wäre eine Sollbruchstelle.
