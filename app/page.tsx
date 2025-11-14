'use client';

import LoginForm from '@/components/LoginForm';
import { useTranslation } from '@/lib/language-provider';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{t.home.title}</h1>
          <p className="text-gray-600">{t.home.subtitle}</p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t.home.noAccount}{' '}
            <a href="mailto:support@yourdomain.com" className="text-blue-600 hover:text-blue-800 font-semibold">
              {t.home.contactUs}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}