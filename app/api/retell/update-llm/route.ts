import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import Retell from 'retell-sdk';

const retell = new Retell({
  apiKey: process.env.RETELL_API_KEY!,
});

const updateLLMSchema = z.object({
  llm_id: z.string().min(1, "LLM ID required").max(100),
  general_prompt: z.string().max(50000), // Allow empty prompts
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
        { status: 429 }
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

    // ✅ Use Retell SDK to update LLM
    console.log(`Updating LLM ${llm_id} with prompt length: ${general_prompt.length}`);

    const updatedLlm = await retell.llm.update(llm_id, {
      general_prompt: general_prompt || '', // Ensure empty string if undefined
    });

    console.log('LLM updated successfully via SDK');

    return NextResponse.json(updatedLlm);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
