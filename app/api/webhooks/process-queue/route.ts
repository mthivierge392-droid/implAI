// app/api/webhooks/process-queue/route.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const RETELL_API_URL = 'https://api.retellai.com';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const TIMEOUT_MS = 25000;

// Fixed: Properly typed with AbortController
const fetchWithTimeout = async (
  url: string, 
  options: RequestInit, 
  timeout = TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

const isTransientError = (error: any) => {
  const message = error.message || '';
  return message.includes('timeout') || 
         message.includes('ECONNRESET') || 
         message.includes('503') ||
         message.includes('429');
};

export async function POST(request: NextRequest) {
  console.log('🚀 === WEBHOOK PROCESSING STARTED ===');
  
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('❌ CRON_SECRET not set!');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.error('❌ Unauthorized: Bearer token mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const serviceSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: jobs, error: jobsError } = await serviceSupabase
      .from('webhook_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (jobsError) {
      console.error('❌ Jobs fetch error:', jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No jobs' });
    }

    const results = [];
    let failedCount = 0;

    for (const job of jobs) {
      console.log(`🔄 Processing job ${job.id}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

      try {
        await serviceSupabase
          .from('webhook_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        if (job.job_type === 'reassign_number') {
          const { phone_number, fallback_agent_id } = job.payload;

          // This response is now properly typed
          const response = await fetchWithTimeout(
            `${RETELL_API_URL}/update-phone-number/${encodeURIComponent(phone_number)}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inbound_agent_id: fallback_agent_id,
                outbound_agent_id: fallback_agent_id,
                inbound_agent_version: null, // Always use latest published version
                outbound_agent_version: null, // Always use latest published version
                nickname: 'Number - Out of Minutes',
              }),
            }
          );

          const responseText = await response.text();
          if (!response.ok) {
            throw new Error(`Retell API error: ${response.status} ${responseText}`);
          }

          await serviceSupabase
            .from('webhook_jobs')
            .update({
              status: 'completed',
              retry_count: job.retry_count + 1
            })
            .eq('id', job.id);

          results.push({ jobId: job.id, status: 'success' });
        }

      } catch (error: any) {
        console.error(`❌ Job ${job.id} failed:`, error);
        
        const newRetryCount = job.retry_count + 1;
        const isTransient = isTransientError(error);
        const status = isTransient && newRetryCount < MAX_RETRIES 
          ? 'pending' 
          : 'failed';
        
        if (status === 'failed') failedCount++;

        await serviceSupabase
          .from('webhook_jobs')
          .update({
            status,
            retry_count: newRetryCount,
            error_message: error.message,
          })
          .eq('id', job.id);

        results.push({ jobId: job.id, status, error: error.message });
      }
    }

    if (failedCount > 3) {
      console.error('🚨 HIGH FAILURE RATE!', { failedCount, total: jobs.length });
    }

    console.log('🎉 Complete:', results);
    return NextResponse.json({ processed: results.length, results, failed: failedCount });

  } catch (error) {
    console.error('💥 Fatal error:', error);
    return NextResponse.json({ 
      error: 'Processing failed',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}