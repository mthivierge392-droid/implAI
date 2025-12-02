/**
 * Rate Limit Testing Script
 *
 * Run this script to verify rate limiting is working:
 * node test-rate-limit.js
 */

const BASE_URL = 'http://localhost:3000'; // Change to your deployed URL
const NUM_REQUESTS = 15; // Should exceed the 10/minute limit

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting...\n');
  console.log(`📍 Target: ${BASE_URL}/api/retell/update-llm`);
  console.log(`📊 Sending ${NUM_REQUESTS} requests\n`);
  console.log('Expected: First 10 succeed, next 5 fail with 429\n');
  console.log('─'.repeat(60));

  // You'll need to replace these with actual values from your browser:
  const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Get from browser DevTools → Application → Cookies
  const LLM_ID = 'YOUR_LLM_ID_HERE'; // Get from agents page

  const results = {
    success: 0,
    rateLimited: 0,
    errors: 0
  };

  for (let i = 1; i <= NUM_REQUESTS; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/retell/update-llm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({
          llm_id: LLM_ID,
          general_prompt: `Test prompt ${i} - ${new Date().toISOString()}`
        })
      });

      const data = await response.json();
      const status = response.status;

      // Get rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const limit = response.headers.get('X-RateLimit-Limit');

      if (status === 200) {
        results.success++;
        console.log(`✅ Request ${i.toString().padStart(2)}: SUCCESS (${remaining}/${limit} remaining)`);
      } else if (status === 429) {
        results.rateLimited++;
        console.log(`🛑 Request ${i.toString().padStart(2)}: RATE LIMITED (retry after ${data.retryAfter}s)`);
      } else {
        results.errors++;
        console.log(`❌ Request ${i.toString().padStart(2)}: ERROR ${status} - ${data.error}`);
      }

      // Small delay to see output clearly
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      results.errors++;
      console.log(`❌ Request ${i.toString().padStart(2)}: NETWORK ERROR - ${error.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n📈 RESULTS:');
  console.log(`   ✅ Successful: ${results.success}`);
  console.log(`   🛑 Rate Limited: ${results.rateLimited}`);
  console.log(`   ❌ Errors: ${results.errors}`);
  console.log('\n' + (results.rateLimited > 0 ? '✅ Rate limiting is WORKING!' : '⚠️  Rate limiting may not be working'));
}

testRateLimit();
