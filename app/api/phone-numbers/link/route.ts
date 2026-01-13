// app/api/phone-numbers/link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RETELL_API_KEY = process.env.RETELL_API_KEY!;

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

    const { numberId, agentId } = await request.json();

    if (!numberId) {
      return NextResponse.json({ error: 'Number ID is required' }, { status: 400 });
    }

    // Get the phone number details
    const { data: phoneNumber, error: phoneError } = await supabaseAdmin
      .from('phone_numbers')
      .select('*, twilio_sid, phone_number')
      .eq('id', numberId)
      .eq('client_id', user.id)
      .single();

    if (phoneError || !phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // If linking to an agent
    if (agentId) {
      // Get agent's Retell agent ID
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('agents')
        .select('retell_agent_id')
        .eq('id', agentId)
        .eq('client_id', user.id)
        .single();

      if (agentError || !agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Check if number already exists in Retell, if so update it, otherwise import it
      // First, try to update (in case it was already imported)
      console.log('🔄 Attempting to update phone number in Retell AI:', phoneNumber.phone_number);
      let retellResponse = await fetch(`https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber.phone_number)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inbound_agent_id: agent.retell_agent_id,
        }),
      });

      console.log('📊 Update response status:', retellResponse.status, retellResponse.ok ? 'OK' : 'FAILED');

      // If update fails (number doesn't exist in Retell), import it
      if (!retellResponse.ok) {
        const terminationUri = process.env.TWILIO_SIP_TRUNK_URI || 'retell.pstn.twilio.com';
        const requestBody = {
          phone_number: phoneNumber.phone_number,
          termination_uri: terminationUri,
          inbound_agent_id: agent.retell_agent_id,
          // Only include webhook URL if it's a public HTTPS URL (not localhost)
          ...(process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') && {
            inbound_webhook_url: process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/retell',
          }),
        };

        console.log('🔗 Importing phone number to Retell AI');
        console.log('   Phone:', phoneNumber.phone_number);
        console.log('   Termination URI:', terminationUri);
        console.log('   Agent ID:', agent.retell_agent_id);
        console.log('   Full request body:', JSON.stringify(requestBody, null, 2));

        retellResponse = await fetch('https://api.retellai.com/import-phone-number', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RETELL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      if (!retellResponse.ok) {
        const errorData = await retellResponse.json();
        console.log('❌ Retell AI error response:', JSON.stringify(errorData, null, 2));
        throw new Error(errorData.message || 'Failed to import number to Retell');
      }
    } else {
      // Unlinking - update to remove agent binding (set to null)
      try {
        await fetch(`https://api.retellai.com/update-phone-number/${encodeURIComponent(phoneNumber.phone_number)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${RETELL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inbound_agent_id: null,
          }),
        });
      } catch (error) {
        // Ignore errors when unlinking - number might not exist in Retell
        console.log('Retell unlink error (ignoring):', error);
      }
    }

    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from('phone_numbers')
      .update({ agent_id: agentId })
      .eq('id', numberId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Link error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link phone number' },
      { status: 500 }
    );
  }
}
