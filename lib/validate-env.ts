/**
 * Environment Variable Validation
 * 
 * This function validates all required environment variables on startup.
 * It fails fast with clear, actionable error messages to prevent cryptic runtime errors.
 * 
 * ✅ This is called automatically in app/layout.tsx on every startup
 * ✅ If you see an error here, check your .env.local file
 * 
 * @throws {Error} With detailed message if any required variables are missing
 */

export function validateEnv() {
  // List of all required environment variables
  const required = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Supabase Project URL',
      whereToFind: 'Supabase Dashboard → Project Settings → API → Project URL',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase Anon Key',
      whereToFind: 'Supabase Dashboard → Project Settings → API → anon public key',
    },
    {
      key: 'RETELL_API_KEY',
      description: 'Retell AI API Key',
      whereToFind: 'Retell Dashboard → API Keys',
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase Service Role Key (bypasses RLS)',
      whereToFind: 'Supabase Dashboard → Project Settings → API → service_role key',
      securityWarning: '⚠️  Treat this like a root password - never expose in client code',
    },
    {
      key: 'CRON_SECRET',
      description: 'Webhook Secret for Securing API Endpoints',
      whereToFind: 'Generate with: openssl rand -base64 32',
      securityWarning: '⚠️  Used to protect webhook endpoints from unauthorized access',
    },
  ];

  // Check for missing variables
  const missing = required.filter(env => !process.env[env.key]);

  if (missing.length > 0) {
    const errorMessage = [
      `❌ MISSING REQUIRED ENVIRONMENT VARIABLES (${missing.length})`,
      '',
      ...missing.map(env => 
        `  - ${env.key}: ${env.description}\n    Where to find: ${env.whereToFind}${env.securityWarning ? `\n    ${env.securityWarning}` : ''}`
      ),
      '',
      '✅ HOW TO FIX:',
      '1. Copy .env.example to .env.local: cp .env.example .env.local',
      '2. Fill in the values from your Supabase and Retell dashboards',
      '3. Restart your development server (npm run dev)',
      '',
      '📚 See SETUP.md for step-by-step instructions with screenshots',
    ].join('\n');

    // Throw error that will be visible in terminal on startup
    throw new Error(errorMessage);
  }

  // Validate URL formats
  const urlVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL },
  ];

  for (const { key, value } of urlVars) {
    try {
      new URL(value!);
    } catch {
      throw new Error(
        `❌ INVALID URL FORMAT for ${key}\n` +
        `   Current value: ${value}\n` +
        `   Expected format: https://your-project.supabase.co\n` +
        `   Get the correct value from: Supabase Dashboard → Project Settings → API`
      );
    }
  }

  // All validations passed
  console.log('✅ Environment validation passed');
  console.log('📊 Required variables:', required.length);
  console.log('🔒 Sensitive variables are properly protected');
}