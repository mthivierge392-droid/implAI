import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const RETELL_API_URL = 'https://api.retellai.com';
const MAX_RETRIES = 3;

export async function POST(request: Request) {
  console.log('🚀 === WEBHOOK PROCESSING STARTED ===');
  
  const supabase = createClient();
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  console.log('🔑 Auth header present:', !!authHeader);
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('❌ Unauthorized: Bearer token mismatch');
    console.log('Expected:', `Bearer ${process.env.CRON_SECRET}`);
    console.log('Received:', authHeader);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('✅ Authorization successful');

  try {
    console.log('📋 Fetching pending jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('webhook_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    console.log('📊 Jobs found:', jobs?.length || 0);
    console.log('📋 Jobs data:', JSON.stringify(jobs, null, 2));
    
    if (jobsError) {
      console.error('❌ Jobs fetch error:', jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('✅ No pending jobs to process');
      return NextResponse.json({ processed: 0, message: 'No jobs' });
    }

    const results = [];
    const serviceSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    for (const job of jobs) {
      console.log(`🔄 Processing job ${job.id}...`);
      console.log(`📞 Phone: ${job.payload.phone_number}`);
      console.log(`🤖 Fallback: ${job.payload.fallback_agent_id}`);

      try {
        // Mark as processing
        const { error: updateError } = await supabase
          .from('webhook_jobs')
          .update({ status: 'processing' })
          .eq('id', job.id);

        if (updateError) throw updateError;

        // Process the webhook
        if (job.job_type === 'reassign_number') {
          const { phone_number, fallback_agent_id } = job.payload;
          
          console.log(`🚀 Calling Retell API for ${phone_number}...`);
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

          console.log(`📡 Retell API response status: ${response.status}`);
          const responseText = await response.text();
          console.log(`📡 Retell API response body: ${responseText}`);

          if (!response.ok) {
            console.error('❌ Retell API error:', responseText);
            throw new Error(`Retell API error: ${response.status} ${responseText}`);
          }

          const responseData = JSON.parse(responseText);
          console.log('✅ Retell API success:', responseData);

          // Mark as completed
          await supabase
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
        
        await supabase
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

    console.log('🎉 Processing complete:', results);
    return NextResponse.json({ processed: results.length, results });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}