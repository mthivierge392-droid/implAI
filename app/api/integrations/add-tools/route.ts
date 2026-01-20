// app/api/integrations/add-tools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RETELL_API_KEY = process.env.RETELL_API_KEY!;

// Schema for Cal.com integration
const calComSchema = z.object({
  type: z.literal('cal_com'),
  cal_api_key: z.string().min(1, 'Cal.com API key is required'),
  event_type_id: z.number().int().positive('Event type ID must be a positive number'),
  timezone: z.string().optional(),
});

// Schema for transfer call integration
const transferCallSchema = z.object({
  type: z.literal('transfer_call'),
  phone_number: z.string().min(1, 'Phone number is required'),
  transfer_description: z.string().min(1, 'Transfer description is required'),
  function_name: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Function name must be alphanumeric with underscores/dashes'),
});

const requestSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  integration: z.discriminatedUnion('type', [calComSchema, transferCallSchema]),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { agent_id, integration } = requestSchema.parse(body);

    // Verify agent belongs to user
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, retell_llm_id, retell_agent_id, agent_name')
      .eq('id', agent_id)
      .eq('client_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    console.log(`🔧 Adding ${integration.type} integration to agent "${agent.agent_name}"`);

    // Get current LLM config to preserve existing tools
    const llmResponse = await fetch(
      `https://api.retellai.com/get-retell-llm/${agent.retell_llm_id}`,
      {
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
        },
      }
    );

    if (!llmResponse.ok) {
      console.error('Failed to get LLM config');
      return NextResponse.json({ error: 'Failed to get agent configuration' }, { status: 500 });
    }

    const llmConfig = await llmResponse.json();
    const existingTools = llmConfig.general_tools || [];

    // Build new tools based on integration type
    let newTools: any[] = [];

    if (integration.type === 'cal_com') {
      // Remove any existing cal.com tools first
      const filteredTools = existingTools.filter(
        (t: any) => t.type !== 'check_availability_cal' && t.type !== 'book_appointment_cal'
      );

      // Add both check availability and book appointment tools
      newTools = [
        ...filteredTools,
        {
          type: 'check_availability_cal',
          name: 'check_calendar_availability',
          cal_api_key: integration.cal_api_key,
          event_type_id: integration.event_type_id,
          description: 'Check available appointment slots on the calendar. Use this when the caller wants to know what times are available.',
          ...(integration.timezone && { timezone: integration.timezone }),
        },
        {
          type: 'book_appointment_cal',
          name: 'book_calendar_appointment',
          cal_api_key: integration.cal_api_key,
          event_type_id: integration.event_type_id,
          description: 'Book an appointment on the calendar. Use this after confirming the time slot with the caller.',
          ...(integration.timezone && { timezone: integration.timezone }),
        },
      ];

      console.log('✅ Added Cal.com tools: check_availability_cal + book_appointment_cal');
    } else if (integration.type === 'transfer_call') {
      // Check if a transfer tool with same name exists
      const filteredTools = existingTools.filter(
        (t: any) => !(t.type === 'transfer_call' && t.name === integration.function_name)
      );

      // Add transfer call tool with proper nested structure
      newTools = [
        ...filteredTools,
        {
          type: 'transfer_call',
          name: integration.function_name,
          description: integration.transfer_description,
          transfer_destination: {
            type: 'predefined',
            number: integration.phone_number,
          },
          transfer_option: {
            type: 'cold_transfer',
            show_transferee_as_caller: true,
          },
        },
      ];

      console.log(`✅ Added transfer_call tool: ${integration.function_name} -> ${integration.phone_number}`);
    }

    // Update LLM with new tools
    const updateResponse = await fetch(
      `https://api.retellai.com/update-retell-llm/${agent.retell_llm_id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          general_tools: newTools,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ Failed to update LLM:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to add integration' },
        { status: 500 }
      );
    }

    const updatedLlm = await updateResponse.json();
    console.log(`✅ Successfully updated LLM ${agent.retell_llm_id} with new tools`);

    return NextResponse.json({
      success: true,
      message: integration.type === 'cal_com'
        ? 'Cal.com integration added successfully! Your agent can now check availability and book appointments.'
        : `Transfer call to ${integration.phone_number} added successfully!`,
      tools_count: newTools.length,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('❌ Error adding integration:', error);
    return NextResponse.json(
      { error: 'Failed to add integration' },
      { status: 500 }
    );
  }
}
