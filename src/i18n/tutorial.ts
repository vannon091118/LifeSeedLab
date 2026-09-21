// Owner: i18n (Onboarding-Dialogtexte). LOC ≤ 200.
// Spielertexte des Krix-Tutorials — getrennt von translations.ts (Schlüssel-Wert-Tabelle) und
// help.ts (Gewächshaus-Hilfe). Gleiche Paritäts-Pflicht: DE und EN führen dieselben Keys
// (i18n_texts.test.ts). Die Schritt-IDs sind identisch mit `components/tutorial/script.ts` — ein
// Test koppelt beide Listen, damit kein Schritt ohne Text und kein Text ohne Schritt existiert.
//
// B43 (19.09.2026): Die Texte wurden auf das AKTUELLE Spiel umgeschrieben. Sie erklärten vorher
// einen Ablauf, den es nicht mehr gibt („Energie", „Material aus ..."), und Krix redete wie ein
// Formular. Was jetzt drinsteht, ist das echte System: die Karte ist BESITZ und überlebt den Lauf,
// der Lauf BEGINNT in der Bauphase, Nektar wird NUR AUSSERHALB ausgegeben, Samen/Tiles/Deko sind
// getrennte Vorrats-Pools, und es gibt keine Energie.
// Ton: ironisch, sarkastisch, zynisch — aber persönlich. Krix ist nicht das Tutorial, Krix ist
// der Charakter: Praktikant, zweiter Stock, Fensterplatz neben dem Kompost, 47 verlorene Läufe,
// selbst gemaltes Klemmbrett. Kein „Du kannst jetzt …", kein Marketing.

