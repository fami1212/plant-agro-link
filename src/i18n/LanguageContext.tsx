import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fr } from "./translations/fr";
import { en } from "./translations/en";
import { wo } from "./translations/wo";

export type Language = "fr" | "en" | "wo";

type Translations = Record<string, string>;

const translationsMap: Record<Language, Translations> = { fr, en, wo };

export const languageLabels: Record<Language, string> = {
  fr: "Français",
  en: "English",
  wo: "Wolof",
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "fr",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("plantera-language");
    return (saved as Language) || "fr";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("plantera-language", lang);
  };

  const t = (key: string, fallback?: string): string => {
    return translationsMap[language]?.[key] || translationsMap.fr[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
