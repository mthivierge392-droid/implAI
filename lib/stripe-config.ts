/**
 * Stripe Minute Packages Configuration
 *
 * This file maps your Stripe Price ID to the number of minutes per unit.
 * Customers can adjust the quantity when purchasing to get more minutes.
 *
 * HOW TO CONFIGURE:
 * 1. Go to Stripe Dashboard → Products
 * 2. Create a product (e.g., "100 Minutes")
 * 3. Add a price to the product (e.g., $10 per 100 minutes)
 * 4. Copy the Price ID (starts with price_...)
 * 5. Add to .env.local:
 *    STRIPE_PRICE_ID=price_1ABC123def456GHI
 *    STRIPE_MINUTES_PER_UNIT=100
 *
 * EXAMPLE:
 * If you create "100 Minutes" product priced at $10,
 * and the Price ID is "price_1ABC123def456GHI":
 *
 * STRIPE_PRICE_ID=price_1ABC123def456GHI
 * STRIPE_MINUTES_PER_UNIT=100
 *
 * When customers purchase:
 * - Quantity 1 → 100 minutes
 * - Quantity 3 → 300 minutes
 * - Quantity 10 → 1000 minutes
 *
 * The webhook automatically multiplies based on quantity!
 */

// Load from environment variables
const priceId = process.env.STRIPE_PRICE_ID || 'price_1ScZiG2NjoUFdMobO1RPBVcq';
const minutesPerUnit = parseInt(process.env.STRIPE_MINUTES_PER_UNIT || '100', 10);

export const MINUTE_PACKAGES: Record<string, number> = {
  [priceId]: minutesPerUnit,
};

/**
 * Helper function to get minutes for a price ID
 */
export function getMinutesForPrice(priceId: string): number | null {
  return MINUTE_PACKAGES[priceId] || null;
}

/**
 * Validate that all required environment variables are set
 */
export function validateStripeConfig(): boolean {
  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ Missing required environment variable: ${key}`);
      return false;
    }
  }

  if (Object.keys(MINUTE_PACKAGES).length === 0) {
    console.warn('⚠️ WARNING: MINUTE_PACKAGES is empty. Add your Stripe Price IDs in lib/stripe-config.ts');
    return false;
  }

  return true;
}
