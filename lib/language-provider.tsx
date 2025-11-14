// lib/language-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Language, translations } from './translations';

type TranslationType = typeof translations.en;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationType;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('app-language') as Language | null;
    if (savedLang && (savedLang === 'en' || savedLang === 'fr')) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Persist language preference
    localStorage.setItem('app-language', language);
    document.cookie = `app-language=${language}; path=/; max-age=31536000`;
  }, [language, mounted]);

  // ✅ FIXED: Type assertion here
  const t = translations[language] as TranslationType;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}