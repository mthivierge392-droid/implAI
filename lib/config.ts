/**
 * Application Configuration
 *
 * IMPORTANT FOR BUYERS:
 * These values are pulled from environment variables (.env.local)
 * Make sure to configure them before deploying to production
 */

export const APP_CONFIG = {
  // Support email - customers will see this when they need help
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@yourdomain.com',

  urls: {
    // Stripe payment link for buying minutes
    // Get this from: Stripe Dashboard → Products → Payment Links
    stripePayment: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/your-payment-link-here'
  }
} as const;