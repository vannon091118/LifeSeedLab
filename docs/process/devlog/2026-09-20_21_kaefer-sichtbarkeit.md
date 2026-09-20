# Devlog 21 — Die Brutkandidaten sind sich sichtbar verschieden (20.09.2026)

**Dies ist die EINE Zahlenquelle dieser Runde.** Config-Kommentar, `docs/quality/contracts/genome`
(B31), ROADMAP §3 (P-9) und CHANGELOG nennen die Regel und zeigen hierher — sie wiederholen die
Messwerte nicht, damit dieselbe Zahl nicht an fünf Orten lebt.

**Anlass.** Im laufenden Preview (Spieltest-Fläche, Brutstätte) fiel auf: „die Käfer sind sich
massiv ähnlich". Kein Bericht, sondern ein Blick — und der Blick hatte recht, messbar.

## 1. Der Befund, gemessen (48 Bruten = 6 Gründer-Paarungen × 8 Brut-Indizes)

Gemessen wurde der PHÄNOTYP, den die Karte zeichnet (`beetlePhenotypeOf({genome, generation})`,
Zeichenfenster wie `BeetleCanvas`):

| Merkmal | in wie vielen Bruten tragen ALLE DREI Kandidaten denselben Wert |
|---|---|
| Fühlerpaare (2 oder 4) | **48/48 — 100 %** |
| Farbfamilie | 44/48 — 91,7 % |
| Hauptfarbe (Hex) | **43/48 — 89,6 %** |
| Muster | 36/48 — 75 % |
| Flügelteilung | 36/48 — 75 % |
| Körperplan | 37/48 — 77,1 % |
| Haltung | 34/48 — 70,8 % |
| Panzerform | 17/48 — 35,4 % |
| Panzerstruktur | 12/48 — 25 % |
| Panzerkleid | 19/48 — 39,6 % |
| Bewegung | 21/48 — 43,8 % |

Formunterschiede lagen unter der Wahrnehmungsschwelle: die sichtbaren Maße (Elytren-Breite/-Länge,
Kopf, Thorax, Segmente, Beinlänge, Mandibel, Fühler) unterschieden sich im Mittel um **1,06 px**,
der größte Unterschied eines Kandidatenpaars im Mittel um **3,10 px** (Median 2,82) bei 72 px
Zeichenfenster; 11 von 48 Bruten blieben unter 2 px.

Anker (Blatthüpfer × Schildkäfer, alle 8 Brut-Indizes): in **jeder** Brut trugen alle drei
Kandidaten dieselbe Hauptfarbe `#7a492d` und dasselbe Muster `bands`.

## 2. Warum (vier Stellen, im Code belegt)

1. **Farbe**: `bucket(pigmentA, 8 Stufen)` + kleiner Kanalschub — Geschwister tragen fast dasselbe
   `pigmentA` ⇒ derselbe Eimer ⇒ dieselbe Palettenfarbe.
2. **Auch die Gründer**: die Ableitung vor A ergab für **alle drei Gründer `#7a492d`** — die
   dokumentierten Source-Anker (`BEETLES_SOURCE[id].color`: `#86b34a` grün, `#8a7f5e`, `#d9a441`)
   wurden also gar nicht gezeichnet; der Anker war faktisch tot.
3. **Fühler**: `base.antennae > 0.66 ? 4 : 2` — ein fester Schwellwert, den Geschwister immer auf
   derselben Seite treffen.
4. **Silhouette**: die formtragenden Achsen gingen mit Faktoren 0,12–0,2 in die Zeichnung — eine
   Achsendifferenz von 0,05 verschiebt das Bild um 0,3–0,5 px.
5. **Die Suchbedingung der Brut prüfte das Bild nie**: `distinct` vergleicht nur
   `balanceKey(stats)`; das Aussehen musste lediglich die Zwillingsschwelle 0,055 reißen.

