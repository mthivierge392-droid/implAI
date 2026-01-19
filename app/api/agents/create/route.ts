// app/api/agents/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RETELL_API_KEY = process.env.RETELL_API_KEY!;

/**
 * Create a new AI agent with automatic webhook configuration
 * This endpoint handles the complete agent setup:
 * 1. Creates agent in Retell AI with centralized webhook
 * 2. Stores agent details in Supabase
 * 3. Links agent to the authenticated client
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      agent_name,
      prompt,
      retell_llm_id,
      voice,
      language,
    } = body;

    // Validate required fields
    if (!agent_name) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Creating agent "${agent_name}" for user ${user.id}`);

    // Step 1: Create LLM first (required for agent creation)
    let llmId = retell_llm_id;

    if (!llmId) {
      console.log('📝 Creating LLM in Retell AI...');
      const llmResponse = await fetch('https://api.retellai.com/create-retell-llm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini', // Best price/quality/speed balance
          model_high_priority: true, // Fast tier - lower latency at $0.022/min
          general_prompt: prompt || 'You are a helpful AI assistant. Be professional, friendly, and concise in your responses.',
          general_tools: [],
        }),
      });

      if (!llmResponse.ok) {
        const errorData = await llmResponse.json();
        console.error('❌ LLM creation error:', errorData);
        throw new Error(errorData.message || 'Failed to create LLM');
      }

      const llmData = await llmResponse.json();
      llmId = llmData.llm_id;
      console.log(`✅ Created LLM: ${llmId}`);
    }

    // Step 2: Create agent using the LLM ID
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/retell`;

    const retellResponse = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: agent_name,
        voice_id: voice || '11labs-Adrian',
        language: language || 'en-US',
        response_engine: {
          type: 'retell-llm',
          llm_id: llmId,
        },
        webhook_url: webhookUrl,
      }),
    });

    if (!retellResponse.ok) {
      const errorData = await retellResponse.json();
      console.error('❌ Retell API error:', errorData);
      throw new Error(errorData.message || 'Failed to create agent in Retell AI');
    }

    const retellAgent = await retellResponse.json();
    const retellAgentId = retellAgent.agent_id;
    const retellLlmId = retellAgent.response_engine?.llm_id || llmId;

    console.log(`✅ Created agent in Retell AI: ${retellAgentId}`);
    console.log(`✅ Agent LLM ID: ${retellLlmId}`);
    console.log(`🔗 Webhook configured: ${webhookUrl}`);

    // Step 3: Store agent with both IDs in Supabase
    const { data: agent, error: insertError } = await supabaseAdmin
      .from('agents')
      .insert({
        client_id: user.id,
        agent_name: agent_name,
        retell_agent_id: retellAgentId,
        retell_llm_id: retellLlmId,
        prompt: prompt || null,
        voice: voice || '11labs-Adrian',
        language: language || 'en-US',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      // Rollback: delete agent from Retell
      await deleteRetellAgent(retellAgentId);
      throw insertError;
    }

    console.log(`✅ Agent stored in database with ID: ${agent.id}`);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        agent_name: agent.agent_name,
        retell_agent_id: retellAgentId,
        webhook_url: webhookUrl,
      },
    });

  } catch (error: any) {
    console.error('❌ Error creating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}

/**
 * Delete agent from Retell AI (rollback function)
 */
async function deleteRetellAgent(agentId: string) {
  try {
    await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
      },
    });
    console.log(`🗑️ Rolled back Retell agent: ${agentId}`);
  } catch (error) {
    console.error('❌ Failed to rollback Retell agent:', error);
  }
}
