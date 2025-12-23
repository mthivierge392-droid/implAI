/**
 * Supabase Helper Functions
 *
 * Optimized functions for querying Supabase auth and database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Find user ID by email from auth.users table
 * More efficient than listing all users - uses pagination and early exit
 *
 * @param email - The email address to search for
 * @returns The user ID if found, null otherwise
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  try {
    let page = 1;
    const perPage = 1000; // Maximum per page

    while (true) {
      // Fetch users in batches
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error('❌ Error fetching auth users:', error);
        return null;
      }

      // Search for the user in current batch
      const user = data.users.find(u => u.email === email);

      if (user) {
        console.log(`✅ Found user in auth (page ${page}): ${user.id} for email: ${email}`);
        return user.id;
      }

      // If we've fetched all users, stop
      if (data.users.length < perPage) {
        break;
      }

      page++;
    }

    console.error(`❌ User not found in auth for email: ${email}`);
    return null;
  } catch (error: any) {
    console.error('❌ Exception while finding user by email:', error);
    return null;
  }
}

/**
 * Get client's current minutes by user_id
 *
 * @param userId - The user's ID from auth.users
 * @returns The current minutes_included value, or null if not found
 */
export async function getClientMinutes(userId: string): Promise<number | null> {
  const { data: client, error } = await supabaseAdmin
    .from('clients')
    .select('minutes_included')
    .eq('user_id', userId)
    .single();

  if (error || !client) {
    console.error('❌ Client not found for user_id:', userId, error);
    return null;
  }

  return client.minutes_included;
}

/**
 * Add minutes to a client's account
 *
 * @param userId - The user's ID from auth.users
 * @param minutesToAdd - Number of minutes to add
 * @returns The new total minutes, or null if failed
 */
export async function addMinutesToClient(
  userId: string,
  minutesToAdd: number
): Promise<number | null> {
  // Get current minutes
  const currentMinutes = await getClientMinutes(userId);

  if (currentMinutes === null) {
    return null;
  }

  const newMinutesTotal = currentMinutes + minutesToAdd;

  // Update minutes
  const { error: updateError } = await supabaseAdmin
    .from('clients')
    .update({ minutes_included: newMinutesTotal })
    .eq('user_id', userId);

  if (updateError) {
    console.error('❌ Failed to update minutes:', updateError);
    return null;
  }

  return newMinutesTotal;
}

/**
 * Get user's agent info (real agent ID and Twilio number)
 * Returns null if user doesn't have an agent with a Twilio number configured
 *
 * @param userId - The user's ID from auth.users
 * @returns Object with retell_agent_id and twilio_number, or null if not found
 */
export async function getUserAgentInfo(userId: string): Promise<{
  retell_agent_id: string;
  twilio_number: string;
} | null> {
  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .select('retell_agent_id, twilio_number')
    .eq('client_id', userId)
    .not('twilio_number', 'is', null)
    .single();

  if (error || !agent || !agent.twilio_number) {
    console.log(`ℹ️ No agent with Twilio number found for user_id: ${userId}`);
    return null;
  }

  return {
    retell_agent_id: agent.retell_agent_id,
    twilio_number: agent.twilio_number,
  };
}

/**
 * Restore phone number to real agent immediately via Retell API
 * Called directly from Stripe webhook for instant restoration
 *
 * @param agentId - The real agent ID to restore
 * @param phoneNumber - The Twilio number to restore
 * @returns true if restoration succeeded, false otherwise
 */
export async function restorePhoneNumberToAgent(
  agentId: string,
  phoneNumber: string
): Promise<boolean> {
  const RETELL_API_URL = 'https://api.retellai.com';

  try {
    console.log(`📞 Restoring phone ${phoneNumber} to agent ${agentId}...`);

    const response = await fetch(
      `${RETELL_API_URL}/update-phone-number/${encodeURIComponent(phoneNumber)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inbound_agent_id: agentId,
          outbound_agent_id: agentId,
          inbound_agent_version: null, // Always use latest published version
          outbound_agent_version: null, // Always use latest published version
          nickname: 'Active Number',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Retell API error: ${response.status} ${errorText}`);
      return false;
    }

    console.log(`✅ Phone ${phoneNumber} instantly restored to agent ${agentId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to restore phone number:', error.message);
    return false;
  }
}

export { supabaseAdmin };
