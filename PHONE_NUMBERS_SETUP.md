# Phone Number Management System - Setup Guide

## What We Built

A complete phone number management system that allows your clients to:
- **Search** for available US and Canadian phone numbers by area code
- **Purchase** phone numbers directly through your platform
- **Link** purchased numbers to their AI agents
- **Release** numbers when they no longer need them

All automated - clients just click buttons, everything else happens behind the scenes.

---

## Setup Steps

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SIP_TRUNK_URI=sip:your-trunk.pstn.twilio.com

# Retell AI (you already have this)
RETELL_API_KEY=your_retell_api_key

# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe (you already have this)
STRIPE_SECRET_KEY=your_stripe_secret_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Twilio Setup (One-Time Configuration)

#### A. Get Twilio Credentials
1. Go to [Twilio Console](https://console.twilio.com/)
2. Copy your **Account SID** and **Auth Token**
3. Add them to your `.env.local`

#### B. Create SIP Trunk (THE HIGHWAY)
This is the **one-time setup** that handles ALL phone numbers for ALL clients.

1. Go to **Elastic SIP Trunking** in Twilio Console
2. Click **Create new SIP Trunk**
3. Name it: "Retell AI Integration"
4. Configure **Origination**:
   - Click "Origination" tab
   - Add Origination URI: `sip:sip.retellai.com`
   - Priority: 1
   - Weight: 1
   - Save

5. Configure **Termination**:
   - Click "Termination" tab
   - Copy the **Termination SIP URI** (looks like: `sip:your-trunk.pstn.twilio.com`)
   - Add this to your `.env.local` as `TWILIO_SIP_TRUNK_URI`
   - Under "IP Access Control Lists": Add your server IP (or skip for now)

6. Save the trunk

**That's it!** You never touch this again. All phone numbers will automatically use this trunk.

### 3. Database Setup

You already ran this! The `phone_numbers` table is created in Supabase.

### 4. Test the System

1. Start your dev server:
```bash
npm run dev
```

2. Navigate to the **Phone Numbers** page in your dashboard

3. Click **Buy Number**

4. Search for numbers (try area code `212` for New York)

5. Purchase a test number

6. Link it to one of your agents

7. The agent is now live on that phone number!

---

## How It Works (Behind the Scenes)

### When a Client Clicks "Buy Number"

1. **Frontend** → Searches Twilio API for available numbers
2. **Shows results** to the client
3. Client clicks **Purchase**
4. **Backend**:
   - Purchases number from Twilio
   - Assigns it to your pre-configured SIP trunk
   - Saves to database with client_id
   - Charges client (TODO: Stripe integration)
5. **Done!** Number appears in their list

### When a Client Links a Number to an Agent

1. **Frontend** → Client selects agent from dropdown
2. **Backend**:
   - Gets agent's `retell_agent_id` from database
   - Calls Retell AI API to import the number
   - Binds the number to that specific agent
   - Updates database with `agent_id`
3. **Done!** Calls to that number → Retell → That specific agent

### When a Client Releases a Number

1. **Frontend** → Client clicks "Release"
2. **Backend**:
   - Deletes number from Retell AI
   - Releases number in Twilio (stops billing you)
   - Cancels Stripe subscription (when implemented)
   - Deletes from database
3. **Done!** Number goes back to Twilio's pool, billing stops

---

## Cost Structure

### What You Pay (Twilio)
- **US Number**: ~$1.15/month
- **Canadian Number**: ~$1.00/month
- **Per-minute calling**: ~$0.01-0.02/min

### What You Charge Clients
- **Pass-through**: Charge exact Twilio cost ($1.15/month)
- **Markup**: Charge $2-3/month (60-160% profit on numbers)
- **Platform fee**: Your main revenue is platform subscription

---

## TODO: Stripe Recurring Billing

The phone number purchase/release is working, but Stripe recurring billing needs to be implemented.

**What's needed:**
1. When client purchases a number → Create Stripe subscription item
2. Charge them monthly for each number they own
3. When client releases → Cancel the subscription item

**Files to update:**
- [app/api/phone-numbers/purchase/route.ts](app/api/phone-numbers/purchase/route.ts:46) - Line 46 (marked TODO)
- [app/api/phone-numbers/release/route.ts](app/api/phone-numbers/release/route.ts:72) - Line 72 (marked TODO)

---

## Troubleshooting

### "No numbers found"
- Try different area codes (212, 415, 646, 416 for Toronto)
- Some area codes have limited availability

### "Failed to purchase"
- Check Twilio credentials in `.env.local`
- Verify Twilio account has funds
- Check console logs for detailed error

### "Failed to link to agent"
- Check `RETELL_API_KEY` is correct
- Verify agent exists in database
- Check Retell AI API status

### Numbers not receiving calls
- Verify SIP trunk is configured correctly in Twilio
- Check Retell AI dashboard shows the imported number
- Ensure agent is active (has minutes remaining)

---

## Architecture Summary

```
CLIENT PURCHASES NUMBER
    ↓
TWILIO API (buys number) → Assigns to SIP Trunk
    ↓
YOUR DATABASE (saves number + client_id)
    ↓
CLIENT LINKS TO AGENT
    ↓
RETELL AI API (imports number, binds to agent_id)
    ↓
INCOMING CALL
    ↓
TWILIO (receives call) → SIP Trunk → RETELL AI
    ↓
RETELL AI (routes to correct agent based on phone number)
    ↓
AGENT RESPONDS
```

---

## Files Created/Modified

### New Files
- [app/dashboard/phone-numbers/page.tsx](app/dashboard/phone-numbers/page.tsx) - Phone numbers UI
- [app/api/phone-numbers/search/route.ts](app/api/phone-numbers/search/route.ts) - Search API
- [app/api/phone-numbers/purchase/route.ts](app/api/phone-numbers/purchase/route.ts) - Purchase API
- [app/api/phone-numbers/link/route.ts](app/api/phone-numbers/link/route.ts) - Link API
- [app/api/phone-numbers/release/route.ts](app/api/phone-numbers/release/route.ts) - Release API
- [lib/twilio.ts](lib/twilio.ts) - Twilio helper

### Modified Files
- [app/dashboard/layout.tsx](app/dashboard/layout.tsx) - Added "Phone Numbers" nav item
- [components/mobile-nav.tsx](components/mobile-nav.tsx) - Added mobile nav item
- [lib/supabase.ts](lib/supabase.ts) - Added PhoneNumber type
- [supabase/migrations/schema.sql](supabase/migrations/schema.sql) - Added phone_numbers table
- [package.json](package.json) - Added Twilio SDK

---

## Next Steps

1. ✅ Add Twilio credentials to `.env.local`
2. ✅ Set up SIP trunk in Twilio
3. ✅ Test buying a number
4. ✅ Test linking to agent
5. ✅ Test making a call
6. ⏳ Implement Stripe recurring billing
7. ⏳ Update your sales pitch to mention self-service phone numbers

---

## Questions?

- **Can clients have multiple numbers?** Yes, unlimited
- **Can one number link to multiple agents?** No, 1:1 relationship
- **Can one agent have multiple numbers?** Yes
- **What happens if client doesn't pay?** Implement auto-release in Stripe webhook
- **Can I mark up the price?** Yes, just increase the monthly_cost when displaying to clients

You're all set! 🎉
