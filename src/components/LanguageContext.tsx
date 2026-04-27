import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Lang = 'es' | 'en';

interface LanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const Ctx = createContext<LanguageCtx | null>(null);

const STORAGE_KEY = 'qompass.lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    return saved === 'en' || saved === 'es' ? saved : 'es';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState(prev => (prev === 'es' ? 'en' : 'es'));

  return <Ctx.Provider value={{ lang, setLang, toggle }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLanguage must be used within LanguageProvider');
  return v;
}