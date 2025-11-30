/**
 * Service Role Supabase Client
 * 
 * ⚠️ SECURITY WARNING: This bypasses ALL Row Level Security (RLS) policies.
 * ONLY use in secure API routes with custom authentication.
 * 
 * 🎯 Use cases:
 *    - Processing external webhooks (Retell, Stripe)
 *    - Admin operations that need access to any user's data
 *    - Background jobs and cron tasks
 */

import { createClient } from '@supabase/supabase-js';

export function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}