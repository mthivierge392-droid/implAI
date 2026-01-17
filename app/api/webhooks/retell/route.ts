// app/api/webhooks/retell/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Retell } from 'retell-sdk';
import { switchAllNumbersToFallback } from '@/lib/phone-number-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RETELL_API_KEY = process.env.RETELL_API_KEY!;

/**
 * Centralized webhook handler for all Retell AI call events
 * This single endpoint handles calls from ALL agents across ALL clients
 *
 * Event types:
 * - call_started: When a call begins
 * - call_ended: When a call completes, transfers, or errors
 * - call_analyzed: When call analysis is complete (we use this one)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const signature = req.headers.get('x-retell-signature');

    // Verify webhook signature for security using official Retell SDK
    // Note: Must stringify the parsed JSON body for verification
    if (!Retell.verify(JSON.stringify(payload), RETELL_API_KEY, signature || '')) {
      console.error('❌ Invalid Retell webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const { event, call } = payload;

    console.log(`📞 Retell webhook received: ${event} for call ${call?.call_id}`);

    // We only process call_analyzed events (when call is complete and analyzed)
    if (event !== 'call_analyzed') {
      console.log(`ℹ️ Ignoring event type: ${event}`);
      return new NextResponse(null, { status: 204 });
    }

    // Extract call data from payload
    const {
      call_id,
      agent_id,
      from_number,
      to_number,
      transcript,
      call_status,
      call_cost,
    } = call;

    // Get duration from Retell's official billing data (same as n8n workflow)
    const callDurationSeconds = call_cost?.total_duration_seconds || 0;

    console.log(`📊 Call details: ${from_number} → ${to_number}, ${callDurationSeconds}s, status: ${call_status}`);

    // Step 1: Look up which client owns this agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('client_id, agent_name')
      .eq('retell_agent_id', agent_id)
      .single();

    if (agentError || !agent) {
      console.error(`❌ Agent not found for retell_agent_id: ${agent_id}`, agentError);
      // Still return 204 to acknowledge receipt (don't retry)
      return new NextResponse(null, { status: 204 });
    }

    console.log(`✅ Found agent "${agent.agent_name}" owned by client: ${agent.client_id}`);

    // Step 2: Insert call history record
    // Note: The database trigger will automatically deduct minutes from the client
    const { error: insertError } = await supabaseAdmin
      .from('call_history')
      .insert({
        retell_call_id: call_id,
        retell_agent_id: agent_id,
        phone_number: from_number,
        transcript: transcript || '',
        call_duration_seconds: callDurationSeconds,
        call_status: call_status || 'completed',
      });

    if (insertError) {
      console.error('❌ Failed to insert call history:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully stored call history for client ${agent.client_id}`);

    // Step 3: Check if client ran out of minutes and switch to fallback
    const { data: clientData } = await supabaseAdmin
      .from('clients')
      .select('minutes_included, minutes_used')
      .eq('user_id', agent.client_id)
      .single();

    if (clientData && clientData.minutes_used >= clientData.minutes_included) {
      console.log(`⚠️ Client ${agent.client_id} is out of minutes (${clientData.minutes_used}/${clientData.minutes_included})`);

      try {
        // Switch all numbers to fallback TwiML Bin
        const result = await switchAllNumbersToFallback(agent.client_id);
        console.log(`🔄 Switched ${result.success} number(s) to fallback, ${result.failed} failed`);
      } catch (error) {
        console.error('❌ Failed to switch numbers to fallback:', error);
      }
    }

    // Return 204 No Content to acknowledge successful processing
    return new NextResponse(null, { status: 204 });

  } catch (error: any) {
    console.error('❌ Error processing Retell webhook:', error);
    // Return 500 so Retell will retry
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

