# 🤖 AI Phone Agents Monitoring Platform

A professional, production-ready SaaS platform for monitoring and managing AI phone agents powered by Retell AI. Built with Next.js 16, React 19, TypeScript, and Supabase.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2FYOUR_REPO&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,RETELL_API_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN,CRON_SECRET,NEXT_PUBLIC_SUPPORT_EMAIL,NEXT_PUBLIC_STRIPE_PAYMENT_LINK)

---

## ✨ Features

### 📊 Real-Time Dashboard
- Live call monitoring with WebSocket updates
- Agent performance metrics
- Call history with transcripts
- Success rate tracking
- Average call duration analytics

### 💰 Minutes Management System
- Automatic call duration tracking
- Real-time minute deduction
- Low balance warnings
- Stripe payment integration for minute purchases
- Automatic agent fallback when minutes run out

### 🔐 Enterprise Security
- Supabase authentication with Row Level Security (RLS)
- Secure API endpoints with webhook validation
- Rate limiting with Upstash Redis (prevents DoS attacks)
- XSS protection on all user inputs
- Environment variable validation on startup
- Service role isolation for admin operations

### 🎨 Modern UI/UX
- Beautiful glassmorphism design
- Dark/Light theme support
- Fully responsive (mobile, tablet, desktop)
- Real-time toast notifications
- Skeleton loading states
- Professional mobile navigation

### ⚡ Performance Optimized
- React Query for intelligent caching
- Optimized database queries (count queries)
- Indexed database lookups
- Next.js 16 with Turbopack
- Lazy loading and code splitting