## 3. Farbwege, gemessen (kleinster RGB-Abstand im Kandidatentripel, Median über 48 Bruten)

| Variante | Median | „praktisch gleich" | Palette |
|---|---|---|---|
| ohne Streuung (Bestand) | 10,8 | 43/48 Bruten dreimal identisch | — |
| Achse frei gestreut (±0,3) | 24,4 | 66,7 % unter 30 | bleibt Palette, ein Paar Abstand 0 |
| Farbton-Dreh allein (±62) | 31,7 | 50 % unter 30 | kühle Drift, matschige Werte (bis 24 % kühl) |
| **Weg um die Palette + Dreh (eingebaut)** | **34,4** | **43,8 % unter 30, 8,3 % unter 15** | 11,1 % weiter als 40 Stufen von jeder Palettenfarbe |

Warum dieser Weg: die Palette ist ein Kranz aus acht gehegten Farben. Nur der Weg-Index setzt zwei
Geschwister Stadien auseinander, ohne die Palette zu verlassen (kein Matsch, kein Grün); der Dreh
bleibt als kleine Klemme für den Fall, dass zwei Geschwister dieselbe Stufe treffen.

## 4. Die Gründer-Anker: zurückgeholt und gemessen

Der Anker ist ausdrücklich **opt-in**: `beetlePhenotypeOf({…, specimenId})` liefert Generation 1
plus einen Namen, zu dem die Source eine Farbe führt ⇒ die dokumentierte Farbe wird die
Hauptfarbe, Muster/Familie/Musterfarbe bleiben aus dem Genom (ohne Streuung). Ein gezüchtetes Tier
erbt die `specimenId` eines Elternteils, **nie aber dessen Generation** — es streut weiter.

| Gründer | Source-Anker | Ableitung vor A | gestreut (nach A) | jetzt |
|---|---|---|---|---|
| Blatthüpfer | `#86b34a` | `#7a492d` | `#886c40` | **`#86b34a`** |
| Schildkäfer | `#8a7f5e` | `#7a492d` | `#54375f` | **`#8a7f5e`** |
| Hummel | `#d9a441` | `#7a492d` | `#42444a` | **`#d9a441`** |

Schwächstes Gründerpaar (Zeichenfenster 64 px, der Canvas `data-tut="beetle-parent"`): Farbabstand
**30,6 → 55,9 RGB-Stufen** (+83 %), sichtbares Maß 8,16 px.

## 5. Der echte Blickwinkel: Rohpixelanteil überschätzt die Unterscheidbarkeit

Dieselben drei Gründer, echte Canvas-Ausgabe im Browser, einmal in Echtgröße und einmal auf
**16×16** verkleinert (Blickmaßstab):

| | Blatthüpfer↔Schildkäfer | Blatthüpfer↔Hummel | Schildkäfer↔Hummel |
|---|---|---|---|
| gestreut, 64 px | 24,1 % | 17,0 % | 20,4 % |
| Anker, 64 px | 24,2 % | 17,3 % | 20,5 % |
| gestreut, 16×16 | 27,3 % | 19,9 % | 21,1 % |
| Anker, 16×16 | 26,6 % | 19,9 % | 22,3 % |

Die Lehre steht in den Zahlen selbst: der **Pixelanteil bewegt sich fast nicht** (die Silhouetten
sind dieselben — nur die Farbe hat sich geändert), obwohl die Tiere jetzt Grün, Olive und Gold
tragen. Ein Rohpixelanteil von 17–24 % beschreibt also Ähnlichkeit nur grob und hat die
Unterscheidbarkeit zuletzt überschätzt; die tragfähige Größe ist der **Farbabstand** (30,6 → 55,9
beim schwächsten Paar) zusammen mit dem sichtbaren Maß.

## 6. Was gebaut wurde

