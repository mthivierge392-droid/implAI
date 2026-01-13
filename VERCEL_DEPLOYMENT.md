# 🚀 One-Click Vercel Deployment Guide

This guide shows you how to deploy your AI Phone Agents platform to Vercel in **under 10 minutes**.

---

## 🎯 What You'll Get

- ✅ Live production URL (e.g., `https://your-app.vercel.app`)
- ✅ Free SSL certificate (HTTPS)
- ✅ Automatic deployments on git push
- ✅ Edge network for fast loading worldwide
- ✅ Free tier (sufficient for most use cases)

---

## 📋 Prerequisites

Before deploying, you need:

1. ✅ **GitHub account** - [Sign up free](https://github.com/signup)
2. ✅ **Vercel account** - [Sign up free](https://vercel.com/signup)
3. ✅ **All API keys ready** from Supabase, Retell AI, Stripe, Upstash
4. ✅ **Code working locally** (tested with `npm run dev`)

---

## 🚀 Method 1: Deploy via GitHub (Recommended)

### Step 1: Push Code to GitHub

```bash
# Navigate to your project folder
cd ai-phone-agents-platform

# Initialize git (if not done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - AI Phone Agents Platform"

# Create new repository on GitHub:
# 1. Go to https://github.com/new
# 2. Name: "ai-phone-agents-platform" (or any name)
# 3. Set to Private (recommended)
# 4. Do NOT initialize with README (you already have one)
# 5. Click "Create repository"

# Link to your GitHub repo (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Connect Vercel to GitHub

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub repository
4. Click **"Import"**

### Step 3: Configure Environment Variables

In the Vercel import screen:

1. Click **"Environment Variables"** section
2. Add each variable from your `.env.local`:

| Variable Name | Where to Get | Required |
|---------------|--------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → API | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → API | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API | ✅ Yes |
| `RETELL_API_KEY` | Retell Dashboard → API Keys | ✅ Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash → REST API section | ✅ Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → REST API section | ✅ Yes |
| `CRON_SECRET` | Generate with `openssl rand -base64 32` | ✅ Yes |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Your support email | ✅ Yes |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | Stripe Payment Link URL | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | ⚠️ Optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | ⚠️ Optional |
| `STRIPE_PRICE_ID` | Stripe Product → Pricing | ⚠️ Optional |
| `STRIPE_MINUTES_PER_UNIT` | Number of minutes per purchase | ⚠️ Optional |
| `RESEND_API_KEY` | Resend Dashboard | ⚠️ Optional |
| `RESEND_FROM_EMAIL` | Your verified domain email | ⚠️ Optional |

**How to add each variable:**
- Click **"Add Environment Variable"**
- Enter **Name** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
- Paste **Value** (the actual key from your service)
- Click **"Add"**
- Repeat for all variables

### Step 4: Deploy

1. Click **"Deploy"** button
2. Wait 2-3 minutes for build to complete
3. You'll see: "🎉 Congratulations! Your deployment is ready."
4. Click **"Visit"** to see your live site

---

## 🚀 Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### Step 3: Deploy

```bash
# Navigate to your project folder
cd ai-phone-agents-platform

# Deploy to Vercel
vercel
```

You'll be asked:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (first time)
- **What's your project's name?** → ai-phone-agents-platform
- **In which directory is your code located?** → ./ (press Enter)

### Step 4: Add Environment Variables

```bash
# Add each environment variable (one at a time)
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Paste your Supabase URL when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste your Supabase anon key when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste your service role key when prompted

# Repeat for all variables...
# (See table in Method 1 for full list)
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

Your site will be live at: `https://your-project.vercel.app`

---

## ⚙️ Post-Deployment Configuration

### 1. Set Up Webhook Cron Job

The platform needs a cron job to process webhook tasks every 5 minutes.

**In Vercel Dashboard:**

1. Go to your project → **Settings** → **Cron Jobs**
2. Click **"Create Cron Job"**
3. Fill in:
   - **Path**: `/api/webhooks/process-queue`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
4. Click **"Create"**
5. Add a custom header:
   - Click **"Add Header"**
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_CRON_SECRET` (replace with your actual CRON_SECRET)
6. Click **"Save"**

### 2. Update Supabase Site URL

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://your-app.vercel.app`
3. Add to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`
4. Click **"Save"**

### 3. Set Up Custom Domain (Optional)

**If you own a domain:**

1. In Vercel Dashboard → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (5-60 minutes)

---

## 🔄 Automatic Deployments

After initial setup, Vercel automatically deploys when you:

1. Push to GitHub main branch
2. Create a pull request (creates preview deployment)

**To redeploy manually:**
```bash
git add .
git commit -m "Update feature X"
git push
```

Vercel automatically detects the push and redeploys.

---

## 🐛 Troubleshooting

### Build Failed - Missing Environment Variables

**Solution:**
1. Go to Vercel Dashboard → **Settings** → **Environment Variables**
2. Verify all required variables are added
3. Click **"Deployments"** → **"Redeploy"**

### Build Failed - TypeScript Errors

**Solution:**
```bash
# Locally, test the build
npm run build

# Fix any TypeScript errors
# Then push to GitHub
git add .
git commit -m "Fix build errors"
git push
```

### Runtime Error - Supabase Connection Failed

**Solution:**
1. Check environment variables in Vercel
2. Ensure `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
3. Verify Supabase project is active (not paused)
4. Check Supabase dashboard logs

### Webhook Cron Not Running

**Solution:**
1. Verify cron job exists in Vercel → Settings → Cron Jobs
2. Check `Authorization` header is set correctly
3. Test manually: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/webhooks/process-queue`

---

## 📊 Monitoring Your Deployment

### Vercel Logs

1. Go to Vercel Dashboard → **Deployments**
2. Click on a deployment
3. Click **"Logs"** to see runtime logs

### Real-time Logs (CLI)

```bash
vercel logs YOUR_PROJECT_URL --follow
```

---

## 🔒 Production Security Checklist

Before going live with real customers:

- [ ] All environment variables set in Vercel
- [ ] Supabase Row Level Security (RLS) enabled
- [ ] Stripe in **Live Mode** (not test mode)
- [ ] Custom domain configured (optional but professional)
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Cron job configured and working
- [ ] Test user login/logout
- [ ] Test payment flow end-to-end
- [ ] Review Supabase logs for errors
- [ ] Enable 2FA on Vercel account
- [ ] Add team members if needed

---

## 💡 Pro Tips

1. **Use Preview Deployments**: Every PR gets a unique URL for testing
2. **Environment Variables by Environment**: Set different keys for Production vs Preview
3. **Automatic Rollbacks**: If deployment fails, Vercel keeps previous version live
4. **Analytics**: Enable Vercel Analytics in project settings (free on Pro plan)
5. **Edge Functions**: Vercel automatically optimizes API routes

---

## 📞 Need Help?

- **Vercel Docs**: [https://vercel.com/docs](https://vercel.com/docs)
- **Vercel Discord**: [https://vercel.com/discord](https://vercel.com/discord)
- **Build Errors**: Check Vercel deployment logs
- **Runtime Errors**: Check Vercel function logs

---

## 🎉 You're Live!

Your AI Phone Agents platform is now deployed and accessible worldwide!

**Share your URL**: `https://your-app.vercel.app`

**Next Steps**:
1. Create your first user via Supabase
2. Login to your dashboard
3. Test the platform end-to-end
4. Customize branding (see CUSTOMIZATION_GUIDE.md)
5. Set up Stripe payments
6. Invite team members

---

**Made with ❤️ - Enjoy your production deployment!**
