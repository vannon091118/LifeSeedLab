# Die Leihgabe, die niemand ausleihen konnte

`2026-09-17` · Bericht: *Q12 — Leih-Spross erreicht das Spielfeld nicht* · Version **v0.0.38** (`ae64493`), Release-Fläche

Der Einstiegs-Loop dieser Version ist eine hübsche Idee: Der neue Spieler hat nichts,
Krix leiht ihm einen Spross, damit die ersten Minuten nicht leer sind. Die Meta-Seite war
gebaut und unit-getestet. Der Spieler trotzdem ohne Pflanze.

**Drei Zyklen, drei Mal dasselbe Bild:**

| Zyklus | Tray zeigt die Leihe | `inventory` | `loadout` |
|---|---|---|---|
| 1 | nein | `{}` | `[]` |
| 2 | nein | `{}` | `[]` |
| 3 | nein | `{}` | `[]` |

Die Bruchstelle war kein Rechenfehler, sondern ein fehlender Weg: `beginRun()` bucht die
Leihe in `variantCounts` — aber nicht ins **Loadout**. Und die Tray baut ihre Karten aus
Loadout und Inventar. Eine Variante mit eigener ID, die nur im Besitz steht, hat keinen
Slot. Einziger Pflanzenweg im Run war der Nachkauf für 100 Energie — womit die
Startökonomie („genau ein Samen für 40 Nektar") umgangen wurde.

> Das ist derselbe blinde Fleck wie beim Gewächshaus-Crash: Die Tests prüfen die
> Meta-Logik, nie den Render-Pfad von dort ins Feld. Q12 empfahl dem DEV ausdrücklich
> einen Test über `beginRun` → Run-Mount → Tray-Karten.

## Was daraus wurde

Die Leihe reist jetzt mit: Der **Run-Loadout** trägt die Leih-ID (das Meta-Loadout bleibt
sauber), die Variante hängt an den Run-`savedVariants`, und ihre Stats liegen als
Run-`bredStats` bei — sonst lehnt die Sim mit `no_inventory` ab. Damit hatte Krix' Notiz-4-
Ziel („tippe die blinkende Karte") wieder eine Karte zum Blinken.

Zwei Folgebeobachtungen aus derselben Familie sind später mitgeheilt worden:

- **Roh-ID als Label** (Q14/N3): Die Leihe-Karte zeigte `loan_sprout×0` im Klartext. Jetzt
  löst die Tray Labels über i18n und den Bibliotheksnamen auf.
- **Karte verschwindet bei ×0** (N2/Q19): Basis-Karten blieben mit „×0 + Nachkauf", die
  Leihe war bei leerem Bestand ganz weg. Da die Kartenliste jetzt aus Source ∩ Loadout
  gebaut wird, bleibt sie stehen — und ist als ×0-Karte echt deaktiviert (Q17, Eintrag 16).

## Krix, mit einer Frage, die offen bleibt

Ich habe damals nicht verstanden, warum das nicht aufgefallen ist. Heute verstehe ich es:
Ein Feature, das zwei Schichten tief funktioniert, sieht in jedem Test grün aus. Der Bruch
liegt immer in der Naht — und Nähte testet man nicht, man *spielt* sie.

Offen blieb aus dieser Runde nur, was über Q12 hinausging: die Startökonomie selbst.
