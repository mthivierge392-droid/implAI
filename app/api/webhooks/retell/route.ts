// app/api/webhooks/retell/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
    const body = await req.text();
    const signature = req.headers.get('x-retell-signature');

    // Verify webhook signature for security
    if (!verifyRetellSignature(body, signature)) {
      console.error('❌ Invalid Retell webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
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

/**
 * Verify Retell webhook signature using HMAC-SHA256
 * This ensures the webhook is actually from Retell AI
 */
function verifyRetellSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.warn('⚠️ No signature provided in webhook');
    return false;
  }

  try {
    // Create HMAC using Retell API key
    const hmac = crypto.createHmac('sha256', RETELL_API_KEY);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');

    // Retell sends signature in base64 format
    // Simple string comparison for base64 signatures
    const isValid = signature === expectedSignature;

    if (!isValid) {
      console.error('❌ Signature mismatch');
      console.log('Expected (base64):', expectedSignature);
      console.log('Received:', signature);
    }

    return isValid;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

/**
 * Deduct call minutes from client's available balance
 * Converts seconds to minutes (rounded up)
 */
async function deductMinutesFromClient(clientId: string, durationSeconds: number) {
  try {
    // Convert seconds to minutes (round up)
    const minutesToDeduct = Math.ceil(durationSeconds / 60);

    console.log(`⏱️ Deducting ${minutesToDeduct} minutes (${durationSeconds}s) from client ${clientId}`);

    // Get current balance
    const { data: client, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('available_minutes')
      .eq('user_id', clientId)
      .single();

    if (fetchError || !client) {
      console.error('❌ Failed to fetch client minutes:', fetchError);
      return;
    }

    const currentMinutes = client.available_minutes || 0;
    const newMinutes = Math.max(0, currentMinutes - minutesToDeduct);

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({ available_minutes: newMinutes })
      .eq('user_id', clientId);

    if (updateError) {
      console.error('❌ Failed to update client minutes:', updateError);
      return;
    }

    console.log(`✅ Client balance updated: ${currentMinutes} → ${newMinutes} minutes`);

    // If balance is now 0, we might want to pause their agents
    if (newMinutes === 0 && currentMinutes > 0) {
      console.warn(`⚠️ Client ${clientId} has run out of minutes!`);
      // TODO: Notify client or pause their agents
    }

  } catch (error) {
    console.error('❌ Error deducting minutes:', error);
    // Don't throw - we don't want to fail the webhook if minute deduction fails
  }
}
