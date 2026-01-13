//components/theme-toggle.tsx
'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="w-10 h-10 rounded-lg flex items-center justify-center opacity-50 cursor-pointer">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${theme === 'dark' ? 'opacity-0' : 'opacity-100'}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  );
}