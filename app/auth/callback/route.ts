// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase-server'; // ✅ FIXED: Use -server version
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient(); // Server-side client with cookie support
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}