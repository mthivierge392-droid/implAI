import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const updateAgentSchema = z.object({
  agent_id: z.string().min(1, "Agent ID required").max(100),
  voice_id: z.string().optional(),
  agent_name: z.string().optional(),
  language: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    console.log('Update agent request body:', body);
    const { agent_id, voice_id, agent_name, language } = updateAgentSchema.parse(body);
    console.log('Parsed agent_id:', agent_id, 'voice_id:', voice_id, 'agent_name:', agent_name, 'language:', language);

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
      .select('id, voice')
      .eq('retell_agent_id', agent_id)
      .eq('client_id', user.id)
      .single();

    if (agentError || !agent) {
      console.error('Agent lookup error:', { agentError, agent_id, user_id: user.id });
      return NextResponse.json({
        error: 'Agent not found or unauthorized',
        debug: process.env.NODE_ENV === 'development' ? { agent_id, user_id: user.id, agentError } : undefined
      }, { status: 404 });
    }

    // ✅ PROCEED WITH RETELL API CALL
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // First, verify the agent exists by trying to GET it
    const getUrl = `https://api.retellai.com/get-agent/${encodeURIComponent(agent_id)}`;
    console.log('First, verifying agent exists:', getUrl);

    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!getResponse.ok) {
      const getError = await getResponse.text();
      console.error('Agent verification failed:', { getUrl, status: getResponse.status, getError });
      return NextResponse.json({
        error: 'Agent not found in Retell',
        details: process.env.NODE_ENV === 'development' ? { status: getResponse.status, message: getError } : undefined
      }, { status: getResponse.status });
    }

    const agentData = await getResponse.json();
    console.log('Agent verified, current voice:', agentData.voice_id, 'is_published:', agentData.is_published);
    console.log('Attempting to change voice from', agentData.voice_id, 'to', voice_id);

    // Check if voice is actually changing
    if (agentData.voice_id === voice_id) {
      console.log('Voice is already set to', voice_id, '- updating anyway');
    }

    const url = `https://api.retellai.com/update-agent/${encodeURIComponent(agent_id)}`;
    const requestBody: any = {};
    if (voice_id) requestBody.voice_id = voice_id;
    if (agent_name) requestBody.agent_name = agent_name;
    if (language) requestBody.language = language;
    console.log('Calling Retell API:', url);
    console.log('Request body:', JSON.stringify(requestBody));

    // Add small delay to avoid rate limiting (wait 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', { url, status: response.status, errorText });

      // If 404, try one more time after a delay
      if (response.status === 404) {
        console.log('Retrying after 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const retryResponse = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          console.error('Retry also failed:', retryError);
          return NextResponse.json({
            error: 'Retell update failed after retry',
            details: process.env.NODE_ENV === 'development' ? { status: retryResponse.status, message: retryError } : undefined
          }, { status: retryResponse.status });
        }

        // Retry succeeded, continue with success path
        const retryData = await retryResponse.json();
        const retryDbUpdates: any = {};
        if (voice_id) retryDbUpdates.voice = voice_id;
        if (language) retryDbUpdates.language = language;
        if (Object.keys(retryDbUpdates).length > 0) {
          await serviceSupabase.from('agents').update(retryDbUpdates).eq('id', agent.id);
        }
        return NextResponse.json(retryData);
      }

      return NextResponse.json({
        error: 'Retell update failed',
        details: process.env.NODE_ENV === 'development' ? { status: response.status, message: errorText } : undefined
      }, { status: response.status });
    }

    // Publish the agent to make changes live
    const publishUrl = `https://api.retellai.com/publish-agent/${encodeURIComponent(agent_id)}`;
    console.log('Publishing agent:', publishUrl);

    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!publishResponse.ok) {
      const publishError = await publishResponse.text();
      console.error('Publish failed:', { publishUrl, status: publishResponse.status, publishError });
      // Don't fail the entire request if publish fails - just log it
      console.warn('Agent updated but not published. User may need to manually publish in Retell dashboard.');
    } else {
      console.log('Agent published successfully');
    }

    // Update voice and/or language in database if provided
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
        return NextResponse.json({ error: 'Failed to update database' }, { status: 500 });
      }
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
