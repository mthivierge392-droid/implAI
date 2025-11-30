/**
 * Central Application Configuration
 * 
 * 🎯 PURPOSE: Single source of truth for all app settings
 * 🔒 SECURITY: All secrets MUST come from environment variables
 * ✅ SCALING: Developers can add new config values here
 * 
 * ⚠️ CRITICAL: DO NOT hardcode secrets. Use .env.local instead.
 */

export const APP_CONFIG = {
  // Branding - Safe defaults, override in .env.local
  name: process.env.NEXT_PUBLIC_APP_NAME || 'AI Phone Agents',
  description: process.env.NEXT_PUBLIC_APP_DESC || 'Real-time AI phone agent monitoring platform',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@yourapp.com', // ✅ Added fallback
  
  // URLs - Must be set in environment
  urls: {
    // ✅ BUYER: Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK in .env.local
    stripePayment: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK!,
    
    // External APIs
    retell: {
      baseUrl: 'https://api.retellai.com',
      webhookPath: '/api/webhooks/retell',
    },
  },
  
  // UI Configuration
  ui: {
    toastDuration: 5000, // 5 seconds
    maxSearchLength: 20,
    itemsPerPage: 50,
  },
  
  // Feature Flags - Enable with environment variables
  features: {
    // Set NEXT_PUBLIC_ENABLE_STRIPE=true in .env.local to enable
    stripeIntegration: process.env.NEXT_PUBLIC_ENABLE_STRIPE === 'true',
    
    // Set NEXT_PUBLIC_ENFORCE_MINUTES=false to disable limits (for testing)
    enforceMinuteLimits: process.env.NEXT_PUBLIC_ENFORCE_MINUTES !== 'false',
  },
} as const;

/**
 * Type helper for config values
 * @example const email: AppConfig['supportEmail'] = 'test@example.com'
 */
export type AppConfig = typeof APP_CONFIG;