// app/api/phone-numbers/purchase/route.ts
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

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Get client email
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('email')
      .eq('user_id', user.id)
      .single();

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: client?.email || user.email,
      line_items: [
        {
          price: process.env.STRIPE_PHONE_NUMBER_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/phone-numbers?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/phone-numbers?canceled=true`,
      metadata: {
        user_id: user.id,
        phone_number: phoneNumber,
        type: 'phone_number_subscription',
      },
      subscription_data: {
        description: `Phone Number: ${phoneNumber}`,
        metadata: {
          user_id: user.id,
          phone_number: phoneNumber,
        },
      },
      custom_text: {
        submit: {
          message: `**Phone Number:** ${phoneNumber}`,
        },
        after_submit: {
          message: `Your phone number ${phoneNumber} will be activated within minutes.`,
        },
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