- `render/beetles`: **Sichtbarkeits-Gewinn** der formtragenden Maße (Elytren 0,2 → 0,46, Länge
  0,4 → 0,85, Kopf 0,14 → 0,32, Thorax 0,16 → 0,38, Segmente 0,16 → 0,38, Beine 0,5 → 0,8,
  Mandibel 0,2 → 0,44, Fühler 0,26 → 0,55) — als `BEETLE_DRAW_GAIN` + `beetleDrawMetrics` an EINER
  Stelle, die Zeichnung UND Messung lesen.
- `genome/beetlePhenotype`: die Farbe wird in `pigmentFor` **zuletzt** abgeleitet (nach allen
  Form-Achsen, dadurch bleiben Deskriptor und Neuheits-Maß bitgleich: Mittel 0,0758 → 0,076) und
  kennt zwei Herkünfte — gestreut für Zucht, Anker für dokumentierte Tiere.
- `config/beetlePhenotype.source`: `BEETLE_PIGMENT_SCATTER { walk: 5, axis: 0,06, hue: 60,
  lightness: 0,08 }`.
- `components/BeetleLab`: Kandidatenkarte mit **Farbfeld** (Panzer- und Musterfarbe) und Stat-Zeile
  als **Abstand zum stärksten Tier der Brut** (`HP 107 −26 · ATK 4 · ×1` gegen `HP 133 · ATK 4 · ×1`);
  die Gründerkarte gibt `specimenId` mit, damit der Anker greift.

## 7. Die gepinnten Untergrenzen (und wie dünn eine davon ist)

`src/render/beetleVisibility.test.ts` (B31) fährt über alle Gründer-Paarungen × 8 Brut-Indizes und
pinnt:

| Pin | Untergrenze | gemessen |
|---|---|---|
| Brut-Silhouette (Median des größten Paarmaßes) | ≥ 5 px | 5,96 px |
| Brut-Silhouette (kein Paar) | ≥ 2 px | 2,21 px |
| Brut-Farbe (kein Tripel mit drei gleichen Farben) | = 0 Tripel | 0 |
| Brut-Farbe (Median des kleinsten Abstands) | ≥ 25 Stufen | 34,4 |
| **Gründer sind dokumentiert** | exakt der Source-Anker | 3/3 Treffer |
| **Gründer-Trio, schwächstes Paar** | Farbe ≥ 50 / Maß ≥ 8 px | **55,9 / 8,16 px** |
| **Schwächstes Kandidatenpaar der Brut (Untergrenze)** | Farbe ≥ 4 / Maß ≥ 0,9 px | **4,6 / 0,90 px** |
| Anker nur für Generation 1 | gezüchtete Tiere tragen keinen Anker | 0 Treffer |
| Determinismus | zweimal identisch | ja |

**Die letzte Zeile ist ausdrücklich dünn**: das ähnlichste Paar einer Brut liegt bei 4,6
RGB-Stufen und 0,90 px — das ist praktisch dasselbe Tier, und zwar im ausgelieferten Spielstand.
Der Pin hält diese Wahrheit fest, statt sie zu schmücken. Die Streuung kann sie nicht schließen,
weil Farbe eine Funktion des Genoms ist; eine Garantie INNERHALB der Brut bräuchte eine
SICHT-Bedingung in der Brut-Suche (Kandidat B der Eigentümer-Frage, **nicht gebaut**).

**Mutationsprüfung** (jede Mutation einzeln eingebaut, dann zurückgenommen):

| Mutation | rote Pins |
|---|---|
| Zeichen-Gewinn entfernt (alte Faktoren) | Brut-Silhouette, **Gründer-Trio**, **schwächstes Paar** |
| Pigment-Streuung entfernt (`walk/axis/hue/lightness = 0`) | Brut-Farbe (drei gleiche Farben), **schwächstes Paar (Farbe 0)** |
| Anker entfernt (`specimenId` ignoriert) | **Gründer-Anker** (`#886c40` statt `#86b34a`), **Gründer-Trio (30,6 < 50)** |

