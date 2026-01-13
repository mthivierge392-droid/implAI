// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // Check if code exists
  if (!code) {
    console.error('Auth callback: No code provided');
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  try {
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(
        new URL('/?error=auth_failed', request.url)
      );
    }

    // Success - redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error) {
    console.error('Auth callback exception:', error);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
}