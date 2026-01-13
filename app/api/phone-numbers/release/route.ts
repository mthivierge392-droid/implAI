// app/api/phone-numbers/release/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { twilioClient } from '@/lib/twilio';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

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

    const { numberId } = await request.json();

    if (!numberId) {
      return NextResponse.json({ error: 'Number ID is required' }, { status: 400 });
    }

    // Get the phone number details
    const { data: phoneNumber, error: phoneError } = await supabaseAdmin
      .from('phone_numbers')
      .select('*')
      .eq('id', numberId)
      .eq('client_id', user.id)
      .single();

    if (phoneError || !phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // 1. Delete from Retell AI (correct API endpoint)
    try {
      await fetch(`https://api.retellai.com/delete-phone-number/${encodeURIComponent(phoneNumber.phone_number)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
        },
      });
    } catch (error) {
      console.log('Retell deletion error (continuing anyway):', error);
    }

    // 2. Release the Twilio number
    try {
      await twilioClient.incomingPhoneNumbers(phoneNumber.twilio_sid).remove();
    } catch (error) {
      console.error('Twilio release error:', error);
      // Continue anyway - the number might already be released
    }

    // 3. Cancel the Stripe subscription item
    if (phoneNumber.stripe_subscription_item_id) {
      try {
        // Get the subscription that contains this item
        const subscriptionItem = await stripe.subscriptionItems.retrieve(
          phoneNumber.stripe_subscription_item_id
        );

        // Cancel the entire subscription (since each phone number has its own subscription)
        await stripe.subscriptions.cancel(subscriptionItem.subscription as string);

        console.log('✅ Canceled Stripe subscription for phone number');
      } catch (error) {
        console.error('⚠️ Stripe cancellation error:', error);
        // Continue anyway - don't block number release if Stripe fails
      }
    }

    // 4. Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('phone_numbers')
      .delete()
      .eq('id', numberId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Release error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to release phone number' },
      { status: 500 }
    );
  }
}