Die Gründer bleiben bei Mutation 2 unverändert — das ist Absicht und belegt die Trennung beider
Herkünfte.

## 8. Ehrliche Grenzen und ein Doku-Konflikt

- **Fühler bleiben in jeder Brut gleich** (48/48): fester Achsen-Schwellwert, Geschwister treffen
  ihn gemeinsam. Ein Bildmerkmal weniger, das die Wahl trägt.
- **8,3 % der Bruten** haben ein Kandidatenpaar unter 15 Stufen, das Minimum liegt bei 4,6 (s. o.).
- **Doku-Konflikt, offen für den Eigentümer:** `BEETLE_PIGMENT_RAMP` sagt „die Brutstätte bleibt
  bewusst warm — kein Pflanzen-Grün", der dokumentierte Anker des Blatthüpfers ist aber grün
  (`#86b34a`). Aufgelöst ist das so: **gezüchtete Tiere** bleiben in der warmen Palette,
  **dokumentierte Gründer** tragen ihren Source-Anker. Wer das anders will, entscheidet über den
  Anker (Quelle: `config/beetles.source`).
- Die **Balance-Frage** von P-9 bleibt offen: die Mutations-Chance mit dem Neuheitsdruck zu koppeln
  bewegt auch die Pflanzenzucht.

## 9. Der Typecheck ist wieder OFFEN — fremder Greenhouse-Umbau repariert (Auftrag des Eigentümers)

Der fremde, halbfertige Umbau von `src/components/Greenhouse.tsx` nach `src/components/greenhouse/*`
hatte den Typecheck gerissen (drei Fehler); auf Auftrag sind sie jetzt behoben — minimal, in der
Formensprache des Umbaus, ohne seine Aufteilung anzutasten:

| Datei | Fehler | Behebung |
|---|---|---|
| `components/greenhouse/PendingQueue.tsx` | `Cannot find name 'TranslationKey'` | Import ergänzt (`import type { TranslationKey } from '../../i18n'`) |
| `components/greenhouse/ResultCard.tsx` | dito | dito |
| `components/greenhouse/SlotBuyButton.tsx` | `(key: string) => string` nimmt den verengten `t` aus `useI18n()` nicht an | Signatur auf `(key: TranslationKey) => string` gezogen — dieselbe wie die fünf Geschwister-Komponenten |

Ergebnis: **`tsc` 0 Fehler**, Suite **578/578**, Gate **0 Fehler / 0 Warnungen** (alle sieben
Prüfungen grün, inklusive Typecheck). Geprüft an der echten Fläche: der Gewächshaus-Bildschirm
rendert vollständig (Elternwahl, Keimlinge, Reifung, Reifungsplatz-Kauf), der Slot-Knopf zeigt
seinen Text korrekt („Buy a ripening slot — 🍯 100 · from wave 3"), Konsole ohne Fehler.

**Wichtig für den Leser dieser Chronik:** dieser Fix liegt im **Arbeitsbaum** und ist **nicht Teil
des Commits dieser Runde**. Die drei korrigierten Dateien gehören zum Umbau eines anderen Threads
(`src/components/greenhouse/*` ist ungetrackt, `Greenhouse.tsx` fremd geändert); sie einzeln zu
veröffentlichen hinterließe verwaiste Komponenten. Der Typecheck-Fix wird also mit dem Umbau
zusammen veröffentlicht — sobald der Eigentümer das entscheidet. Deshalb steht er **nicht** im
CHANGELOG, das laut eigener Maßgabe zusammenfasst, was im Repository (also: in Commits) tatsächlich
passiert ist.

**Offen benannt, nicht angefasst:** der Umbau selbst gehört weiter dem anderen Thread — die
geteilten Fremdänderungen (u. a. `PhenotypeCanvas`, `MainMenu`, `mainMenuStyles`, `beetles.source`,
`.gitignore`, `package.json`, `version.ts`, Devlog-17-Nachträge) bleiben unangetastet und
ungestaged.
