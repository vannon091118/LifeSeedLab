# Plan-Prüfung: Discovery-Chain & Ticket-Wurzel

**Stand:** 19.09.2026 · **geprüft gegen:** `9824b54` · **Status:** Bewertung + Plan.

> **Hier ist nichts implementiert.** Dieses Dokument prüft einen vorgelegten Plan
> („Ticket-Chain": `EPOCH_ROOT` → Ticket → `RUN_ROOT`, ein Worker als einziger Schreiber,
> Seltenheit als Signatur-Zähler) gegen den echten Code. Jede Zeile in §1 ist im Quelltext
> belegt; Behauptungen ohne Beleg stehen nicht hier. Doku ist kein Ersatz für Umsetzung.

---

## 1. Behauptungen gegen den Code

| # | Behauptung | Beleg | Urteil |
|---|---|---|---|
| 1 | `syncEntryStub` gibt `{ ok: true }` zurück und tut sonst nichts | `src/discovery/chain.ts:143-145` | **bestätigt** — kein Backend-Pfad |
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

## 2. Zwei Konsequenzen, die aus dem Code folgen

1. **Vorrechenbarkeit.** Die Wurzel ist konstant und `crossPair` rein (`config.ts:7` +
   `gacha.ts:73-74`): Kind und damit jeder seltene `genome_hash` sind vorab berechenbar.
   Seltenheit ist heute ein **Zeitstempel-Wettlauf**, keine Eigenschaft des Fundes.
2. **Keine Gesamtordnung.** `prev_hash` verkettet korrekt **lokal** (`verifyChain`/`tryAppend`),
   ohne einzigen Schreiber gibt es global aber keinen Tip. Die Begründung für „ein Worker" ist
   also **Ordnung**, nicht Last.

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

**Empfehlung:** erst **A** ehrlich machen (Signatur-Klassen, globaler Zähler, Fund-Feed, rein
lesend), danach **B**. Begründung: der Reinschau-Haken — der Teil, der den Spieler zurückholt —
braucht keinen Worker. A liefert dieselbe Anzeige bei einem Bruchteil des Risikos und ohne
Identitätsbruch; B kann danach auf saubere Signatur-Klassen aufsetzen statt auf `genome_hash`.

---

## 6. Offene Entscheidungen (beim Betreiber, nicht beim Agenten)

1. A, B oder A → B (§5) — bestimmt jede weitere Phase.
2. Worker-Plattform: Durable Object, D1 oder Supabase-RPC mit einem Schreiber.
3. Ticket-Regeln: Pool-Größe offline, Ablauf, was im `unranked`-Modus fehlt.
4. Codex-Altbestand: unsignierte „Gründer"-Einträge behalten — ja/nein.
5. Reihenfolge zum Rest: vor oder nach Käfer-Fähigkeiten (Plan B) und den Ballistik-Fusionen.
