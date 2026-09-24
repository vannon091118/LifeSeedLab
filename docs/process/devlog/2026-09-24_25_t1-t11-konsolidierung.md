# Devlog 25 — T1–T11: Fortschritt, Grenzen und die drei Dinge, die kein Test fake-erledigt

**Datum:** 24.09.2026
**Bezug:** `6441333`, `db2323d`, `bbc7208`, `6649b11` sowie die bereits vorhandenen, in diesem Slice verifizierten Commits `6b1d964` und `6ddc9b2`.

## Was gebaut wurde

T1 ist geschlossen: Persistenz unterscheidet `valid`, `missing`, `corrupt` und `failed`; Same-Version-Run-Saves werden zur Laufzeit validiert; Schreibfehler werden nicht mehr verschluckt; Migrationen warten auf den IndexedDB-Schreibabschluss; `RunSaveAutor` serialisiert Save und Clear und verhindert, dass nach Gameover oder Exit ein alter Snapshot zurückkehrt. T2 schließt die Meta-Transaktionen: Preise kommen aus `SEED_PRICE`/`poolPriceOf`, Mengen sind positive ganze Zahlen, und `crossIndex`/`broodIndex` sind uniqueness-geprüft. T3 schließt die World- und Root-Ownership: Welt-Guards prüfen Spawn, Exit, unbekannte Tiles und Grenzen; Vektorwriter sind privat; die ungenutzte `worldSeed`-Wahrheit ist entfernt. T4 erzwingt den Event-Contract in `EventBus.publish()`, bevor Recent-Puffer oder Listener erreicht werden.

T5 ist ebenfalls geschlossen: Grow-/Death-Ghosts tragen ihren Ort, `muzzle_puff` wird emittiert, Wellenbonus und Kill-Belohnung buchen und reisen als dieselbe Zahl zum Zähler, Effekt-Einschläge tragen die Source-Farbe, und ein Flug-Überlauf erzeugt eine ehrliche Ankunft. T8 schließt Hash-Details, Clipboard-Fehlerpfad, DE/EN-Texte, lokale Gerätgrenze und SVG-Glyphen. T9 schließt BFS-Wegprobe und E2E-Lastwache; das Snapshot-/Bibliotheksbudget bleibt ausdrücklich offen.

## Was nicht als erledigt verkauft wurde

T6 ist nicht vollständig geschlossen: P-36 ist eine echte Produktfrage zur Erstplatzierung. Der frühere P-20-Dimmer ist widerlegt, weil der Runtime-Code nur auf `visibilitychange → hidden` reagiert und keinen Mausinaktivitäts-Timer besitzt. T7 braucht eine Balanceentscheidung zu Reward/Score, Saatpreis/Rarität, Brutkosten, Mutation und Wellenkurve. T9 braucht noch eine aktuelle Save-/Bibliotheksmessung. T10 bleibt bis zu einer schriftlichen Owner-Entscheidung über Remote-Sync/Leaderboard gesperrt. T11 bleibt eine externe Sicherheitsaktion: Token widerrufen und neu ausstellen kann der Agent nicht ausführen.

QA-Berichte aus `qa-reports` wurden als Quelle gelesen. Der gezielte Chromium-Single-Run fand dabei einen echten Testhelfer-Vertrag: `CanvasProbe.publish()` erzeugte eine nicht ableitbare `eventId` und ließ `grantedNektar` im Payload aus. Nach Korrektur auf `tick:probe:type:seq` und den vollständigen Reward-Payload laufen die betroffenen 11 Browser-Specs grün. Kein QA-Bericht wird als Code-Bug getarnt, nur weil die Suite grün ist. Das ist die unangenehme, aber richtige Rechnung.
