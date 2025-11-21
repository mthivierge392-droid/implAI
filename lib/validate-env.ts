// lib/validate-env.ts
/**
 * Validate required environment variables on startup
 * Prevents silent failures in production
 */
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'RETELL_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file`
    );
  }

  console.log('✅ Environment validation passed');
}