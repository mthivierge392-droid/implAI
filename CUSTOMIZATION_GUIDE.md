# 🎨 SaaS Customization Guide for Whop Buyers

This guide explains how to easily customize the branding and legal information for your clients.

---

## 🚀 Quick Customization (5 Minutes)

### Step 1: Company Branding

Edit the file: **`config/site.ts`**

```typescript
export const siteConfig = {
  // Company Information
  company: {
    name: "AI Phone Agents Dashboard",        // ← Change to client's company name
    supportEmail: "support@example.com",      // ← Change to client's support email
  },

  // Legal Information
  legal: {
    jurisdiction: "United States",             // ← Change to client's jurisdiction
    lastUpdated: "2024-01-01",                // ← Update to deployment date
  },

  // URLs
  urls: {
    website: "https://example.com",            // ← Change to client's website
    privacy: "/legal/privacy",                 // Keep as is
    terms: "/legal/terms",                     // Keep as is
  },
} as const;
```

**That's it!** This single file controls:
- ✅ Footer copyright text
- ✅ Privacy Policy page content
- ✅ Terms of Service page content
- ✅ Contact email links throughout the platform

---

## 🔍 What Gets Updated Automatically

### Footer (All Pages)
**Before:**
```
© 2024 AI Phone Agents Dashboard. All rights reserved.
```

**After (Example: Client = "Acme Corp"):**
```
© 2024 Acme Corp. All rights reserved.
```

### Legal Pages
- **Privacy Policy** (`/legal/privacy`):
  - Page title: "Privacy Policy | [Company Name]"
  - Content references: "when you use our [Company Name] service"
  - Contact: Links to `supportEmail`

- **Terms of Service** (`/legal/terms`):
  - Page title: "Terms of Service | [Company Name]"
  - Content references: "By accessing or using [Company Name]"
  - Contact: Links to `supportEmail`

---

## 📍 Where the Footer Appears

The footer is **sticky at the bottom** and appears on:
- ✅ Login page
- ✅ All dashboard pages (Overview, Agents, Call History)
- ✅ Privacy Policy page
- ✅ Terms of Service page

**Position:** Always at the bottom of the page, regardless of content length.

---

## 🎯 Client Onboarding Checklist

When setting up for a new client:

- [ ] **Update `config/site.ts`**:
  - [ ] Company name
  - [ ] Support email
  - [ ] Jurisdiction
  - [ ] Last updated date
  - [ ] Website URL

- [ ] **Update `.env.local`** (API Credentials):
  - [ ] Supabase URL and keys
  - [ ] Retell AI API key
  - [ ] Upstash Redis credentials
  - [ ] Stripe payment link
  - [ ] Support email (NEXT_PUBLIC_SUPPORT_EMAIL)
  - [ ] CRON_SECRET

- [ ] **Test the platform**:
  - [ ] Login page loads
  - [ ] Footer displays correct company name
  - [ ] Privacy Policy shows correct information
  - [ ] Terms of Service shows correct information
  - [ ] All links work

- [ ] **Deploy to Vercel**:
  - [ ] Push to GitHub
  - [ ] Connect to Vercel
  - [ ] Add all environment variables
  - [ ] Verify deployment

---

## 🔧 Advanced Customization

### Modifying Legal Content

If your client needs custom legal language:

1. **Privacy Policy**: Edit `app/legal/privacy/page.tsx`
2. **Terms of Service**: Edit `app/legal/terms/page.tsx`

Both files import `siteConfig` and use it for dynamic values, but you can modify the legal text as needed.

### Changing Footer Style

Edit `components/Footer.tsx`:
- Modify layout (single line vs. multi-line)
- Change colors, spacing, or typography
- Add/remove legal links

---

## 💡 Pro Tips

1. **Keep it Simple**: The config file is designed for non-technical clients
2. **Version Control**: Always commit config changes before deployment
3. **Test Locally First**: Run `npm run dev` to preview changes
4. **Production Build**: Run `npm run build` to verify before deploying

---

## 📝 Example Configurations

### Example 1: Local Business
```typescript
{
  company: {
    name: "Smith's AI Solutions",
    supportEmail: "support@smithai.com",
  },
  legal: {
    jurisdiction: "California, USA",
    lastUpdated: "2024-03-15",
  },
  urls: {
    website: "https://smithai.com",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },
}
```

### Example 2: Enterprise Client
```typescript
{
  company: {
    name: "TechCorp Global AI Services",
    supportEmail: "legal@techcorp.com",
  },
  legal: {
    jurisdiction: "Delaware, USA",
    lastUpdated: "2024-04-01",
  },
  urls: {
    website: "https://ai.techcorp.com",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },
}
```

---

## 🆘 Support

For questions about customization:
1. Check `config/README.md` for detailed documentation
2. Check `README.md` for full setup guide
3. Contact the SaaS provider for technical support

---

**Last Updated:** December 2024
