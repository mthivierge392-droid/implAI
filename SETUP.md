# 📖 Complete Setup Guide - AI Phone Agents Platform

This guide walks you through setting up your AI Phone Agents platform from scratch. Follow each step carefully for a smooth installation.

---

## 🎯 Overview

**Total Setup Time**: 30-45 minutes
**Difficulty**: Beginner-friendly
**Cost**: Free tier available for all services (Supabase, Vercel)

---

## 📝 Prerequisites Checklist

Before starting, create accounts at:

- [ ] [Supabase](https://supabase.com/) - Backend & Database
- [ ] [Retell AI](https://retellai.com/) - AI Phone Agents
- [ ] [Stripe](https://stripe.com/) - Payment Processing (optional)
- [ ] [Vercel](https://vercel.com/) - Hosting (optional, for deployment)
- [ ] [GitHub](https://github.com/) - Code hosting (optional, for deployment)

You'll also need:
- [ ] Node.js v18+ installed ([Download](https://nodejs.org/))
- [ ] Code editor (VS Code recommended)
- [ ] Terminal/Command Prompt access

---

## 🗄️ Part 1: Supabase Setup (Database & Auth)

### Step 1.1: Create Supabase Project

1. Go to [https://app.supabase.com/](https://app.supabase.com/)
2. Click **"New Project"**
3. Fill in the form:
   - **Organization**: Select or create one
   - **Name**: `ai-phone-agents` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### Step 1.2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open your local file `supabase/migrations/schema.sql`
4. Copy ALL content from that file
5. Paste into the Supabase SQL Editor
6. Click **"Run"** (bottom right)
7. You should see: ✅ **"Success. No rows returned"**

**What this does**: Creates all tables (clients, agents, call_history, webhook_jobs), security policies, triggers, and indexes.

### Step 1.3: Get Your API Credentials

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **"API"** in the settings menu
3. You'll see a section called **"Project API keys"**

Copy these three values:

| Value | Where to Find | Environment Variable |
|-------|--------------|---------------------|
| **Project URL** | Top of API page | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** | Under "Project API keys" | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** | Under "Project API keys" (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **IMPORTANT**: The `service_role` key is like a root password - never expose it publicly!

### Step 1.4: Enable Realtime (Optional but Recommended)

1. Go to **Database** → **Replication** (left sidebar)
2. Find the table `clients`
3. Toggle **"Enable Realtime"** to ON
4. Repeat for `call_history` table

**What this does**: Enables live updates for the minutes counter in your dashboard.

### Step 1.5: Create Your First User

1. Go to **Authentication** → **Users** (left sidebar)
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - **Email**: Your email address
   - **Password**: Choose a secure password (you'll use this to login)
   - **Auto Confirm User**: ✅ Check this
4. Click **"Create user"**
5. **Copy the User ID (UUID)** - you'll need it next

### Step 1.6: Create Client Record

1. Go to **Table Editor** (left sidebar)
2. Select the **`clients`** table
3. Click **"Insert" → "Insert row"**
4. Fill in:
   - `id`: Leave blank (auto-generated)
   - `user_id`: **Paste the UUID from Step 1.5**
   - `company_name`: Your company name
   - `email`: Same email as your user
   - `minutes_included`: `1000` (starting balance)
   - `minutes_used`: `0`
   - `created_at`: Leave blank (auto-generated)
5. Click **"Save"**

✅ **Supabase setup complete!** You now have a database, authentication, and your first user.

---

## 📞 Part 2: Retell AI Setup (AI Phone Agents)

### Step 2.1: Create Retell Account

1. Go to [https://www.retellai.com/](https://www.retellai.com/)
2. Click **"Sign Up"** or **"Get Started"**
3. Complete registration
4. Verify your email

### Step 2.2: Get Your API Key

1. In Retell Dashboard, go to **Settings** or **API Keys**
2. Click **"Create API Key"** or **"Generate New Key"**
3. Give it a name: `Production Key`
4. Click **"Create"**
5. **Copy the API key immediately** - you won't see it again!

This is your `RETELL_API_KEY`

### Step 2.3: Create Your First Agent (Optional)

For now, just having the API key is enough. You can create agents later through:
- Retell's dashboard directly
- Your app's dashboard (after it's running)

**What you'll get**:
- `agent_id` - Used to identify the agent
- `llm_id` - Used to update agent prompts

Save these IDs when you create agents.

✅ **Retell AI setup complete!**

---

## 💳 Part 3: Stripe Setup (Payment Processing)

### Step 3.1: Create Stripe Account

1. Go to [https://stripe.com/](https://stripe.com/)
2. Click **"Start now"** → Sign up
3. Complete business verification (you can skip for testing)

### Step 3.2: Create a Product

1. In Stripe Dashboard, go to **Products**
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `AI Phone Minutes`
   - **Description**: `Additional minutes for AI phone calls`
   - **Pricing**: Choose **"Standard pricing"**
   - **Price**: (e.g., $25.00 for 1000 minutes)
   - **Billing period**: One-time
4. Click **"Save product"**

### Step 3.3: Create Payment Link

1. In Stripe Dashboard, go to **Payment Links**
2. Click **"+ New"**
3. Select:
   - **Product**: Choose "AI Phone Minutes" you just created
   - **Quantity**: Fixed quantity (e.g., 1)
4. Click **"Create link"**
5. **Copy the Payment Link URL**

This looks like: `https://buy.stripe.com/test_XXXXXXXXXX`

This is your `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`

### Step 3.4: Get API Keys (Future Use)

1. Go to **Developers** → **API Keys**
2. You'll see:
   - **Publishable key**: Starts with `pk_test_` or `pk_live_`
   - **Secret key**: Starts with `sk_test_` or `sk_live_` (click Reveal)

**Note**: You don't need these for basic setup, but save them for future Stripe webhook integration.

✅ **Stripe setup complete!**

---

## 🔴 Part 4: Upstash Redis Setup (Rate Limiting)

**Why this is needed**: Protects your API from spam and DoS attacks by limiting how many requests each user can make per minute.

### Step 4.1: Create Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Click **"Get Started"** or **"Sign Up"**
3. Sign up with:
   - Email (recommended)
   - Or GitHub/Google
4. Verify your email if required

### Step 4.2: Create Redis Database

1. After logging in, click **"Create Database"**
2. Fill in the form:
   - **Name**: `ai-phone-ratelimit` (or any name you prefer)
   - **Type**: Select **"Regional"**
   - **Region**: Choose closest to your users (e.g., `us-east-1` for US East Coast)
   - **Eviction**: **Enable** (recommended - automatically cleans old data)
   - **TLS**: Enabled (default - leave checked)
3. Click **"Create"**

Wait 10-15 seconds for provisioning.

### Step 4.3: Get Your Credentials

1. You'll be on the database details page
2. Scroll down to the **"REST API"** section
3. You'll see two values:

| Field | Example | Environment Variable |
|-------|---------|---------------------|
| **UPSTASH_REDIS_REST_URL** | `https://your-db.upstash.io` | Copy this |
| **UPSTASH_REDIS_REST_TOKEN** | `AaoJAAInc...` | Copy this |

4. **Copy both values** - you'll need them in the next step

**What this does**:
- Creates a serverless Redis database
- Used to track API request counts per user
- Automatically resets every 60 seconds
- Free tier: 10,000 commands/day (more than enough for development)

✅ **Upstash Redis setup complete!**

---

## ⚙️ Part 5: Configure Your Application

### Step 5.1: Install Dependencies

```bash
# Navigate to your project folder
cd fiverproduct

# Install all dependencies
npm install
```

Wait for installation to complete (2-3 minutes).

### Step 5.2: Create Environment File

```bash
# Copy the example file
cp .env.example .env.local
```

**Windows users**: If `cp` doesn't work, manually:
1. Copy `.env.example`
2. Rename the copy to `.env.local`

### Step 5.3: Fill in Environment Variables

Open `.env.local` in your code editor and fill in:

```bash
# ============================================
# SUPABASE CONFIGURATION (from Part 1)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# RETELL AI CONFIGURATION (from Part 2)
# ============================================
RETELL_API_KEY=your-retell-api-key-here

# ============================================
# UPSTASH REDIS (from Part 4)
# ============================================
UPSTASH_REDIS_REST_URL=https://your-database-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here

# ============================================
# WEBHOOK SECURITY (generate new random string)
# ============================================
CRON_SECRET=your-random-32-character-secret

# ============================================
# YOUR BUSINESS CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/your-link
```

### Step 5.4: Generate CRON_SECRET

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Copy the output and paste as your `CRON_SECRET`.

**Or use an online generator**: [Random.org](https://www.random.org/strings/)
- Generate 1 string, 32 characters, uppercase + lowercase + digits

✅ **Configuration complete!**

---

## 🚀 Part 6: Run Your Application

### Step 6.1: Start Development Server

```bash
npm run dev
```

You should see:
```
✅ Environment validation passed
📊 Required variables: 5
🔒 Sensitive variables are properly protected
  ▲ Next.js 16.0.3
  - Local:        http://localhost:3000
```

### Step 6.2: Open in Browser

1. Open [http://localhost:3000](http://localhost:3000)
2. You should see the login page

### Step 6.3: Login

1. Enter the email and password you created in Part 1, Step 1.5
2. Click **"Sign In"**
3. You should be redirected to `/dashboard`

🎉 **Success!** Your app is running locally!

---

## 🌐 Part 6: Deploy to Production (Vercel)

### Step 6.1: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 6.2: Deploy to Vercel

1. Go to [https://vercel.com/](https://vercel.com/)
2. Click **"Add New" → "Project"**
3. Import your GitHub repository
4. Click **"Import"**

### Step 6.3: Add Environment Variables

In the Vercel import screen:

1. Click **"Environment Variables"** section
2. Add each variable from your `.env.local`:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | **Secret** |
| `RETELL_API_KEY` | Your Retell key | **Secret** |
| `CRON_SECRET` | Your cron secret | **Secret** |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Your support email | Public |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | Your Stripe link | Public |

3. Click **"Deploy"**

### Step 6.4: Setup Webhook Cron Job

After deployment completes:

1. Go to your project in Vercel
2. Click **"Settings" → "Cron Jobs"**
3. Click **"Add Cron Job"**
4. Fill in:
   - **Path**: `/api/webhooks/process-queue`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
5. Click **"Create"**
6. Add custom header:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_CRON_SECRET` (replace with your actual secret)
7. Click **"Save"**

✅ **Deployment complete!**

Your app is now live at: `https://your-project.vercel.app`

---

## ✅ Verification Checklist

After setup, verify everything works:

### Local Development
- [ ] `npm run dev` starts without errors
- [ ] No environment variable errors
- [ ] Login page loads at `http://localhost:3000`
- [ ] Can login with test user
- [ ] Dashboard loads and shows 0 calls
- [ ] Minutes counter shows correct balance (1000/1000)
- [ ] Theme toggle works (dark/light mode)
- [ ] Mobile navigation works

### Production (if deployed)
- [ ] Site loads at Vercel URL
- [ ] Can login
- [ ] Dashboard works
- [ ] Stripe payment link opens correctly
- [ ] Support email works when clicked

---

## 🐛 Common Issues & Solutions

### Issue: "MISSING ENVIRONMENT VARIABLES" Error

**Cause**: `.env.local` file is missing or incomplete

**Solution**:
1. Check `.env.local` exists in project root (same folder as `package.json`)
2. Verify all 7 variables are filled in
3. No extra spaces around the `=` sign
4. Restart dev server: Stop (Ctrl+C) then `npm run dev`

---

### Issue: "Failed to connect to database"

**Cause**: Supabase credentials are incorrect

**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Copy URL and keys again (don't copy extra spaces)
3. Ensure you copied the full key (very long string)
4. Update `.env.local`
5. Restart server

---

### Issue: Can't Login - "Invalid credentials"

**Cause**: User doesn't exist or client record is missing

**Solution**:
1. Go to Supabase → Authentication → Users
2. Verify user exists
3. Go to Table Editor → `clients` table
4. Verify a row exists with matching `user_id`
5. If not, create one (see Part 1, Step 1.6)

---

### Issue: Minutes counter shows 0/0

**Cause**: Client record doesn't exist or has 0 minutes

**Solution**:
1. Go to Supabase → Table Editor → `clients`
2. Find your user's row
3. Edit `minutes_included` to 1000
4. Edit `minutes_used` to 0
5. Click Save
6. Refresh your dashboard

---

### Issue: Stripe button says "Payment link not configured"

**Cause**: `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is empty or invalid

**Solution**:
1. Check `.env.local` has the Stripe payment link
2. Verify it starts with `https://buy.stripe.com/`
3. Restart dev server
4. If deployed to Vercel: Add env var in Vercel dashboard

---

### Issue: Build fails with TypeScript errors

**Cause**: Dependencies or Next.js cache issues

**Solution**:
```bash
# Stop dev server (Ctrl+C)

# Clear cache
rm -rf .next
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Try again
npm run dev
```

---

## 📞 Getting Help

If you're still stuck:

1. **Check the main README.md** - Has troubleshooting section
2. **Review Supabase logs**: Dashboard → Logs → Filter by error
3. **Check browser console**: Press F12 → Console tab
4. **Verify all environment variables** are correct

**Support Channels**:
- Email support (check your product purchase details)
- Supabase Discord: [https://discord.supabase.com/](https://discord.supabase.com/)
- Next.js Discord: [https://discord.gg/nextjs](https://discord.gg/nextjs)

---

## 🎓 Next Steps

After successful setup:

1. **Create your first AI agent** via Retell dashboard
2. **Test a call** and watch minutes decrease
3. **Customize the theme** (see `app/globals.css`)
4. **Add your branding** (logo, colors)
5. **Set up custom domain** in Vercel
6. **Enable Stripe webhooks** for automated payment processing

---

## 🔒 Security Reminders

- ✅ Never commit `.env.local` to git (it's already in `.gitignore`)
- ✅ Use different credentials for development and production
- ✅ Enable 2FA on all service accounts (Supabase, Vercel, Stripe)
- ✅ Rotate `CRON_SECRET` every 90 days
- ✅ Review Supabase RLS policies before going live

---

**Setup Complete! 🎉**

You now have a fully functional AI Phone Agents monitoring platform running locally and (optionally) deployed to production.
