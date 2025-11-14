// app/test/page.tsx
'use client';

import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEffect, useState } from 'react';

export default function TestPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dark Mode Test</h1>
      <ThemeToggle />
      <div className="mt-4 p-4 border rounded-lg">
        {mounted && (
          <>
            <p>Current theme: {theme}</p>
            <p>Resolved theme: {resolvedTheme}</p>
          </>
        )}
        <p className="mt-2">This text should change color in dark mode</p>
      </div>
    </div>
  );
}