export const tutorialTexts = {
  de: {
    'tut.name': 'Krix',
    'tut.role': 'Praktikant · Strich mit Klemmbrett',
    'tut.next': 'Weiter',
    'tut.finish': 'Ans Beet',
    'tut.skip': 'Überspringen',
    'tut.cue': 'HIER DRÜCKEN',
    'tut.cueHint': 'Drück auf das Blinkende',
    'tut.more': 'Tippen für den ganzen Text',
    'tut.note': 'Feldnotiz {n}/{m}',
    'tut.ankunft.title': 'Krix. Zweiter Stock. Bin da.',
    'tut.ankunft.text': [
      'Hallo. Krix. Praktikant, zweiter Stock, Fensterplatz direkt neben dem Kompost — der Geruch ist Teil der Einarbeitung. Im Personalbogen stehe ich als „Strich mit Klemmbrett". Das Klemmbrett habe ich selbst gemalt. Der Strich bin ich.',
      'Ich erkläre dir hier nichts von der Stange. Ich erkläre dir DIESES Labor: wie du dir ein Beet baust, wie du Nektar verdienst und wie du ihn ausgibst — und wann du ihn ausdrücklich NICHT ausgeben kannst.',
      'Erster Handgriff: unten hängt die Sprache. Deutsch oder Englisch. Nimm die, in der du deine späteren Fehlentscheidungen bereuen möchtest.',
      'Und noch was, persönlich: Während ich rede, steht das Labor. Du verpasst also nichts, während ich dich volllabere. Das ist das einzige Mal, dass ich dir Zeit schenke.',
    ].join('\n'),
    'tut.startknopf.title': 'Und da hinein',
    'tut.startknopf.text': [
      'Sprache steht. Jetzt der große Knopf: „Spiel starten". Dahinter liegt nicht das Beet, sondern der Flur.',
      'Gewöhn dich dran, dass hier alles einen Umweg hat. Das ist kein Designfehler, das ist Verwaltung. Ich habe zwei Wochen gebraucht, um zu merken, dass der Kaffee im Erdgeschoss steht.',
      'Drück drauf. Ich komme mit. Ich komme immer mit — das ist die eine Zeile in meinem Vertrag, die sie nicht gestrichen haben.',
    ].join('\n'),
    'tut.labor.title': 'Der Flur — hier wird bezahlt',
    'tut.labor.text': [
      'Willkommen im Flur. Sechs Kärtchen, sechs Zuständigkeiten. Ich kann sie auswendig — im Gegensatz zu den Sicherheitsvorschriften, die hängen schief und niemand hat sie je gelesen.',
      'Wichtig für dein Konto: Nektar gibst du NUR HIER AUS. Im Beet verdienst du ihn, im Flur wird er ausgegeben. Zwei getrennte Räume, wie Kasse und Lager. Ich habe drei Monate gedacht, das sei ein Vorschlag.',
      'Gewächshaus: Samen aussäen und kreuzen — da entstehen deine Pflanzen. Shop: drei Regale, sauber getrennt — Samen für die Zucht, Tiles und Deko für DEIN Beet. Kein Glücksspiel, du kaufst, was du willst. Brutstätte: Käfer, die für dich rempeln. Codex: jede Kreuzung, die du je gemacht hast, mit Namen und für immer.',
      'Und der Knopf, mit dem alles anfängt: „Endlos". Da steht DEIN Beet. Nicht meins, nicht das des Praktikanten vor dir. Deins. Das bleibt da, auch wenn du gehst.',
      'Bestwert, Läufe, Sammlung stehen oben. Diese Zahlen schmeicheln nie. Endlich etwas Ehrliches in diesem Haus.',
    ].join('\n'),
    'tut.karte.title': 'Deine Samenkarten',
    'tut.karte.text': [
      'Unten liegen deine Samen — erinnere dich: Samen, Tiles und Deko sind drei getrennte Vorräte. Verbraucht ist verbraucht, und Samen kauft man im Flur, nicht im Beet.',
      'Jede Karte ist eine Pflanze. Keine Karte ist ein Versprechen. Der Spross schießt, die Wurzelmauer darf man anrempeln, das Myzel heilt im Stehen — drei Charaktere, ein Beet.',
      'Tippe jetzt auf die blinkende Karte. Danach blinkt etwas Größeres, und ich klatsche weiter, bis du mich bittest, damit aufzuhören.',
    ].join('\n'),
    'tut.pflanzen.title': 'Der Geist über dem Beet',
    'tut.pflanzen.text': [
      'Ausgewählt. Über dem Beet schwebt jetzt ein durchsichtiger Umriss — deine Pflanze kurz vor der Papierwerdung. Ich finde das ehrlich gesagt unheimlich, aber es hilft.',
      'Ziel ist eine freie Zelle: nicht auf ein Tile, nicht in einen Topf, nicht in deine Nachbarpflanze. Grüner Umriss heißt ja, roter heißt nein — und ich mache dabei das enttäuschte Gesicht, das habe ich trainiert.',
      'Und der Unterschied zu jedem anderen Beet, das du kennst: Hier liegt kein Weg, den dir jemand vorgezeichnet hat. Die Biester suchen sich ihren Weg selbst — du baust, was ihnen im Weg steht. Der Umriss entscheidet also nicht nur, WO etwas steht, sondern wie sie später laufen.',
    ].join('\n'),
    'tut.bau.title': 'Die Bauphase — dein Beet, deine Regeln',
    'tut.bau.text': [
      'Jetzt der Teil, den sie in der Einarbeitung falsch erklärt hatten: Der Lauf beginnt MIT DEM BAUEN, nicht mit der ersten Welle. Keine Uhr, kein Gegner, keine Eile. Das Beet gehört dir, bis du sagst, dass es fertig ist.',
      'Was du baust, bleibt: Tiles und Deko sind Besitz. Der nächste Lauf startet auf genau dieser Karte — mit allem, was du heute hingestellt hast. Deshalb heißt es nicht „Level", sondern „dein Beet".',
      'Und der eigentliche Trick: Die Käfer suchen sich immer den schnellsten freien Weg. Du fängst sie nicht mit Wänden, du schickst sie auf Umwege. Jedes Tile, das du setzt, ist eine Aussage darüber, wie blöd sie laufen sollen.',
      'Fertig? Dann zwei Wege hinaus: oben „Welle starten" — sofort, ohne Vorwarnung, sehr nach mir. Daneben „Bauen beenden" — kurz durchatmen, Countdown, dann Welle. Beides ist richtig. Nur nicht dasselbe.',
    ].join('\n'),
    'tut.welle.title': 'Welle — die Gäste',
    'tut.welle.text': [
      'Die Pflanze steht, also kommen die Gäste: klein, hungrig, ohne Termin, ohne Manieren. Sie laufen den Weg, den dein Beet ihnen lässt — jeder Umweg ist gewonnene Zeit für deine Pflanzen.',
      'Drück den blinkenden Knopf oben rechts. Oder wart drei Sekunden, dann startet das Labor die Welle von selbst. Das Labor hatte noch nie Geduld, und ich habe noch nie jemanden getroffen, der das gut fand.',
      'Mit Klick fühlt es sich nach Können an. Nimm den Klick.',
    ].join('\n'),
    'tut.pause.title': 'Pause ist Strategie',
    'tut.pause.text': [
      'Falls es zu schnell wird: der Pause-Knopf. Er blinkt gerade, sehr auffordernd.',
      'Pause heißt hier nicht Aufgeben. Pause heißt Nachdenken mit Standbild. Ich mache das in Besprechungen auch — die nennen das dann „stille Teilhabe".',
    ].join('\n'),
    'tut.weiter.title': 'Und wieder auf',
    'tut.weiter.text': [
      'Ein zweiter Tipp auf denselben Knopf und die Zeit läuft weiter. Zeit ist billig, Panik ist teuer, und beides zahlt am Ende deine Pflanze.',
      'Wenn du pausierst, während sechs Käfer auf dich zuhalten: professionell. Wenn du dabei Kaffee holst: beneidenswert. Der steht im Erdgeschoss, ich habe es geprüft.',
    ].join('\n'),
    'tut.chips.title': 'Drei Kästchen, drei Sorgen',
    'tut.chips.text': [
      'Oben links stehen deine drei Wahrheiten — und KEINE davon ist Energie, auch wenn sie dir das im Vorstellungsgespräch anders erzählt haben:',
      'Blatt = Leben. Bei null ist der Lauf vorbei, der Kompost gewinnt, und ich schreibe es in die Statistik.',
      'Welle = Fortschritt. Jede überlebte Welle bringt dir Nektar — die einzige Währung, die hier zählt, und du gibst sie ausschließlich im Flur aus.',
      'Laufweg = dein Zeugnis. Dort stehen die Felder, die sie wirklich gehen, und daneben das Minimum. Je weiter die zwei auseinanderliegen, desto länger stehen sie unter Beschuss. Liegt der Wert am Minimum, liegt es nicht am Beet. Es liegt an dir. Ich sage das so direkt, weil ich es muss.',
    ].join('\n'),
    'tut.abschluss.title': 'Feldnotizen voll',
    'tut.abschluss.text': [
      'Das war es von meiner Seite. Du weißt jetzt: Beet bauen, Samen setzen, Welle starten, Umwege legen, Pause atmen lassen. Der Rest ist Übung und schlechte Laune.',
      'Und jetzt das Persönliche, zwischen uns: Diese Pflanze in deiner Hand ist eine LEIHGABE. Meine, um genau zu sein. Sie läuft diesen Lauf mit dir und geht danach zurück ins Regal. Nicht aus Geiz — aus Verwaltungslogik. Ich habe sie unterschrieben, also kann ich sie nicht verschenken.',
      'Dein Teil: Überlebe Wellen, sammle Nektar, geh in den Flur in den Shop und kauf dir einen EIGENEN Samen. Der Keimling wartet im Gewächshaus, du setzt ihn in einen Topf, und was daraus wächst, ist DEINS. Für immer. Auch nach dem nächsten Lauf.',
      'Ab dann dreht sich das von allein: Lauf spielen → Nektar → Samen → Topf → eigene Pflanze → nächstes Beet. Jede Runde wird dein Beet größer, weil du es mit Nektar ausbaust. Nicht das Spiel wächst. Du wächst.',
      'Und wenn du verlierst: kein Drama. Ich habe 47 Läufe verloren, drei Tassen zerschlagen und stehe trotzdem hier, mit dem selbst gemalten Klemmbrett. Verlieren ist Personalvorgang, nicht Entlassung.',
      'Viel Glück. Ich bin Krix, der Strich, der an dich glaubt — und ich glaube an jeden, der einmal zugehört hat.',
    ].join('\n'),
  },
  en: {
    'tut.name': 'Krix',
    'tut.role': 'intern · stick with clipboard',
    'tut.next': 'Next',
    'tut.finish': 'To the bed',
    'tut.skip': 'Skip',
    'tut.cue': 'PRESS HERE',
    'tut.cueHint': 'Tap the blinking target',
    'tut.more': 'Tap for the whole text',
    'tut.note': 'Field note {n}/{m}',
    'tut.ankunft.title': 'Krix. Second floor. Reporting in.',
    'tut.ankunft.text': [
      'Hello. Krix. Intern, second floor, window seat right next to the compost — the smell is part of your onboarding. The personnel file lists me as “stick with clipboard”. I drew the clipboard myself. The stick is me.',
      'I am not going to explain some generic game to you. I will explain THIS lab: how you build yourself a bed, how you earn nectar, how you spend it — and when you explicitly cannot spend it.',
      'First move: the language hangs below. German or English. Pick the one you want to regret your decisions in later.',
      'And one personal thing: while I talk, the lab stands still. You miss nothing while I talk at you. That is the only time I will ever give you time.',
    ].join('\n'),
    'tut.startknopf.title': 'And in through here',
    'tut.startknopf.text': [
      'Language set. Now the big button: “Start Game”. Behind it lies a corridor, not a garden bed.',
      'Get used to everything here taking a detour. That is not a bug, that is administration. It took me two weeks to notice the coffee is on the ground floor.',
      'Press it. I am coming along. I always come along — that is the one line in my contract they did not strike.',
    ].join('\n'),
    'tut.labor.title': 'The corridor — where things get paid for',
    'tut.labor.text': [
      'Welcome to the corridor. Six cards, six responsibilities. I know them by heart — unlike the safety regulations, which hang crooked and nobody ever read.',
      'Important for your account: you spend nectar ONLY HERE. In the bed you earn it, in the corridor it goes out. Two separate rooms, like till and stockroom. For three months I thought that was a suggestion.',
      'Greenhouse: sow and cross seeds — that is where your plants come from. Shop: three shelves, cleanly separated — seeds for breeding, tiles and decor for YOUR bed. No gambling, you buy precisely what you want. Brood chamber: beetles that do the shoving for you. Codex: every cross you ever made, named, forever.',
      'And the button where everything starts: “Endless”. That is YOUR bed in there. Not mine, not the intern before you. Yours. And it stays there after you leave.',
      'Best wave, runs, collection sit up top. Those numbers never flatter. Finally something honest in this building.',
    ].join('\n'),
    'tut.karte.title': 'Your seed cards',
    'tut.karte.text': [
      'Down there are your seeds — remember: seeds, tiles and decor are three separate stocks. Spent is spent, and seeds are bought in the corridor, not in the bed.',
      'Every card is a plant. No card is a promise. The sprout shoots, the rootwall is made to be shoved, the mycelium heals while standing — three characters, one bed.',
      'Now tap the blinking card. Then something bigger will blink, and I will keep clapping until you tell me to stop.',
    ].join('\n'),
    'tut.pflanzen.title': 'The ghost over the bed',
    'tut.pflanzen.text': [
      'Selected. A translucent outline now hovers over the bed — your plant right before it turns to paper. Honestly, I find it unsettling. It helps anyway.',
      'Aim for a free cell: not a tile, not a pot, not your neighbouring plant. Green outline means yes, red means no — and I make the disappointed face, I practised it.',
      'And the difference to every other bed you know: you are not building on a finished path here. You build the path. The outline decides where something stands AND how the little brutes will walk later.',
    ].join('\n'),
    'tut.bau.title': 'The build phase — your bed, your rules',
    'tut.bau.text': [
      'This is the part my induction got wrong: the run BEGINS WITH BUILDING, not with the first wave. No clock, no enemies, no rush. The bed is yours until you say it is done.',
      'What you build stays: tiles and decor are property. The next run starts on exactly this map — with everything you put down today. That is why it is not a “level”, it is your bed.',
      'And the real trick: the crawlers always take the fastest free route. You do not stop them with walls, you send them the long way. Every tile you place is a statement about how stupidly they should walk.',
      'Done? Then two ways out: “Start wave” up top — immediately, no warning, very much like me. Next to it “Finish building” — breathe, countdown, then wave. Both are right. They are not the same.',
    ].join('\n'),
    'tut.welle.title': 'Wave — the guests',
    'tut.welle.text': [
      'The plant is standing, so here come the guests: small, hungry, no appointment, no manners. They walk the route YOU built — every detour is time your plants get to shoot.',
      'Press the blinking button up top right. Or wait three seconds and the lab starts the wave itself. The lab never had patience, and I never met anyone who liked that.',
      'Clicking feels like skill. Take the click.',
    ].join('\n'),
    'tut.pause.title': 'Pause is strategy',
    'tut.pause.text': [
      'If it gets too fast: the pause button. It is blinking right now, very insistently.',
      'Pause here is not surrender. Pause is thinking with a freeze-frame. I do the same in meetings — they call it “quiet participation”.',
    ].join('\n'),
    'tut.weiter.title': 'And running again',
    'tut.weiter.text': [
      'A second tap on the same button and time moves on. Time is cheap, panic is expensive, and your plant pays for both.',
      'Pausing while six crawlers charge you: professional. Getting coffee while doing it: enviable. It is on the ground floor, I checked.',
    ].join('\n'),
    'tut.chips.title': 'Three boxes, three worries',
    'tut.chips.text': [
      'Top left, your three truths — and NONE of them is energy, whatever they told you in the interview:',
      'Leaf = lives. At zero the run is over, the compost wins, and I write it into the statistics.',
      'Wave = progress. Every survived wave earns nectar — the only currency that counts here, and you spend it exclusively in the corridor.',
      'Path length = your report card. It counts the tiles they actually walk, next to the minimum. The wider those two drift apart, the longer they stand under fire. If the number sits at the minimum, it is not the bed. It is you. I say that bluntly because I have to.',
    ].join('\n'),
    'tut.abschluss.title': 'Field notes full',
    'tut.abschluss.text': [
      'That is all from my side. You now know: build the bed, set a seed, start the wave, lay the detours, let pause breathe. The rest is practice and bad temper.',
      'And now the personal part, between us: this plant in your hand is a LOAN. Mine, precisely. It plays this run with you and goes back on the shelf afterwards. Not out of stinginess — administrative logic. I signed for it, so I cannot give it away.',
      'Your part: survive waves, collect nectar, go to the corridor, into the shop, and buy your OWN seed. The seedling waits in the greenhouse, you drop it into a pot, and what grows there is YOURS. Forever. Even after the next run.',
      'From then on it turns by itself: play a run → nectar → seed → pot → own plant → next bed. Every run makes your bed bigger, because you expand it with nectar. The game does not grow. You do.',
      'And if you lose: no drama. I lost 47 runs, broke three mugs, and I am still standing here with my self-drawn clipboard. Losing is a personnel matter, not a dismissal.',
      'Good luck. I am Krix, the stick that believes in you — and I believe in anyone who listened once.',
    ].join('\n'),
  },
} as const;

export type TutorialTextKey = keyof typeof tutorialTexts.de;

export function tutorialText(key: TutorialTextKey, lang: 'de' | 'en'): string {
  return tutorialTexts[lang][key];
}
