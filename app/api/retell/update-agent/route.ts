import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import Retell from 'retell-sdk';

const retell = new Retell({
  apiKey: process.env.RETELL_API_KEY!,
});

const updateAgentSchema = z.object({
  agent_id: z.string().min(1, "Agent ID required").max(100),
  voice_id: z.string().optional(),
  voice_model: z.enum(['eleven_turbo_v2', 'eleven_flash_v2', 'eleven_turbo_v2_5', 'eleven_flash_v2_5', 'eleven_multilingual_v2']).optional(),
  agent_name: z.string().optional(),
  language: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    console.log('Update agent request body:', body);
    const { agent_id, voice_id, voice_model, agent_name, language } = updateAgentSchema.parse(body);

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
    const rateLimitResult = await rateLimit(`update-agent:${user.id}`, 10, 60);

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
      .select('id, voice')
      .eq('retell_agent_id', agent_id)
      .eq('client_id', user.id)
      .single();

    if (agentError || !agent) {
      console.error('Agent lookup error:', { agentError, agent_id, user_id: user.id });
      return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
    }

    // ✅ Use Retell SDK to update agent
    console.log(`Updating agent ${agent_id} - voice: ${voice_id}, voice_model: ${voice_model}, language: ${language}`);

    const updateParams: any = {};
    if (voice_id) updateParams.voice_id = voice_id;
    if (voice_model) updateParams.voice_model = voice_model;
    if (agent_name) updateParams.agent_name = agent_name;
    if (language) updateParams.language = language;

    const updatedAgent = await retell.agent.update(agent_id, updateParams);

    console.log('Agent updated successfully via SDK');

    // Update database
    const dbUpdates: any = {};
    if (voice_id) dbUpdates.voice = voice_id;
    if (language) dbUpdates.language = language;

    if (Object.keys(dbUpdates).length > 0) {
      const { error: updateError } = await serviceSupabase
        .from('agents')
        .update(dbUpdates)
        .eq('id', agent.id);

      if (updateError) {
        console.error('Database update error:', updateError);
      }
    }

    return NextResponse.json(updatedAgent);

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
