import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { MetaSave } from './types';
import { translations, type TranslationKey } from './i18n/translations';

export type Lang = 'de' | 'en';
export type { TranslationKey };

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // QA-01: <html lang> folgt der UI-Sprache (Screenreader/Rechtschreibung).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
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
