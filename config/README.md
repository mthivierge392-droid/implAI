# Configuration

This directory contains centralized configuration for the platform.

## 📄 `site.ts`

Main configuration file for company branding, legal information, and URLs.

**👉 For full customization instructions, see: [../CUSTOMIZATION_GUIDE.md](../CUSTOMIZATION_GUIDE.md)**

That guide explains:
- How to update company name and support email
- What gets automatically updated when you change `site.ts`
- Complete customization checklist

---

**Quick Example:**

```typescript
export const siteConfig = {
  company: {
    name: "Your Company Name",
    supportEmail: "support@yourcompany.com",
  },
  legal: {
    jurisdiction: "United States",
    lastUpdated: "2024-01-01",
  },
  urls: {
    website: "https://yourcompany.com",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },
}
```
