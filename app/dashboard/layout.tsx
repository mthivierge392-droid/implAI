// app/dashboard/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MinutesCounter from '@/components/MinutesCounter';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileNav } from '@/components/mobile-nav';
import { LayoutDashboard, Cpu, Phone, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, setUser, loading, setLoading } = useAuthStore();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/agents', label: 'Agents', icon: Cpu },
    { href: '/dashboard/call-history', label: 'Call History', icon: Phone },
  ];

  return (
    <div className={`min-h-screen ${resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${
        resolvedTheme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between h-16 px-3 md:px-6 gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">
              Monitoring
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <MinutesCounter />
            
            <ThemeToggle />

            <div className="flex items-center gap-1 md:gap-2 pl-1 md:pl-4 border-l border-gray-200 dark:border-gray-700 flex-shrink-0">
              <span className="hidden lg:inline text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={`w-64 border-r ${
          resolvedTheme === 'dark' 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } min-h-[calc(100vh-64px)] hidden md:block`}>
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-4 md:p-8 ${
          resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white'
        }`}>
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}