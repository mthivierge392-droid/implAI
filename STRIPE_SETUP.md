# Stripe Integration Setup Guide

This guide will help you set up automatic minute refills when customers purchase through Stripe.

---

## ⚡ Quick Start (5 Minutes)

**Just want to get payment links working fast?** Here's the minimal setup:

### 1. Get Stripe Keys
- Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API Keys**
- Copy **Secret key** → Add to `.env.local` as `STRIPE_SECRET_KEY`

### 2. Create Product & Payment Link
- **Products** → **+ Add product**
  - Name: "AI Phone Minutes"
  - Price: $10 (or your price)
  - Billing: **One-time**
  - ✅ Enable **"Adjustable quantity"**
- **Payment links** → **+ New** → Select your product
- Copy the link → Add to `.env.local` as `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`

### 3. Done!
Your "Buy Minutes" button now works. Customers can adjust quantity at checkout.

**For automatic minute crediting (webhooks), continue to full setup below.**

---

## 🎯 Full Setup Overview

When a customer completes a payment via your Stripe Payment Link, the system will:
1. Receive a webhook notification from Stripe
2. Verify the payment is legitimate
3. Calculate how many minutes to add based on the product purchased
4. Automatically update the customer's `minutes_included` in the database

---

## 📋 Prerequisites

