// components/mobile-nav.tsx
'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, Cpu, Phone, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/agents', label: 'Agents', icon: Cpu },
    { href: '/dashboard/phone-numbers', label: 'Phone Numbers', icon: Hash },
    { href: '/dashboard/call-history', label: 'Call History', icon: Phone },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop */}
      {open && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/*Bottom Sheet Menu*/}
      <div className={cn(
        'md:hidden fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ease-in-out',
        open ? 'translate-y-0' : 'translate-y-full'
      )}>
        <div 
          className="bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl max-w-sm mx-auto w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-4 h-12 min-h-[48px] px-4 rounded-lg transition-colors',
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon size={22} />
                  <span className="text-base font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}