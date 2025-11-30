// lib/supabase-server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storage: {
          getItem: (key: string): string | null => {
            const cookie = cookieStore.get(key);
            return cookie?.value ?? null;
          },
          setItem: (key: string, value: string): void => {
            try {
              cookieStore.set({ name: key, value });
            } catch (error) {
              // Ignore errors in server components
            }
          },
          removeItem: (key: string): void => {
            try {
              cookieStore.set({ name: key, value: '', maxAge: 0 });
            } catch (error) {
              // Ignore errors in server components
            }
          },
        },
      },
    }
  );
}