/**
 * Retell LLM Update API Route
 * 
 * Purpose: Updates AI agent prompts in Retell's system
 * Method: PATCH
 * Authentication: Required (Bearer token from user session)
 * 
 * Flow:
 * 1. Validate request body (Zod schema)
 * 2. Verify user is authenticated via session token
 * 3. Check user owns the agent they're trying to update (authorization)
 * 4. Update the agent in Retell's external API
 * 5. Update the agent in our local database
 * 
 * Security: Uses service role to bypass RLS for cross-user validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server'; // ✅ UPDATED IMPORT
import { supabaseService } from '@/lib/supabase-service';
import { z } from 'zod';

// Schema for validating request body
const updateLLMSchema = z.object({
  llm_id: z.string().min(1, "LLM ID required").max(100),
  general_prompt: z.string().min(1, "Prompt required").max(5000),
});

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await supabaseServer(); // ✅ UPDATED USAGE
    
    // Parse and validate request body
    const body = await request.json();
    const { llm_id, general_prompt } = updateLLMSchema.parse(body);

    // 🔒 AUTHENTICATION CHECK
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' }, 
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' }, 
        { status: 401 }
      );
    }

    // 🔒 AUTHORIZATION CHECK - Verify user owns this agent
    // Use service role to bypass RLS and check ownership
    const serviceSupabase = supabaseService();
    const { data: agent, error: agentError } = await serviceSupabase
      .from('agents')
      .select('id')
      .eq('retell_llm_id', llm_id)
      .eq('client_id', user.id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found or unauthorized' }, 
        { status: 404 }
      );
    }

    // ✅ PROCEED WITH RETELL API CALL
    const apiKey = process.env.RETELL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' }, 
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.retellai.com/update-retell-llm/${encodeURIComponent(llm_id)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ general_prompt }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Retell API error:', errorText);
      return NextResponse.json(
        { error: 'Retell update failed' }, 
        { status: response.status }
      );
    }

    // Update local database with new prompt
    const { error: updateError } = await supabase
      .from('agents')
      .update({ prompt: general_prompt })
      .eq('id', agent.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Don't fail the whole request if DB update fails
      // The Retell update succeeded, which is the main goal
    }

    return NextResponse.json(await response.json());
    
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues }, 
        { status: 400 }
      );
    }
    
    // Handle unexpected errors
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}