// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { MINUTE_PACKAGES, validateStripeConfig } from '@/lib/stripe-config';

// Validate configuration on startup
if (!validateStripeConfig()) {
  console.error('❌ Stripe configuration is incomplete. Check your environment variables and stripe-config.ts');
}

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// Initialize Supabase admin client (bypasses RLS for admin operations)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature to ensure it's from Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  console.log('✅ Webhook event received:', event.type);

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        // Alternative: handle payment intents for one-time purchases
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: `Webhook processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 * This is triggered when a customer completes a Stripe Checkout or Payment Link
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('💰 Processing checkout session:', session.id);

  // Get customer email from the session
  const customerEmail = session.customer_email || session.customer_details?.email;

  if (!customerEmail) {
    console.error('❌ No customer email found in session');
    return;
  }

  // Get line items to determine what was purchased
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
  });

  let totalMinutesToAdd = 0;

  // Calculate total minutes from all purchased items
  for (const item of lineItems.data) {
    const priceId = item.price?.id;
    const quantity = item.quantity || 1;

    if (priceId && MINUTE_PACKAGES[priceId]) {
      const minutesPerUnit = MINUTE_PACKAGES[priceId];
      const minutesForThisItem = minutesPerUnit * quantity;
      totalMinutesToAdd += minutesForThisItem;

      console.log(
        `📦 Item: ${item.description} (${priceId}) - ${minutesPerUnit} minutes × ${quantity} = ${minutesForThisItem} minutes`
      );
    } else {
      console.warn(`⚠️ Unknown price ID: ${priceId} - not configured in MINUTE_PACKAGES`);
    }
  }

  if (totalMinutesToAdd === 0) {
    console.warn('⚠️ No minutes to add - check your MINUTE_PACKAGES configuration');
    return;
  }

  // Find user in database by email
  const { data: user, error: userError } = await supabaseAdmin
    .from('clients')
    .select('user_id, minutes_included, email')
    .eq('email', customerEmail)
    .single();

  if (userError || !user) {
    console.error('❌ User not found for email:', customerEmail);
    return;
  }

  // Update user's minutes
  const newMinutesTotal = user.minutes_included + totalMinutesToAdd;

  const { error: updateError } = await supabaseAdmin
    .from('clients')
    .update({ minutes_included: newMinutesTotal })
    .eq('user_id', user.user_id);

  if (updateError) {
    console.error('❌ Failed to update minutes:', updateError);
    throw updateError;
  }

  console.log(
    `✅ Successfully added ${totalMinutesToAdd} minutes to ${customerEmail}. New total: ${newMinutesTotal} minutes`
  );

  // Optional: Log the transaction for audit purposes
  await logTransaction(user.user_id, totalMinutesToAdd, session.id, session.amount_total || 0);
}

/**
 * Handle successful payment intent (alternative method)
 * Use this if you're using direct Payment Intents instead of Checkout Sessions
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💳 Processing payment intent:', paymentIntent.id);

  // Get customer email from metadata or customer object
  const customerEmail = paymentIntent.receipt_email || paymentIntent.metadata.customer_email;

  if (!customerEmail) {
    console.error('❌ No customer email found in payment intent');
    return;
  }

  // Get price ID from metadata (you need to set this when creating the payment intent)
  const priceId = paymentIntent.metadata.price_id;

  if (!priceId || !MINUTE_PACKAGES[priceId]) {
    console.error('❌ Invalid or missing price_id in payment intent metadata');
    return;
  }

  const minutesToAdd = MINUTE_PACKAGES[priceId];

  // Find and update user (same logic as checkout session)
  const { data: user, error: userError } = await supabaseAdmin
    .from('clients')
    .select('user_id, minutes_included, email')
    .eq('email', customerEmail)
    .single();

  if (userError || !user) {
    console.error('❌ User not found for email:', customerEmail);
    return;
  }

  const newMinutesTotal = user.minutes_included + minutesToAdd;

  const { error: updateError } = await supabaseAdmin
    .from('clients')
    .update({ minutes_included: newMinutesTotal })
    .eq('user_id', user.user_id);

  if (updateError) {
    console.error('❌ Failed to update minutes:', updateError);
    throw updateError;
  }

  console.log(
    `✅ Successfully added ${minutesToAdd} minutes to ${customerEmail}. New total: ${newMinutesTotal} minutes`
  );

  await logTransaction(user.user_id, minutesToAdd, paymentIntent.id, paymentIntent.amount);
}

/**
 * Log transaction for audit trail
 * Creates a record of the minute purchase
 */
async function logTransaction(
  userId: string,
  minutesAdded: number,
  transactionId: string,
  amountPaid: number
) {
  try {
    // You can create a 'transactions' table in Supabase to log these
    // For now, we'll just console log
    console.log('📝 Transaction log:', {
      userId,
      minutesAdded,
      transactionId,
      amountPaid: amountPaid / 100, // Convert cents to dollars
      timestamp: new Date().toISOString(),
    });

    // Optional: Store in database
    // await supabaseAdmin.from('transactions').insert({
    //   user_id: userId,
    //   minutes_added: minutesAdded,
    //   transaction_id: transactionId,
    //   amount_paid: amountPaid,
    //   created_at: new Date().toISOString(),
    // });
  } catch (error) {
    console.error('⚠️ Failed to log transaction:', error);
    // Don't throw - logging failure shouldn't break the webhook
  }
}
