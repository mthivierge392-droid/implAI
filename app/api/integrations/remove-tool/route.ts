// app/api/integrations/remove-tool/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import Retell from 'retell-sdk';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const retell = new Retell({
  apiKey: process.env.RETELL_API_KEY!,
});

const requestSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  tool_type: z.enum(['transfer_call', 'cal_com']),
  tool_name: z.string().optional(), // For transfer_call, specify which one to remove
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, tool_type, tool_name } = requestSchema.parse(body);

    // Verify agent belongs to user and get current integrations
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, retell_llm_id, agent_name, transfer_calls, cal_com')
      .eq('id', agent_id)
      .eq('client_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    console.log(`🗑️ Removing ${tool_type} integration from agent "${agent.agent_name}"`);

    // Get current LLM config using SDK
    const llmConfig = await retell.llm.retrieve(agent.retell_llm_id);
    const existingTools = llmConfig.general_tools || [];

    let filteredTools: any[];

    if (tool_type === 'cal_com') {
      // Remove both cal.com tools
      filteredTools = existingTools.filter(
        (t: any) => t.type !== 'check_availability_cal' && t.type !== 'book_appointment_cal'
      );
      console.log('✅ Removed Cal.com tools');
    } else if (tool_type === 'transfer_call') {
      // Remove specific transfer call by name, or all if no name specified
      if (tool_name) {
        filteredTools = existingTools.filter(
          (t: any) => !(t.type === 'transfer_call' && t.name === tool_name)
        );
        console.log(`✅ Removed transfer_call: ${tool_name}`);
      } else {
        filteredTools = existingTools.filter((t: any) => t.type !== 'transfer_call');
        console.log('✅ Removed all transfer_call tools');
      }
    } else {
      filteredTools = existingTools;
    }

    // Update LLM with filtered tools using SDK
    await retell.llm.update(agent.retell_llm_id, {
      general_tools: filteredTools as any,
    });

    console.log(`✅ Successfully updated LLM ${agent.retell_llm_id}`);

    // Update Supabase to remove cached integration
    if (tool_type === 'cal_com') {
      await supabaseAdmin
        .from('agents')
        .update({ cal_com: null })
        .eq('id', agent_id);
      console.log('✅ Cleared Cal.com from Supabase');
    } else if (tool_type === 'transfer_call' && tool_name) {
      const existingTransfers = (agent.transfer_calls as any[]) || [];
      const updatedTransfers = existingTransfers.filter((t: any) => t.name !== tool_name);

      await supabaseAdmin
        .from('agents')
        .update({ transfer_calls: updatedTransfers.length > 0 ? updatedTransfers : null })
        .eq('id', agent_id);
      console.log('✅ Updated transfer_calls in Supabase');
    }

    return NextResponse.json({
      success: true,
      message: tool_type === 'cal_com'
        ? 'Cal.com integration removed'
        : `Transfer call${tool_name ? ` "${tool_name}"` : ''} removed`,
      remaining_tools: filteredTools.length,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('❌ Error removing integration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove integration' },
      { status: 500 }
    );
  }
}