### 🔧 Developer Experience
- Full TypeScript coverage
- Zod schema validation
- Centralized configuration
- Comprehensive error handling
- ESLint setup
- Environment validation

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Rate Limiting**: Upstash Redis
- **Payments**: Stripe (Payment Links)
- **AI Phone**: Retell AI
- **Deployment**: Vercel
- **State Management**: Zustand, React Query

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **npm** or **yarn** package manager
3. **Supabase Account** - [Sign up](https://supabase.com/)
4. **Retell AI Account** - [Sign up](https://retellai.com/)
5. **Upstash Account** - [Sign up](https://upstash.com/) (Free tier available)
6. **Stripe Account** - [Sign up](https://stripe.com/)
7. **Vercel Account** (for deployment) - [Sign up](https://vercel.com/)
8. **Git** installed on your machine

---

## 🚀 Quick Start Guide

> **Purchased via Whop?** See [WHOP_QUICK_START.md](WHOP_QUICK_START.md) for a simplified setup guide.

### Step 1: Clone & Install

```bash
# Extract the downloaded ZIP file
cd ai-phone-agents-platform

# Install dependencies
npm install
```

### Step 2: Set Up Supabase

1. **Create a new Supabase project**:
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Click "New Project"
   - Choose organization, name, database password, region

2. **Run the database schema**:
   - In Supabase Dashboard → SQL Editor → New Query
   - Copy the entire contents of `supabase/migrations/schema.sql`
   - Click "Run" to execute

3. **Get your Supabase credentials**:
   - Go to Project Settings → API
   - Copy:
     - `Project URL` → This is `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → This is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` key → This is `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**

4. **Enable Realtime** (should be automatic after running schema):
   - Database → Replication → Enable for `clients` and `call_history` tables

### Step 3: Set Up Retell AI

1. **Create a Retell AI account**: [Retell Dashboard](https://beta.retellai.com/)

2. **Get your API key**:
   - Go to Settings → API Keys
   - Create a new API key
   - Copy it → This is `RETELL_API_KEY`

3. **Create your first agent** (via Retell Dashboard):
   - You'll get an `agent_id` and `llm_id` - save these

### Step 4: Set Up Stripe (Optional but Recommended)

1. **Create a Stripe product**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Products → Add Product
   - Name: "AI Phone Minutes" (or similar)
   - Create pricing tiers

2. **Create a Payment Link**:
   - Payment Links → New
   - Select your product
   - Copy the payment link URL → This is `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`

3. **Get your email for support**:
   - Decide on a support email → This is `NEXT_PUBLIC_SUPPORT_EMAIL`

### Step 5: Set Up Upstash Redis (Rate Limiting)

**Why needed**: Protects your API from abuse and DoS attacks by limiting requests per user.

1. **Create Upstash account**:
   - Go to [https://upstash.com/](https://upstash.com/)
   - Sign up (free tier available)

2. **Create a Redis database**:
   - Click **"Create Database"**
   - Choose:
     - **Name**: `ai-phone-agents-ratelimit` (or any name)
     - **Type**: Regional
     - **Region**: Choose closest to your users
     - **Eviction**: Enable (recommended for automatic cleanup)
   - Click **"Create"**

3. **Get your credentials**:
   - In the database details page, scroll to **"REST API"** section
   - Copy these two values:
     - **UPSTASH_REDIS_REST_URL** → Your database URL
     - **UPSTASH_REDIS_REST_TOKEN** → Your access token

**What this does**: Enables rate limiting (10 requests per minute per user) on sensitive API endpoints to prevent spam and DoS attacks.

### Step 6: Configure Environment Variables

1. **Copy the example file**:
```bash
cp .env.example .env.local
```

2. **Edit `.env.local`** and fill in ALL values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Retell AI Configuration
RETELL_API_KEY=your-retell-api-key-here

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-database-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here

# Webhook Security (generate with: openssl rand -base64 32)
CRON_SECRET=your-random-32-character-secret-here

# Your Configuration
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=https://buy.stripe.com/your-payment-link
```

3. **Generate CRON_SECRET**:
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 7: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 8: Create Your First User

1. **Sign up via Supabase**:
   - Go to Supabase Dashboard → Authentication → Users
   - Click "Add User" → Email
   - Create a user with email/password

2. **Create client record**:
   - Go to Table Editor → `clients` table
   - Insert new row:
     - `user_id`: Copy the UUID from the user you just created
     - `company_name`: Your company name
     - `email`: Same as user email
     - `minutes_included`: 1000 (or any starting amount)
     - `minutes_used`: 0

3. **Login** at [http://localhost:3000](http://localhost:3000)

### Step 9: Customize Company Branding (Optional)

Easily customize the company name, support email, and legal information:

1. **Edit** `config/site.ts`:
```typescript
export const siteConfig = {
  company: {
    name: "Your Company Name",           // ← Change this
    supportEmail: "support@example.com", // ← Change this
  },
  legal: {
    jurisdiction: "United States",       // ← Change this
    lastUpdated: "2024-01-01",          // ← Change this
  },
  urls: {
    website: "https://example.com",      // ← Change this
    privacy: "/legal/privacy",           // Keep as is
    terms: "/legal/terms",               // Keep as is
  },
};
```

2. This automatically updates:
   - Footer copyright text
   - Privacy Policy page
   - Terms of Service page
   - All branding throughout the platform

3. See `config/README.md` for detailed instructions

---

## 📦 Deployment to Vercel

**For detailed deployment instructions, see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)**

Quick overview:
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

---

## 🔧 Configuration

### Setting Up Webhook Queue Processing

The platform uses a queue system for handling minute exhaustion (reassigning phone numbers to fallback agents).

**Option 1: Vercel Cron Jobs** (Recommended)

1. The `vercel.json` is already configured
2. Add a cron job in Vercel Dashboard:
   - Settings → Cron Jobs → Add Cron Job
   - Path: `/api/webhooks/process-queue`
   - Schedule: `*/5 * * * *` (every 5 minutes)
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

**Option 2: External Cron Service**

Use a service like [cron-job.org](https://cron-job.org/):
- URL: `https://your-domain.com/api/webhooks/process-queue`
- Schedule: Every 5 minutes
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 🗂️ Project Structure

```
fiverproduct/
├── app/
│   ├── api/
│   │   ├── retell/update-llm/    # API for updating agent prompts
│   │   └── webhooks/process-queue/ # Webhook queue processor
│   ├── auth/callback/            # OAuth callback handler
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── agents/               # Agents management
│   │   ├── call-history/         # Call logs
│   │   └── page.tsx              # Dashboard overview
│   ├── layout.tsx                # Root layout with env validation
│   └── page.tsx                  # Login page
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── LoginForm.tsx             # Authentication form
│   ├── MinutesCounter.tsx        # Real-time minutes display
│   ├── StripeBanner.tsx          # Payment CTA banner
│   └── mobile-nav.tsx            # Mobile navigation
├── lib/
│   ├── supabase.ts               # Client-side Supabase client
│   ├── supabase-server.ts        # Server-side Supabase client
│   ├── config.ts                 # App configuration
│   ├── constants.ts              # App constants
│   ├── validate-env.ts           # Environment validation
│   └── utils.ts                  # Utility functions
├── store/
│   └── authStore.ts              # Zustand auth state
├── supabase/
│   ├── migrations/schema.sql     # Database schema
│   └── functions/                # Edge functions
├── .env.example                  # Environment template
├── vercel.json                   # Vercel configuration
└── README.md                     # This file
```

---

## 🐛 Troubleshooting

### Environment Variable Errors on Startup

**Problem**: Red screen with "MISSING ENVIRONMENT VARIABLES"

**Solution**:
1. Ensure `.env.local` exists in project root
2. All required variables are filled in
3. No typos in variable names
4. Restart dev server: `npm run dev`

### Database Connection Errors

**Problem**: "Failed to connect to database" or similar

**Solution**:
1. Check Supabase project is active (not paused)
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Ensure database schema was run successfully
4. Check RLS policies are enabled

### Authentication Issues

**Problem**: Can't login or "Not authenticated" errors

**Solution**:
1. Verify user exists in Supabase → Authentication → Users
2. Ensure `clients` table has matching `user_id` record
3. Check browser console for specific error messages
4. Try clearing cookies and localStorage

### Minutes Not Updating

**Problem**: Call completed but minutes don't decrease

**Solution**:
1. Check if `trigger_deduct_minutes` trigger exists in database
2. Verify `call_history` table insert succeeded
3. Check Supabase logs for trigger errors
4. Ensure Realtime is enabled for `clients`table

### Stripe Payment Link Not Working

**Problem**: "Payment link not configured" error

**Solution**:
1. Verify `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is set in `.env.local`
2. For Vercel: Add to environment variables in dashboard
3. Restart dev server or redeploy

### Build Errors

**Problem**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run build
```

---

## 📚 API Endpoints

### Authentication
- `GET /auth/callback` - OAuth callback handler

### Agents
- `PATCH /api/retell/update-llm` - Update agent prompt (requires auth)

### Webhooks
- `POST /api/webhooks/process-queue` - Process webhook jobs (requires CRON_SECRET)

---

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore` by default
2. **Rotate `CRON_SECRET`** periodically
3. **Use Vercel environment variables** for production
4. **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - Never expose in client code
5. **Enable 2FA** on Supabase, Stripe, and Vercel accounts
6. **Review Supabase RLS policies** before going live
7. **Set up Stripe webhooks** for production payment tracking

---

## 🎯 Post-Deployment Checklist

After deploying to production:

- [ ] All environment variables configured in Vercel
- [ ] Supabase database schema applied
- [ ] First admin user created
- [ ] Webhook cron job configured
- [ ] Stripe payment link tested
- [ ] Support email configured
- [ ] Domain configured (if custom)
- [ ] SSL certificate active
- [ ] Test login/logout flow
- [ ] Test agent creation
- [ ] Test call logging
- [ ] Test minutes deduction
- [ ] Test payment flow

---

## 📞 Support

For issues or questions:
- Email: `NEXT_PUBLIC_SUPPORT_EMAIL` (configured in your .env.local)
- Check `SETUP.md` for detailed setup guides
- Review Supabase logs for backend errors
- Check Vercel deployment logs for production issues

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Retell AI](https://retellai.com/) - AI Phone Agents
- [Stripe](https://stripe.com/) - Payment processing
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Lucide Icons](https://lucide.dev/) - Icons

---

**Made with ❤️ for building production-ready AI phone agent platforms**
