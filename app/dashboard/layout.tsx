// app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import MinutesCounter from '@/components/MinutesCounter';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileNav } from '@/components/mobile-nav';
import { StripeBanner } from '@/components/StripeBanner';
import { Footer } from '@/components/Footer';
import {
  LayoutDashboard,
  Cpu,
  Phone,
  LogOut,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRealtimeMinutes, useRealtimeCallHistory, useRealtimeAgents } from '@/hooks/useRealtimeSubscriptions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser, loading, setLoading } = useAuthStore();
  const pathname = usePathname();

  // ✅ GLOBAL REAL-TIME SUBSCRIPTIONS - Set up once in layout for all pages
  useRealtimeMinutes(user?.id);
  useRealtimeCallHistory(user?.id);
  useRealtimeAgents(user?.id);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setUser, setLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/agents', label: 'Agents', icon: Cpu },
    { href: '/dashboard/phone-numbers', label: 'Phone Numbers', icon: Hash },
    { href: '/dashboard/call-history', label: 'Call History', icon: Phone },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Stripe Payment Banner - ALWAYS VISIBLE */}
      <StripeBanner />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/apple-touch-icon.png"
              alt="Logo"
              className="w-10 h-10 rounded-lg object-contain"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <MinutesCounter />
            <ThemeToggle />

            <div className="h-6 w-px bg-border hidden md:block" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline text-sm">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar - Enhanced Hover Effects */}
        <aside className="w-64 border-r border-border bg-background hidden md:block">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium relative overflow-hidden",
                    "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    isActive
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {/* Hover background box effect */}
                  <div className="absolute inset-0 bg-accent/0 hover:bg-accent/50 transition-colors rounded-lg -z-10"></div>
                  <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 overflow-auto p-4 md:p-8 bg-background">
            {children}
          </main>
          <Footer />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}