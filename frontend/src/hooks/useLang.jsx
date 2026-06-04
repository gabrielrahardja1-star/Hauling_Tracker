import { createContext, useContext, useState } from 'react';
import { t as translate } from '../lib/i18n';

const LangContext = createContext({ lang: 'id', t: (k) => k, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ht_lang') || 'id');

  function setLang(l) {
    setLangState(l);
    localStorage.setItem('ht_lang', l);
  }

  function t(key) {
    return translate(lang, key);
  }

  return <LangContext.Provider value={{ lang, t, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
