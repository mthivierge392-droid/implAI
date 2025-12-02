import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const updateLLMSchema = z.object({
  llm_id: z.string().min(1, "LLM ID required").max(100),
  general_prompt: z.string().min(1, "Prompt required").max(5000),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { llm_id, general_prompt } = updateLLMSchema.parse(body);

    // 🔒 AUTHENTICATION CHECK
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // 🛡️ RATE LIMITING - 10 requests per minute per user
    const rateLimitResult = await rateLimit(`update-llm:${user.id}`, 10, 60);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait a moment before trying again.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      );
    }

    // 🔒 AUTHORIZATION CHECK - Use service role (bypasses RLS, secure)
    const serviceSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: agent, error: agentError } = await serviceSupabase
      .from('agents')
      .select('id')
      .eq('retell_llm_id', llm_id)
      .eq('client_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    // ✅ PROCEED WITH RETELL API CALL
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.retellai.com/update-retell-llm/${encodeURIComponent(llm_id)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ general_prompt }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', errorText);
      return NextResponse.json({ error: 'Retell update failed' }, { status: response.status });
    }

    return NextResponse.json(await response.json());
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}