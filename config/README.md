# Configuration Guide

This directory contains the centralized configuration for the SaaS platform.

## 📁 Files

### `site.ts`
Main configuration file for company information, legal details, and URLs.

## 🔧 How to Customize for Your Clients

When selling this SaaS to a client, they should update the following values in `config/site.ts`:

```typescript
export const siteConfig = {
  // Company Information
  company: {
    name: "Your Client's Company Name",        // ← Change this
    supportEmail: "support@clientdomain.com",  // ← Change this
  },

  // Legal Information
  legal: {
    jurisdiction: "United States",             // ← Change this (e.g., "California, USA")
    lastUpdated: "2024-01-01",                // ← Change this to deployment date
  },

  // URLs
  urls: {
    website: "https://clientdomain.com",       // ← Change this
    privacy: "/legal/privacy",                 // ← Keep as is (internal route)
    terms: "/legal/terms",                     // ← Keep as is (internal route)
  },
} as const;
```

## 🎯 What This Config Controls

### Company Name
- Footer copyright text: "© 2024 [Company Name]. All rights reserved."
- Privacy Policy page title and content
- Terms of Service page title and content

### Support Email
- Contact links in Privacy Policy
- Contact links in Terms of Service

### Legal Information
- Jurisdiction for Terms of Service
- Last updated dates for legal documents

### URLs
- Privacy Policy link in footer
- Terms of Service link in footer
- Website reference in legal documents

## ✅ Easy Customization Process

1. Open `config/site.ts`
2. Update the values in the `siteConfig` object
3. Save the file
4. No need to rebuild - changes take effect immediately in development
5. Run `npm run build` for production deployment

## 🚀 Benefits

- **One File to Update**: All branding changes in a single location
- **Type-Safe**: TypeScript ensures no typos or missing values
- **Consistent**: Company name appears the same everywhere
- **Easy for Non-Technical Users**: Simple key-value pairs to modify

## 📝 Example

If your client is "Acme Corporation":

```typescript
export const siteConfig = {
  company: {
    name: "Acme Corporation",
    supportEmail: "support@acme.com",
  },
  legal: {
    jurisdiction: "Delaware, USA",
    lastUpdated: "2024-03-15",
  },
  urls: {
    website: "https://acme.com",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },
} as const;
```

The footer will automatically display: "© 2024 Acme Corporation. All rights reserved."
