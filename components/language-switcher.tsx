// components/language-switcher.tsx
'use client';

import { useTranslation } from '@/lib/language-provider';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      aria-label="Toggle language"
    >
      <Globe size={16} />
      <span className="uppercase font-medium">{language}</span>
    </button>
  );
}