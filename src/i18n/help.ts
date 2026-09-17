// Owner: i18n (Hilfetexte). LOC ≤ 200.
// Mehrzeilige Spieler-Hilfetexte — getrennt von translations.ts, damit die dortige
// Schlüssel-Wert-Tabelle nicht durch Fließtexte gesprengt wird. Gleiche Paritäts-
// Pflicht wie dort: DE und EN müssen dieselben Keys führen (translations.test.ts).

export const helpTexts = {
  de: {
    'help.greenhouse.toggle': '❓ Hilfe',
    'help.greenhouse': [
      'So kommst du ohne Nektar wieder an Kreuzungen:',
      '1. Aussaat ist kostenlos — der Button „Aussäen“ braucht keinen Samen und kein Geld.',
      '2. Run starten, Start-Duo (Spross + Wurzelmauer) platzieren, so lange überleben wie möglich.',
      '3. Jede angebrochene Welle zählt für ALLE wartenden Kreuzungen gleichzeitig.',
      '4. Ist eine Kreuzung reif, leuchtet ihr Abholen-Knopf im Gewächshaus — antippen sichert das Kind.',
      'Hinweis: Die Reifungs-Queue fasst nur 12 Kreuzungen. Erst abholen, dann neu aussäen!',
    ].join('\n'),
  },
  en: {
    'help.greenhouse.toggle': '❓ Help',
    'help.greenhouse': [
      'How to get back to crosses without any nectar:',
      '1. Sowing is free — the “Sow” button needs no seed and no money.',
      '2. Start a run, place the starter duo (Sprout + Rootwall), survive as long as you can.',
      '3. Every wave reached counts for ALL waiting crosses at the same time.',
      '4. When a cross is mature, its claim button lights up in the greenhouse — tap it to secure the child.',
      'Note: The queue holds only 12 crosses. Claim mature crosses first, then sow again!',
    ].join('\n'),
  },
} as const;

export type HelpKey = keyof typeof helpTexts.de;

export function helpText(key: HelpKey, lang: 'de' | 'en'): string {
  return helpTexts[lang][key];
}
