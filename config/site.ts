// config/site.ts
// Centralized configuration for easy customization

export const siteConfig = {
  // Company Information
  company: {
    name: "AI Phone Agents Dashboard",
    supportEmail: "support@example.com",
  },

  // Legal Information
  legal: {
    jurisdiction: "United States",
    lastUpdated: "2024-01-01",
  },

  // URLs
  urls: {
    website: "https://example.com",
    privacy: "/legal/privacy",
    terms: "/legal/terms",
  },
} as const;

export type SiteConfig = typeof siteConfig;
