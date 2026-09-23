# Ökonomie-Prüfung W1 — Persistente Mauern: kaufen, verbrauchen, verkaufen, wiederholen

**Datum:** 2026-09-23 · **Version:** v0.0.96 · **main:** `d924a17` · **Browser:** QA-Chrome (MCP, echte Maus)
**Frage (aus Nachverifikation v0.0.96, `42151c9`):** Welt persistiert, Inventar füllt sich pro Run —
werden permanente Mauern damit langfristig gratis? Ist das Besitz-Modell ein Ökonomie-Loch?

**Antwort vorausgenommen: NEIN — die Ökonomie schließt exakt.** Kein Gratis-Loop messbar; die
Quelle deckt genau diesen Defekt als abgedeckten Fall („WERKSTOFF wird VERBRAUCHT").

---

## Quellen-Vertrag (READ double, vor der Messung)

| Stelle | Vertrag |
|---|---|
| `meta/economy.ts` → `buyPoolItem` | Nektar → **dauerhafter Besitz** an Material; Preis aus `poolPriceOf` (Source), fail-closed |
| `meta/run.ts` → `applyRunEnd` | Run-Restbestand **ist** der neue Besitz: `counts[id] = Math.max(0, floor(n))` für POOL_KEYS — **WERKSTOFF wird VERBRAUCHT**. Kommentar nennt den Gegenfall: „Das positive Max darunter würde jedes verbaute Tile wieder gutschreiben und Material unendlich machen." Pflanzen (nicht Werkstoff) bleiben beim positiven Max |
| `persistence/worldAutor.ts` | Einziger Schreibpfad zur Welt: spiegelt `TILE_PLACED`/`TILE_REMOVED` aus den Bau-Events — „die Welt erfährt nie etwas, das die Sim abgelehnt hat" |
| `persistence/worldSave.ts` + `storage.ts` | Welt = Key `'world'` im EINEN IDB-Store `'runs'` (kein eigener Store — mein erster Leseversuch ging deshalb ins Leere, Messfehler, kein Defekt) |

## Live-Messung (Kauf → Platzierung → Run-Ende → Verkauf → Run-Ende)

| Schritt | Nektar | Topf-Besitz | Welt-Töpfe | Beleg |
|---|---|---|---|---|
| Start | 222 | **0** | 15 | alles Anfangsmaterial verbraucht |
| Kauf 3 Töpfe (3×15) | 177 | **3** | 15 | Kauf erhöht Besitz, nie die Welt |
| Platzierung 3× im Run | 177 | — | 18 | `inventory.pot` 3→2→1→0; Welt spiegelt sofort |
| Exit Run (Restbestand 0) | 177 | **0** | 18 | **VERBRAUCH bestätigt** — kein Gutschrift-Loop |
| Verkauf Welt-Topf (8,4) im Run | 177 | — | 17 | `Sellmaterial back` → `inventory.pot` 0→1, Tile weg |
| Exit Run (Restbestand 1) | 177 | **1** | 17 | Verkauf = Besitz-Rückgewinn, konsistent |

Die Bilanz schließt zu jedem Zeitpunkt: **Besitz + verbaute Mauern = gekaufte Menge** (plus der
einmaligen Anfangsgabe). Die persistente Welt ist der Speicher verbrauchter Käufe, kein Vermehrer.

## Bewertung: Das Modell ist solide — mit zwei Ecken

1. **Kein Ökonomie-Loch:** Mauern sind ein Kapitalgut mit Einmalkauf; ein Run kann sie verbrauchen
   (durch Neubau), aber nicht vermehren. Die W1-Frage aus der Nachverifikation ist damit
   **beantwortet: gewolltes Modell, sauber gebucht** — der Anfangs-Eindruck „feste Mauern gratis"
   kam daher, dass die 15 Welt-Töpfe bereits verbrauchte Käufe der Vor-Sessions waren.
2. **Ecke 1 — Progressions-Vorsprung (Design, war B1):** Wer einmal eine große Maze gebaut hat,
   startet jeden Folge-Run taktisch fertig — der zweite Run ist stärker als der erste, ohne neuen
   Kauf. Das ist ein legitimes Garden-Statement, verschiebt aber die Balance-Last auf die
   Gegner-Skala (vgl. B2 in der Taktik-Session: 70-HP-Gegner von einer Leihe gehalten).
3. **Ecke 2 — Verkauf ohne Nektar-Rückerstattung:** `Sellmaterial back` gibt das Tile als
   **Besitz** zurück (Material, kein Nektar). Konsistent mit dem Werkstoff-Modell — nur
   festgehalten, weil die Karte „material back" verspricht und genau das hält.

## Methodik-Notiz (Transparenz)

- Erster IDB-Lesefehlschlag („`world`-Store fehlt") war **mein Schema-Irrtum** — die Welt liegt als
  Key im Store `'runs'`, nicht als eigener Store. Aus der Quelle (`storage.ts`, A18.4-Kommentar)
  verifiziert, danach korrekt gemessen.
- `inventory.pot` erscheint im Run-State erst nach erstem Kauf/Kontakt (Schema normalisiert auf
  vorhandene Keys) — kein Verlust, Feld nachweislich 3→0 geführt.

## Status

| ID | Punkt | Status |
|---|---|---|
| W1 | Permanente Mauern gratis? — **NEIN**, Besitz-Modell schließt exakt | erledigt (Bewertung) |
| B1 | Progressions-Vorsprung durch persistente Maze | als Design-Frage übergeben (bleibt offen) |
| E2 | Verkauf gibt Material zurück, keinen Nektar — vertragstreu | erledigt (Beobachtung, kein Fix) |
