import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import DOMPurify from 'isomorphic-dompurify';
import { VALIDATION } from '@/lib/constants';
import { checkApiRateLimit } from '@/lib/rate-limiter';

function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt is required' };
  }
  if (prompt.length > VALIDATION.PROMPT.MAX_LENGTH) {
    return { valid: false, error: `Prompt must be less than ${VALIDATION.PROMPT.MAX_LENGTH} characters` };
  }
  return { valid: true };
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting (temporarily bypassed)
    await checkApiRateLimit('bypass');

    // Get auth token from cookie
    const authHeader = request.headers.get('cookie');
    const token = authHeader?.match(/sb-[^=]+=([^;]+)/)?.[1];
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    const supabase = createClient();
    
    // Manually verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('client_id', client.user_id);

    if (agentsError) {
      console.error('Agents fetch error:', agentsError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ agents: agents || [] });
  } catch (error) {
    console.error('Unexpected API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting (temporarily bypassed)
    await checkApiRateLimit('bypass-patch');

    const authHeader = request.headers.get('cookie');
    const token = authHeader?.match(/sb-[^=]+=([^;]+)/)?.[1];
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, prompt, retellLlmId } = body;

    if (!agentId || !prompt || !retellLlmId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sanitizedPrompt = DOMPurify.sanitize(prompt);

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('client_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { data: client } = await supabase
      .from('clients')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!client || agent.client_id !== client.user_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const response = await fetch(
      `https://api.retellai.com/update-retell-llm/${retellLlmId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ general_prompt: sanitizedPrompt }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Retell API error:', error);
      return NextResponse.json({ error: 'Retell update failed' }, { status: response.status });
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update({ prompt: sanitizedPrompt })
      .eq('id', agentId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}