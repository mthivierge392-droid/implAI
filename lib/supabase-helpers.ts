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

export { supabaseAdmin };
