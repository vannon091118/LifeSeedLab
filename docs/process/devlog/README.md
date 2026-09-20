# Devlog — die Entwicklungsgeschichte, aus Krix' Sicht

> Krix ist der Praktikant, der zugesehen hat. Er war bei jeder QA-Session dabei, hat
> mitgeschrieben, was der DEV-Agent danach gebaut hat — und darf es sagen, wie er will.
> Diese Einträge sind die **dauerhafte** Fassung der QA-Berichte: Was gemeldet wurde,
> was daraus wurde, was offen blieb. Die Rohberichte werden nach der Überführung
> gelöscht (siehe „Der normale Ablauf" unten); was noch offen ist, steht zusätzlich in
> [`docs/process/ROADMAP.md`](../ROADMAP.md) §3 „Bekannte Probleme".

## Der normale Ablauf (bindend)

1. **Abholen.** `git fetch origin qa-reports` → neue Berichte unter `qa/` lesen, Status im
   Bericht setzen (`in-arbeit`), dann erst den Task beginnen (AGENTS.md).
2. **Umsetzen.** Befunde gegen den echten Code prüfen, echte Lücken beheben, Design-Fragen
   stellen statt erfinden. Erledigtes wird in den Domänen-Contracts vermerkt.
3. **Überführen.** Je abgeschlossenem Bericht **ein** Devlog-Eintrag (dieses Verzeichnis):
   Datum, Version/Commit, Befunde, was der DEV gebaut hat (mit Beleg), was offen blieb.
   Offene Punkte wandern **zusätzlich** in die ROADMAP unter „Bekannte Probleme".
4. **Aufräumen.** Der konsolidierte Bericht wird von `qa/` **entfernt** — eine Wahrheit,
   nicht zwei. Der Devlog trägt die Historie, die Roadmap die Arbeit, der Contract die Regel.
5. **Erst dann** Commit/Push über Shinon.

**Formatregel:** gleiche Anatomie, nie gleiches Layout. Jeder Eintrag hat eine Datumszeile,
die Befunde, die Folgen und einen Schlusssatz von Krix — aber Reihenfolge, Mittel (Tabelle,
Zitat, Fließtext, Randnotiz) und Länge wechseln. Wiedererkennbar ja, Schablone nein.

**Schreibzeitpunkt (ehrlich):** Die Datumszeile nennt den **Tag des Berichts**, nicht den Tag
an dem Krix tippt. Ein Eintrag entsteht bei der Konsolidierung — also nach dem Bericht, oft am
selben Abend wie mehrere andere. Was später passiert ist als der Bericht, steht als eigener
Absatz mit eigenem Datum (siehe Eintrag 04, „Nachtrag 20.09."). Kein Eintrag behauptet,
live geschrieben zu sein.

**Zahlen (bindend):** Jede Zahl im Devlog ist ein **Messwert aus dem genannten Bau** oder aus
dem Code — nie aus dem Gedächtnis fortgeschrieben. Zwei Zahlen für dasselbe Faktum sind ein
Defekt: wer eine Messung wiederholt, nennt die **Messmenge** (welche Eingaben, wie viele Fälle)
und korrigiert die alte Stelle, statt eine neue Wahrheit daneben zu legen.

## Chronologie

| # | Session | Bericht | Was draus wurde |
|---|---|---|---|
| 01 | 17.09.2026 | [Onboarding-Runde 1](2026-09-17_01_onboarding-runde-1.md) | Q1–Q5 behoben |
| 02 | 17.09.2026 | [Greenhouse-Crash mit Alt-Save](2026-09-17_02_greenhouse-crash-altsave.md) | Q6 behoben (Heilung bei jedem Load) |
| 03 | 17.09.2026 | [Runde 2: Weg-Lenkung](2026-09-17_03_runde-2-weg-lenkung.md) | Q7/Q8 überholt vom Tile-Routen-Neubau |
| 04 | 17.09.2026 | [Mobile 390×844](2026-09-17_04_mobile-390x844.md) | Q10 am 20.09. geschlossen; Q9/Q11 offen |
| 05 | 17.09.2026 | [Leih-Spross erreicht den Tray nicht](2026-09-17_05_leih-spross-tray.md) | Q12/Q19 behoben (Run-Loadout + Stats) |
| 06 | 17.09.2026 | [Spielfluss-Audit](2026-09-17_06_spielfluss-audit.md) | F1–F4 behoben (F2 über F5) |
| 07 | 17.09.2026 | [Status-Abgleich v0.0.42](2026-09-17_07_status-v0042.md) | Q6/Q12 verifiziert; Q13 widerlegt, Q14 behoben |
| 08 | 17.09.2026 | [Verifikation v0.0.47](2026-09-17_08_verifikation-v0047.md) | Q13 widerlegt, Q1/Q2 bestätigt, R1 → Neubau |
| 09 | 18.09.2026 | [F2-Regression (F5)](2026-09-18_09_f5-f2-regression.md) | F5/F6 behoben (Blase im Cue-Modus) |
| 10 | 18.09.2026 | [Verifikation II](2026-09-18_10_verifikation-ii.md) | Q6 verhaltens-verifiziert; Resume-Ökonomie → III |
| 11 | 18.09.2026 | [R1-Formalisierung + Map-Builder](2026-09-18_11_r1-formalisierung.md) | R1 behoben (Route aus Tile-Geometrie) |
| 12 | 18.09.2026 | [Wirksamkeits-Check](2026-09-18_12_wirksamkeits-check.md) | N4 als eigener Befund etabliert, dann behoben |
| 13 | 18.09.2026 | [Verifikation III: Resume-Ökonomie](2026-09-18_13_verifikation-iii.md) | Beobachtung A widerlegt; Messhygiene-Regel |
| 14 | 18.09.2026 | [Verifikation IV: Runde 3](2026-09-18_14_verifikation-iv.md) | F6 3/3, Q16/Q17 als Befunde geschärft |
| 15 | 18.09.2026 | [Verifikation V: Q16/Q17](2026-09-18_15_verifikation-v.md) | Q16 3/3; Phantom-Energiespur aufgelöst |
| 16 | 18.09.2026 | [Verifikation VI: Q17/Q18](2026-09-18_16_verifikation-vi.md) | Q17 3/3, Q18 entkräftet, Fix-Richtung geliefert |
| 17 | 18.09.2026 | [Nachverifikation 63222e5](2026-09-18_17_nachverifikation-63222e5.md) | N4/F5/F6/Q16/Q17 im Spiel bestätigt |
| 18 | 18.09.2026 | [Taktik-Session Mazing](2026-09-18_18_taktik-session-mazing.md) | T1 behoben (Diagonale/echte Geometrie); T2 überholt, T3 offen |
| 19 | 20.09.2026 | [Spieltest-Session v0.0.71](2026-09-20_19_spieltest-session.md) | Geist sagt die Weg-Wahrheit + Tray per Tastatur bedienbar; Balance/Dimmen/Textmenge offen (P-18…P-22) |
| 20 | 20.09.2026 | [ROADMAP-Mobile-Runde](2026-09-20_20_roadmap-mobile.md) | P-2 behoben (Top-Bar bricht um), P-24 mobil widerlegt, P-10 ohne Überlauf, P-14 gepinnt, P-25 neu; Blocker gelöst: Experimente in Quarantäne, Gate OFFEN |
| 21 | 20.09.2026 | [Käfer-Sichtbarkeit](2026-09-20_21_kaefer-sichtbarkeit.md) | Brutkandidaten sind sichtbar verschieden (Median 15,7 % Pixel, vorher 89,6 % gleiche Farbe): Sichtbarkeits-Gewinn der Zeichenmaße + Pigment-Weg um die Palette, Karte mit Farbfeld und Stat-Deltas; Grenze und offene Balance-Frage benannt |

Die frühen Runden 01–05 lagen zuletzt unter `qa/archiv/`; sie stehen hier, weil ein Archiv
nichts ist, was man zweimal liest. Berichte der externen Spieltest-Reihe (19.09.2026,
`v0.0.36`–`v0.0.55`, HTML auf dem Eigentümer-Rechner) sind inhaltlich in die Abschnitte
„QA-Abgleich" der Domänen-Contracts und in die ROADMAP eingegangen; sie liegen außerhalb
des Repos und werden dort nicht angetastet.
