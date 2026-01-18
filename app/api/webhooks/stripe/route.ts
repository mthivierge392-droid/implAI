// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { MINUTE_PACKAGES, validateStripeConfig } from '@/lib/stripe-config';
import { findUserIdByEmail, addMinutesToClient } from '@/lib/supabase-helpers';
import { twilioClient } from '@/lib/twilio';
import { createClient } from '@supabase/supabase-js';
import { restoreAllNumbersToRealAgents } from '@/lib/phone-number-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validate configuration on startup
if (!validateStripeConfig()) {
  console.error('❌ Stripe configuration is incomplete. Check your environment variables and stripe-config.ts');
}

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

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

  // Check if this is a phone number subscription
  if (session.metadata?.type === 'phone_number_subscription') {
    await handlePhoneNumberSubscription(session);
    return;
  }

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

  // Step 1: Find user_id from auth.users table by email (optimized query)
  const userId = await findUserIdByEmail(customerEmail);

  if (!userId) {
    console.error('❌ User not found in auth for email:', customerEmail);
    return;
  }

  // Step 2: Add minutes to client's account
  const newMinutesTotal = await addMinutesToClient(userId, totalMinutesToAdd);

  if (newMinutesTotal === null) {
    console.error('❌ Failed to update minutes for user_id:', userId);
    throw new Error('Failed to update minutes');
  }

  console.log(
    `✅ Successfully added ${totalMinutesToAdd} minutes to ${customerEmail} (${userId}). New total: ${newMinutesTotal} minutes`
  );

  // Step 3: Restore ALL phone numbers back to their real agents
  try {
    const result = await restoreAllNumbersToRealAgents(userId);
    if (result.success > 0) {
      console.log(`✅ Restored ${result.success} phone number(s) to real agents`);
    }
    if (result.failed > 0) {
      console.warn(`⚠️ Failed to restore ${result.failed} phone number(s)`);
    }
    if (result.success === 0 && result.failed === 0) {
      console.log('ℹ️ No phone numbers to restore for this user');
    }
  } catch (error) {
    console.error('❌ Error restoring phone numbers:', error);
    // Don't throw - minutes were already added successfully
  }

  // Optional: Log the transaction for audit purposes
  await logTransaction(userId, totalMinutesToAdd, session.id, session.amount_total || 0);
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

  // Find user_id from auth.users table by email (optimized query)
  const userId = await findUserIdByEmail(customerEmail);

  if (!userId) {
    console.error('❌ User not found in auth for email:', customerEmail);
    return;
  }

  // Add minutes to client's account
  const newMinutesTotal = await addMinutesToClient(userId, minutesToAdd);

  if (newMinutesTotal === null) {
    console.error('❌ Failed to update minutes for user_id:', userId);
    throw new Error('Failed to update minutes');
  }

  console.log(
    `✅ Successfully added ${minutesToAdd} minutes to ${customerEmail} (${userId}). New total: ${newMinutesTotal} minutes`
  );

  // Restore ALL phone numbers back to their real agents
  try {
    const result = await restoreAllNumbersToRealAgents(userId);
    if (result.success > 0) {
      console.log(`✅ Restored ${result.success} phone number(s) to real agents`);
    }
    if (result.failed > 0) {
      console.warn(`⚠️ Failed to restore ${result.failed} phone number(s)`);
    }
    if (result.success === 0 && result.failed === 0) {
      console.log('ℹ️ No phone numbers to restore for this user');
    }
  } catch (error) {
    console.error('❌ Error restoring phone numbers:', error);
    // Don't throw - minutes were already added successfully
  }

  await logTransaction(userId, minutesToAdd, paymentIntent.id, paymentIntent.amount);
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

/**
 * Handle phone number subscription purchase
 * This is triggered when a customer completes payment for a phone number
 */
async function handlePhoneNumberSubscription(session: Stripe.Checkout.Session) {
  console.log('📞 Processing phone number subscription:', session.id);

  const userId = session.metadata?.user_id;
  const phoneNumber = session.metadata?.phone_number;

  if (!userId || !phoneNumber) {
    console.error('❌ Missing user_id or phone_number in session metadata');
    return;
  }

  try {
    // 1. Check if user has minutes available
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('minutes_included, minutes_used')
      .eq('user_id', userId)
      .single();

    const remainingMinutes = client ? (client.minutes_included - client.minutes_used) : 0;
    const hasMinutes = remainingMinutes > 0;

    // 2. Purchase the phone number from Twilio
    console.log(`📞 Purchasing Twilio number: ${phoneNumber} (user has ${remainingMinutes} minutes)`);
    let twilioNumber;

    if (hasMinutes) {
      // User has minutes - assign to SIP trunk for Retell AI
      twilioNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        trunkSid: process.env.TWILIO_TRUNK_SID,
      });
      console.log(`✅ Twilio number purchased and assigned to SIP trunk: ${twilioNumber.sid}`);
    } else {
      // User has no minutes - assign to TwiML Bin
      twilioNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        voiceUrl: process.env.TWILIO_OUT_OF_MINUTES_TWIML_URL,
        voiceMethod: 'POST',
      });
      console.log(`✅ Twilio number purchased with TwiML Bin (0 minutes): ${twilioNumber.sid}`);
    }

    // 2. Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const subscriptionItemId = subscription.items.data[0].id;

    // 3. Save Stripe customer ID if not exists
    const customerId = session.customer as string;
    await supabaseAdmin
      .from('clients')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', userId)
      .is('stripe_customer_id', null);

    // 4. Save to database
    const { error: dbError } = await supabaseAdmin
      .from('phone_numbers')
      .insert({
        client_id: userId,
        phone_number: phoneNumber,
        twilio_sid: twilioNumber.sid,
        monthly_cost: 1.15,
        stripe_subscription_item_id: subscriptionItemId,
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Rollback: release Twilio number
      await twilioClient.incomingPhoneNumbers(twilioNumber.sid).remove();
      throw dbError;
    }

    console.log(
      `✅ Successfully purchased phone number ${phoneNumber} for user ${userId}`
    );
  } catch (error) {
    console.error('❌ Error processing phone number subscription:', error);
    throw error;
  }
}
