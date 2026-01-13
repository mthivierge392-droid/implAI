# 🚀 Whop Quick Start Guide

Welcome! You've purchased the **AI Phone Agents Monitoring Platform** on Whop.

---

## 📦 What You Got

A complete, production-ready SaaS platform for monitoring AI phone agents:
- ✅ Next.js 16 + React 19 + TypeScript
- ✅ Real-time dashboard with call analytics
- ✅ Stripe payment integration
- ✅ Mobile-responsive UI with dark/light theme
- ✅ Complete authentication & database setup
- ✅ All documentation included

---

## ⚡ Getting Started (3 Steps)

### **Step 1: Extract & Install**
```bash
# Extract the ZIP file, then:
cd ai-phone-agents-platform
npm install
```

### **Step 2: Set Up API Keys**
```bash
# Copy the template
cp .env.example .env.local
```

Fill in your API keys from these services (all have free tiers):
- **Supabase** (database) - [https://supabase.com](https://supabase.com)
- **Retell AI** (phone agents) - [https://retellai.com](https://retellai.com)
- **Stripe** (payments) - [https://stripe.com](https://stripe.com)
- **Upstash Redis** (rate limiting) - [https://upstash.com](https://upstash.com)

**👉 See [SETUP.md](SETUP.md) for detailed instructions on getting each API key.**

### **Step 3: Run Locally**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 📚 Full Documentation

**Start with these:**
- **[SETUP.md](SETUP.md)** - Complete setup walkthrough (30-40 min)
- **[VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)** - Deploy to production
- **[CUSTOMIZATION_GUIDE.md](CUSTOMIZATION_GUIDE.md)** - Add your branding

**Additional guides:**
- **[README.md](README.md)** - Technical overview & features
- **[STRIPE_SETUP.md](STRIPE_SETUP.md)** - Payment integration
- **[SCHEMA_DEPLOYMENT_GUIDE.md](SCHEMA_DEPLOYMENT_GUIDE.md)** - Database setup

---

## 🚀 Deploy to Vercel (Optional)

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# Then deploy at: https://vercel.com/new
```

**See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for step-by-step instructions.**

---

## 🔐 Security Reminder

- ✅ NEVER commit `.env.local` to GitHub (already in `.gitignore`)
- ✅ NEVER share your Supabase service_role key
- ✅ Use Stripe test mode until ready for production

---

## 📞 Need Help?

1. **Setup issues?** Read [SETUP.md](SETUP.md)
2. **Deployment issues?** Read [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
3. **Customization?** Read [CUSTOMIZATION_GUIDE.md](CUSTOMIZATION_GUIDE.md)

---

**Expected Setup Time:** 30-40 minutes
**Skill Level:** Beginner-friendly

🎉 **Enjoy your AI Phone Agents platform!**
