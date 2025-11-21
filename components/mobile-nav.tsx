// components/mobile-nav.tsx
'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Cpu, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/agents', label: 'Agents', icon: Cpu },
    { href: '/dashboard/call-history', label: 'Call History', icon: Phone },
  ];

  return (
    <div className="md:hidden fixed bottom-4 right-4 z-50">
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menu */}
      {open && (
        <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)}>
          <div 
            className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}