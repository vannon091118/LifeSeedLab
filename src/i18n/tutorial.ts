// Owner: i18n (Onboarding-Dialogtexte). LOC ≤ 200.
// Spielertexte des Krix-Tutorials — getrennt von translations.ts (Schlüssel-Wert-Tabelle) und
// help.ts (Gewächshaus-Hilfe). Gleiche Paritäts-Pflicht: DE und EN führen dieselben Keys
// (tutorial.test.ts). Die Schritt-IDs sind identisch mit `components/tutorial/script.ts` — ein
// Test koppelt beide Listen, damit kein Schritt ohne Text und kein Text ohne Schritt existiert.

export const tutorialTexts = {
  de: {
    'tut.name': 'Krix',
    'tut.role': 'Praktikant · Strich mit Klemmbrett',
    'tut.next': 'Weiter',
    'tut.finish': 'Los, pflanzen!',
    'tut.skip': 'Überspringen',
    'tut.cue': 'HIER DRÜCKEN',
    'tut.more': 'Tippen für den ganzen Text',
    'tut.note': 'Feldnotiz {n}/{m}',
    'tut.ankunft.title': 'Bin da! Nicht erschrecken.',
    'tut.ankunft.text': [
      'Hallo! Ich bin Krix — Praktikant, zweiter Stock, Fensterplatz, direkt neben dem Kompost.',
      'In den Unterlagen stehe ich als „Strich mit Klemmbrett“, aber du darfst Krix sagen. Ich habe das Klemmbrett selbst gemalt.',
      'Ich zeige dir in acht Feldnotizen, wie du eine Welle überstehst, ohne dass das Labor einen Unfallbericht schreiben muss. Am Ende bist du gefährlich kompetent.',
      'Wichtig: Ich friere die Welt ein, solange ich rede. Genieß das — sonst macht das hier niemand.',
    ].join('\n'),
    'tut.karte.title': 'Deine Samenkarten',
    'tut.karte.text': [
      'Unten liegen deine Samen. Jede Karte ist eine Pflanze — keine Karte ist ein Versprechen.',
      'Der Spross schießt. Die Wurzelmauer darf man anrempeln. Beides ist im Feld nützlich, eines davon auch beim Mittagessen.',
      'Tippe jetzt auf die blinkende Karte, dann blinkt gleich etwas Neues. Ich klatsche so lange.',
    ].join('\n'),
    'tut.pflanzen.title': 'Der Geist über dem Feld',
    'tut.pflanzen.text': [
      'Ausgewählt! Über dem Feld schwebt jetzt ein durchsichtiger Umriss — deine Pflanze in der Vorhersehung, kurz bevor sie Papier wird.',
      'Ziel ist eine freie Zelle: nicht auf den Weg, nicht in einen Findling, nicht auf die Kollegin. Umriss grün heißt ja, Umriss rot heißt nein — und ich mache das enttäuschte Gesicht.',
      'Tippe aufs Blattgitter. Die Energie zahlt die Station, nicht du, nicht ich. Niemand fragt nach Belegen.',
    ].join('\n'),
    'tut.welle.title': 'Welle starten',
    'tut.welle.text': [
      'Steht die Pflanze, kommen die Gäste: klein, hungrig, ohne Termin. Sie laufen den Weg entlang auf dein Labor zu.',
      'Drücke den blinkenden Knopf oben rechts — oder warte drei Sekunden, dann startet das Labor die Welle selbst. Das Labor hatte noch nie Geduld.',
      'Mit Klick fühlt es sich nach Können an. Ich empfehle Klick.',
    ].join('\n'),
    'tut.pause.title': 'Pause ist Strategie',
    'tut.pause.text': [
      'Falls es dir zu schnell wird: der Pause-Knopf. Blinkt grad.',
      'Pause heißt nicht Aufgeben, Pause heißt Nachdenken mit Standbild. Probier es aus — ich warte. Ich warte immer.',
    ].join('\n'),
    'tut.weiter.title': 'Und wieder auf',
    'tut.weiter.text': [
      'Ein zweiter Tipp auf denselben Knopf und das Papier atmet weiter. Zeit ist billig, Panik ist teuer.',
      'Wenn du pausierst, während sechs Käfer auf dich zulaufen: professionell. Wenn du dabei telefonierst: beneidenswert.',
    ].join('\n'),
    'tut.chips.title': 'Drei Kästchen, drei Sorgen',
    'tut.chips.text': [
      'Oben links stehen deine drei Wahrheiten:',
      'Tropfen = Energie. Neue Pflanzen kosten Energie. Kein Tropfen, kein Spross, kein Ruhm.',
      'Blatt = Leben. Bei null Leben endet der Lauf und der Kompost gewinnt.',
      'Welle = Fortschritt. Jede angefangene und überlebte Welle bringt dir Nektar fürs Gewächshaus. Nektar ist der gute Stoff — ich bekomme weiterhin nur Lob.',
    ].join('\n'),
    'tut.abschluss.title': 'Feldnotizen voll',
    'tut.abschluss.text': [
      'Das war es von meiner Seite. Du weißt jetzt: Karte tippen, Feld tippen, Welle starten, Pause atmen lassen.',
      'Der Rest wartet im Menü: Gewächshaus für Kreuzungen, Brutstätte für Käfer, Codex für alles, was für immer gilt.',
      'Und wenn du verlierst — kein Drama. Ich habe 47 Läufe verloren und trage trotzdem noch dieses Klemmbrett.',
      'Viel Glück. Ich bin Krix, der Strich, der an dich glaubt.',
    ].join('\n'),
  },
  en: {
    'tut.name': 'Krix',
    'tut.role': 'intern · stick with clipboard',
    'tut.next': 'Next',
    'tut.finish': 'Plant something!',
    'tut.skip': 'Skip',
    'tut.cue': 'PRESS HERE',
    'tut.more': 'Tap for the whole text',
    'tut.note': 'Field note {n}/{m}',
    'tut.ankunft.title': 'Here I am. Don\u2019t panic.',
    'tut.ankunft.text': [
      'Hi! I am Krix — intern, second floor, window seat, right next to the compost.',
      'The paperwork lists me as “stick with clipboard”, but you may call me Krix. I drew the clipboard myself.',
      'I will walk you through surviving a wave in eight field notes, so the lab never has to file an accident report. By the end you will be dangerously competent.',
      'Important: I freeze the world while I talk. Enjoy it — nobody else around here does.',
    ].join('\n'),
    'tut.karte.title': 'Your seed cards',
    'tut.karte.text': [
      'Down there are your seeds. Every card is a plant — no card is a promise.',
      'The sprout shoots. You are allowed to shove the rootwall. Both are useful in the field, one of them also at lunch.',
      'Now tap the blinking card, then something new will blink. I will clap until then.',
    ].join('\n'),
    'tut.pflanzen.title': 'The ghost over the field',
    'tut.pflanzen.text': [
      'Selected! A translucent outline hovers over the field now — that is your plant in foresight, right before it turns to paper.',
      'Aim for a free cell: not the path, not a boulder, not your colleague. Green outline means yes, red outline means no — and I make the disappointed face.',
      'Tap the leaf grid. The station pays the energy, not you, not me. Nobody asks for receipts.',
    ].join('\n'),
    'tut.welle.title': 'Start the wave',
    'tut.welle.text': [
      'The plant is standing, so here come the guests: small, hungry, no appointment. They walk the path straight at your lab.',
      'Press the blinking button up top — or wait three seconds and the lab starts the wave by itself. The lab never had patience.',
      'Clicking feels like skill. I recommend clicking.',
    ].join('\n'),
    'tut.pause.title': 'Pause is strategy',
    'tut.pause.text': [
      'If it gets too fast: the pause button. Blinking right now.',
      'Pause is not surrender, pause is thinking with a freeze-frame. Try it — I will wait. I always wait.',
    ].join('\n'),
    'tut.weiter.title': 'And running again',
    'tut.weiter.text': [
      'A second tap on the same button and the paper breathes on. Time is cheap, panic is expensive.',
      'Pausing while six beetles charge you: professional. Pausing to take a call: enviable.',
    ].join('\n'),
    'tut.chips.title': 'Three boxes, three worries',
    'tut.chips.text': [
      'Top left, your three truths:',
      'Drop = energy. New plants cost energy. No drop, no sprout, no glory.',
      'Leaf = lives. At zero the run ends and the compost wins.',
      'Wave = progress. Every wave you start and survive earns nectar for the greenhouse. Nectar is the good stuff — I still only get praise.',
    ].join('\n'),
    'tut.abschluss.title': 'Field notes full',
    'tut.abschluss.text': [
      'That is all from my side. You now know: tap a card, tap a field, start a wave, let pause breathe.',
      'The rest waits in the menu: greenhouse for crossings, brood chamber for beetles, codex for everything that lasts forever.',
      'And if you lose — no drama. I have lost 47 runs and I am still carrying this clipboard.',
      'Good luck. I am Krix, the stick that believes in you.',
    ].join('\n'),
  },
} as const;

export type TutorialTextKey = keyof typeof tutorialTexts.de;

export function tutorialText(key: TutorialTextKey, lang: 'de' | 'en'): string {
  return tutorialTexts[lang][key];
}