- A Stripe account (sign up at [stripe.com](https://stripe.com))
- Your application deployed and accessible via a public URL (for webhooks)
- Access to your `.env.local` file

---

## 🚀 Step-by-Step Setup

### Step 1: Get Your Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API Keys**
3. Copy your **Secret key** (starts with `sk_test_...` for test mode or `sk_live_...` for live mode)
4. Add to your `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   ```

⚠️ **IMPORTANT**: Never commit this key to version control or expose it in client-side code!

---

### Step 2: Create Your Minutes Product in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Click **+ Add product**
3. Create your minutes product:
   - **Product name**: "100 Minutes" (or your preferred name)
   - **Price**: e.g., $10 (set your price per 100 minutes)
   - **Billing period**: **One-time**
   - ✅ **Enable "Adjustable quantity"** - This lets customers buy multiples!
   - Click **Save product**

4. **Copy the Price ID**:
   - Click on the product you just created
   - Under "Pricing", you'll see the Price ID (starts with `price_...`)
   - Copy this ID - you'll need it in Step 4

💡 **How it works:**
- Customer buys quantity **1** → Gets 100 minutes
- Customer buys quantity **3** → Gets 300 minutes
- Customer buys quantity **10** → Gets 1000 minutes

---

### Step 3: Create a Payment Link

1. In Stripe Dashboard → **Payment links**
2. Click **+ New**
3. Select your "100 Minutes" product
4. ✅ Make sure **"Allow customers to adjust quantity"** is enabled
5. Configure other settings as needed
6. Click **Create link**
7. Copy the payment link URL
8. Add to your `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_PAYMENT_LINK="https://buy.stripe.com/your-payment-link-here"
   ```

---

### Step 4: Configure Minute Package

Open `lib/stripe-config.ts` and add your Stripe Price ID:

```typescript
export const MINUTE_PACKAGES: Record<string, number> = {
  'price_1ABC123def456GHI': 100,  // 100 minutes per unit
};
```

**Replace** `price_1ABC123def456GHI` with your actual Price ID from Step 2.

That's it! The system will automatically multiply by the quantity the customer selects.

---

### Step 5: Set Up Webhook Endpoint

1. **Deploy your application** to production (or use a tunnel like ngrok for testing)

2. Go to Stripe Dashboard → **Developers** → **Webhooks**

3. Click **+ Add endpoint**

4. Enter your webhook URL:
   ```
   https://your-domain.com/api/webhooks/stripe
   ```

   **For local testing with ngrok:**
   ```bash
   ngrok http 3000
   # Use the ngrok URL: https://abc123.ngrok.io/api/webhooks/stripe
   ```

5. Select events to listen to:
   - Select **checkout.session.completed**
   - (Optional) Select **payment_intent.succeeded** if you use Payment Intents

6. Click **Add endpoint**

7. **Copy the Signing Secret**:
   - Click on your newly created webhook
   - Under "Signing secret", click **Reveal**
   - Copy the secret (starts with `whsec_...`)

8. Add to your `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

---

### Step 6: Test the Integration

#### Option A: Test with Stripe CLI (Recommended)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   scoop install stripe

   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   This will give you a webhook signing secret for testing - add it to `.env.local`

4. Trigger a test checkout event:
   ```bash
   stripe trigger checkout.session.completed
   ```

5. Check your server logs - you should see:
   ```
   ✅ Webhook event received: checkout.session.completed
   💰 Processing checkout session: cs_test_...
   ✅ Successfully added X minutes to customer@example.com
   ```

#### Option B: Test with Real Purchase (Test Mode)

1. Ensure you're in **Test Mode** (toggle in Stripe Dashboard)
2. Use a test card: `4242 4242 4242 4242` (any future expiry, any CVC)
3. Complete a test purchase through your payment link
4. Check your database - the customer's `minutes_included` should increase

---

## 🔍 Troubleshooting

### Webhook not receiving events
- ✅ Check that your webhook URL is publicly accessible
- ✅ Verify the webhook endpoint is added in Stripe Dashboard
- ✅ Check server logs for incoming requests
- ✅ Ensure `STRIPE_WEBHOOK_SECRET` is set correctly

### Minutes not being added
- ✅ Check that Price IDs in `lib/stripe-config.ts` match your Stripe products
- ✅ Verify customer email in Stripe matches email in your database
- ✅ Check server logs for error messages
- ✅ Ensure `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set

### "Price ID not found" warnings
- ✅ Verify you've added all your product Price IDs to `MINUTE_PACKAGES`
- ✅ Check for typos in Price IDs (they're case-sensitive)

---

## 📊 Monitoring

Check your webhook logs:

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View recent deliveries and their status
4. Failed webhooks will automatically retry

---

## 🔒 Security Best Practices

1. ✅ **Always verify webhook signatures** (already implemented)
2. ✅ **Never expose your Secret Key** in client code
3. ✅ **Use environment variables** for all sensitive data
4. ✅ **Test in Test Mode** before going live
5. ✅ **Monitor webhook failures** in Stripe Dashboard

---

## 🚀 Going Live

Before switching to live mode:

1. ✅ Test thoroughly in Test Mode
2. ✅ Replace test keys with live keys in `.env.local`:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - Update webhook with live mode signing secret
3. ✅ Create a new webhook endpoint for production URL
4. ✅ Update payment link to use live mode products
5. ✅ Monitor first few transactions carefully

---

## 📝 Optional: Transaction Logging

To keep an audit trail of purchases, create a transactions table in Supabase:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES clients(user_id) NOT NULL,
  minutes_added INTEGER NOT NULL,
  transaction_id TEXT NOT NULL,
  amount_paid INTEGER NOT NULL, -- in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

Then uncomment the transaction logging code in `app/api/webhooks/stripe/route.ts`.

---

## 🆘 Need Help?

- Stripe Documentation: [stripe.com/docs](https://stripe.com/docs)
- Stripe Support: Available in your Stripe Dashboard
- Webhook Testing: [stripe.com/docs/webhooks/test](https://stripe.com/docs/webhooks/test)

---

## ✅ Checklist

Before going live, ensure:

- [ ] Stripe Secret Key added to `.env.local`
- [ ] Webhook Secret added to `.env.local`
- [ ] Payment Link URL added to `.env.local`
- [ ] All Price IDs configured in `lib/stripe-config.ts`
- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] Test purchase completed successfully
- [ ] Customer minutes updated correctly in database
- [ ] Server logs show no errors
- [ ] Webhook events showing as "Succeeded" in Stripe Dashboard
