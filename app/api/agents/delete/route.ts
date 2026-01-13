// app/api/agents/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RETELL_API_KEY = process.env.RETELL_API_KEY!;

/**
 * Delete an AI agent
 * This endpoint handles the complete agent deletion:
 * 1. Deletes agent from Retell AI
 * 2. Deletes agent from Supabase (cascade deletes call_history)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent_id from query params
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent_id');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting agent ${agentId} for user ${user.id}`);

    // Step 1: Get agent details to verify ownership and get retell_agent_id
    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('agents')
      .select('retell_agent_id, agent_name, client_id')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) {
      console.error('❌ Agent not found:', fetchError);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (agent.client_id !== user.id) {
      console.error('❌ Unauthorized: User does not own this agent');
      return NextResponse.json(
        { error: 'Unauthorized: You do not own this agent' },
        { status: 403 }
      );
    }

    // Step 2: Delete agent from Retell AI
    try {
      const retellResponse = await fetch(
        `https://api.retellai.com/delete-agent/${agent.retell_agent_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${RETELL_API_KEY}`,
          },
        }
      );

      if (!retellResponse.ok) {
        const errorData = await retellResponse.json();
        console.error('❌ Retell API error:', errorData);
        // Continue with database deletion even if Retell deletion fails
        // (agent might already be deleted from Retell)
      } else {
        console.log(`✅ Deleted agent from Retell AI: ${agent.retell_agent_id}`);
      }
    } catch (retellError) {
      console.error('❌ Failed to delete from Retell AI:', retellError);
      // Continue with database deletion
    }

    // Step 3: Delete agent from Supabase
    // This will cascade delete call_history records
    const { error: deleteError } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (deleteError) {
      console.error('❌ Database delete error:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Agent "${agent.agent_name}" deleted successfully`);

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.agent_name}" deleted successfully`,
    });

  } catch (error: any) {
    console.error('❌ Error deleting agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
