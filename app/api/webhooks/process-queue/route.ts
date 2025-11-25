// app/api/webhooks/process-queue/route.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const RETELL_API_URL = 'https://api.retellai.com';
const MAX_RETRIES = 3;

export async function POST(request: Request) {
  console.log('🚀 === WEBHOOK PROCESSING STARTED ===');
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  console.log('🔑 Auth header present:', !!authHeader);
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized: Bearer token mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('✅ Authorization successful');

  // Use service role client (bypasses RLS)
  const serviceSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('📋 Fetching pending jobs...');
    const { data: jobs, error: jobsError } = await serviceSupabase
      .from('webhook_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    console.log('📊 Jobs found:', jobs?.length || 0);
    
    if (jobsError) {
      console.error('❌ Jobs fetch error:', jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No pending jobs');
      return NextResponse.json({ processed: 0, message: 'No jobs' });
    }

    const results = [];

    for (const job of jobs) {
      console.log(`🔄 Processing job ${job.id}...`);
      
      try {
        // Mark as processing
        const { error: updateError } = await serviceSupabase
          .from('webhook_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        if (updateError) throw updateError;

        // Process the webhook
        if (job.job_type === 'reassign_number') {
          const { phone_number, fallback_agent_id } = job.payload;
          
          console.log(`📞 Number: ${phone_number}`);
          console.log(`🤖 Fallback: ${fallback_agent_id}`);

          // Call Retell
          const response = await fetch(
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
                nickname: 'Number - Out of Minutes',
              }),
            }
          );

          const responseText = await response.text();
          console.log(`📡 Retell status: ${response.status}`, responseText);

          if (!response.ok) {
            throw new Error(`Retell API error: ${response.status} ${responseText}`);
          }

          // Mark as completed
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
        const status = newRetryCount >= MAX_RETRIES ? 'failed' : 'pending';
        
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

    console.log('🎉 Complete:', results);
    return NextResponse.json({ processed: results.length, results });

  } catch (error) {
    console.error('💥 Fatal error:', error);
    return NextResponse.json({ 
      error: 'Processing failed',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}