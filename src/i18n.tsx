import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { MetaSave } from './types';

export type Lang = 'de' | 'en';

const translations = {
  de: {
    // Start screen
    'start.title': 'LifeGameLab',
    'start.subtitle': 'Züchte. Verteidige. Domeiere.',
    'start.tagline': 'PvZ trifft Isaac — deine Kreuzungen sind deine Türme.',
    'start.begin': 'Spiel starten',
    'start.language': 'Sprache',
    'start.hint': 'Alles läuft lokal im Browser. Kein Account nötig.',
    // Main menu
    'menu.title': 'Hauptmenü',
    'menu.nektar': 'Nektar',
    'menu.bestWave': 'Beste Welle',
    'menu.runs': 'Läufe',
    'menu.greenhouse': '🌱 Gewächshaus — Samen mischen',
    'menu.greenhouseDesc': 'Kreuze zwei Pflanzen und entdecke neue Varianten. Kostet Nektar.',
    'menu.endless': '🌊 Endless',
    'menu.endlessDesc': 'Unendliche Wellen, prozedural generiert. Wie weit kommst du?',
    'menu.pvp': '⚔️ PvP-Board',
    'menu.pvpDesc': 'Triff auf geloggte Runs anderer Spieler. Bald verfügbar.',
    'menu.loadout': 'Mitnahme-Loadout',
    'menu.startRun': 'Run starten',
    'menu.collection': 'Sammlung',
    // Breeding
    'breed.title': '🧬 Zucht-Labor',
    'breed.parentA': 'Elternteil A',
    'breed.parentB': 'Elternteil B',
    'breed.cross': 'Kreuzen',
    'breed.cost': 'Kosten',
    'breed.offspring': 'Mögliche Nachkommen',
    'breed.keep': 'Nachkommen behalten',
    'breed.new': 'NEU!',
    'breed.chance': 'Chance',
    'breed.collection': 'Deine Sammlung',
    'breed.needTwo': 'Wähle zwei Elternpflanzen',
    'breed.notEnoughNektar': 'Nicht genug Nektar',
    'breed.generation': 'Generation',
    // Game
    'game.wave': 'Welle',
    'game.waveOf': 'Welle',
    'game.prep': 'VORBEREITUNG — Türme platzieren, dann Welle starten!',
    'game.waveActive': 'Welle',
    'game.enemiesLeft': 'Gegner übrig',
    'game.gameover': 'GAME OVER',
    'game.placing': 'Platzieren:',
    'game.clickGrid': '(Klick aufs Raster)',
    'game.startWave': 'Welle starten',
    'game.exitRun': 'Run beenden',
    'game.reset': 'Zurücksetzen',
    'game.breed': 'Züchten',
    // HUD
    'hud.energy': 'Energie',
    'hud.lives': 'Leben',
    'hud.nektarEarned': 'Nektar verdient',
    // Run over
    'over.title': 'Run beendet',
    'over.waveReached': 'Erreichte Welle',
    'over.nektarEarned': 'Nektar verdient',
    'over.toMenu': 'Zurück zum Menü',
    'over.retry': 'Neuer Run',
    // Debug
    'debug.title': '⚙ Debug',
    'debug.tick': 'Tick',
    'debug.phase': 'Phase',
    'debug.towers': 'Türme',
    'debug.enemies': 'Gegner',
    'debug.projectiles': 'Projektile',
    'debug.spawnQueue': 'Spawn-Warteschlange',
    'debug.variants': 'Varianten',
    'debug.inventory': 'Inventar',
    'debug.activeTowers': 'Aktive Türme',
    // PvP
    'pvp.comingSoon': 'PvP kommt bald — erst Endless meistern!',
    // Common
    'common.close': 'Schließen',
    'common.cancel': 'Abbrechen',
    'common.confirm': 'Bestätigen',
    'common.empty': 'Leer',
  },
  en: {
    'start.title': 'LifeGameLab',
    'start.subtitle': 'Breed. Defend. Dominate.',
    'start.tagline': 'PvZ meets Isaac — your crossings are your towers.',
    'start.begin': 'Start Game',
    'start.language': 'Language',
    'start.hint': 'Everything runs locally in your browser. No account needed.',
    'menu.title': 'Main Menu',
    'menu.nektar': 'Nectar',
    'menu.bestWave': 'Best Wave',
    'menu.runs': 'Runs',
    'menu.greenhouse': '🌱 Greenhouse — Mix Seeds',
    'menu.greenhouseDesc': 'Cross two plants and discover new variants. Costs Nectar.',
    'menu.endless': '🌊 Endless',
    'menu.endlessDesc': 'Infinite procedural waves. How far can you get?',
    'menu.pvp': '⚔️ PvP Board',
    'menu.pvpDesc': 'Face logged runs from other players. Coming soon.',
    'menu.loadout': 'Loadout',
    'menu.startRun': 'Start Run',
    'menu.collection': 'Collection',
    'breed.title': '🧬 Breeding Lab',
    'breed.parentA': 'Parent A',
    'breed.parentB': 'Parent B',
    'breed.cross': 'Cross Breed',
    'breed.cost': 'Cost',
    'breed.offspring': 'Potential Offspring',
    'breed.keep': 'Keep Offspring',
    'breed.new': 'NEW!',
    'breed.chance': 'chance',
    'breed.collection': 'Your Collection',
    'breed.needTwo': 'Pick two parent plants',
    'breed.notEnoughNektar': 'Not enough Nectar',
    'breed.generation': 'Generation',
    'game.wave': 'Wave',
    'game.waveOf': 'Wave',
    'game.prep': 'PREP PHASE — Place towers, then start the wave!',
    'game.waveActive': 'Wave',
    'game.enemiesLeft': 'enemies left',
    'game.gameover': 'GAME OVER',
    'game.placing': 'Placing:',
    'game.clickGrid': '(click grid)',
    'game.startWave': 'Start Wave',
    'game.exitRun': 'Exit Run',
    'game.reset': 'Reset',
    'game.breed': 'Breed',
    'hud.energy': 'Energy',
    'hud.lives': 'Lives',
    'hud.nektarEarned': 'Nectar earned',
    'over.title': 'Run Over',
    'over.waveReached': 'Wave Reached',
    'over.nektarEarned': 'Nectar Earned',
    'over.toMenu': 'Back to Menu',
    'over.retry': 'New Run',
    'debug.title': '⚙ Debug',
    'debug.tick': 'Tick',
    'debug.phase': 'Phase',
    'debug.towers': 'Towers',
    'debug.enemies': 'Enemies',
    'debug.projectiles': 'Projectiles',
    'debug.spawnQueue': 'Spawn Queue',
    'debug.variants': 'Variants',
    'debug.inventory': 'Inventory',
    'debug.activeTowers': 'Active Towers',
    'pvp.comingSoon': 'PvP coming soon — master Endless first!',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.empty': 'Empty',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    // persist into meta save (fire-and-forget, meta.ts avoids circular import)
    import('./meta').then(m => m.updateMeta({ language: l }));
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function detectLangFromMeta(meta: MetaSave | null): Lang {
  if (meta?.language === 'de' || meta?.language === 'en') return meta.language;
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('de')) return 'de';
  return 'en';
}
