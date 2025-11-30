/**
 * Client-Side Supabase Client
 * 
 * 🎯 For React components in the browser
 * 🔒 Respects Row Level Security (RLS) - users can only see their own data
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ✅ Removed <Database> type, replaced with <any>
export const supabase = createClientComponentClient<any>();

// Export types for convenience
export type { User, Session } from '@supabase/supabase-js';