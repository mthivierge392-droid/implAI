// lib/phone-number-helpers.ts
import { createClient } from '@supabase/supabase-js';
import { twilioClient } from '@/lib/twilio';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TRUNK_SID = process.env.TWILIO_TRUNK_SID!;
const OUT_OF_MINUTES_TWIML_URL = process.env.TWILIO_OUT_OF_MINUTES_TWIML_URL!;

interface PhoneNumberData {
  phone_number: string;
  twilio_sid: string;
}

/**
 * Switch all active phone numbers for a client to TwiML Bin (out of minutes message)
 * Used when client runs out of minutes
 */
export async function switchAllNumbersToFallback(clientId: string): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;

  try {
    // Get all phone numbers for this client
    const { data: phoneNumbers, error } = await supabaseAdmin
      .from('phone_numbers')
      .select('phone_number, twilio_sid')
      .eq('client_id', clientId);

    if (error) throw error;
    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.log(`ℹ️ No phone numbers to switch for client ${clientId}`);
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 Switching ${phoneNumbers.length} phone number(s) to out-of-minutes message for client ${clientId}`);

    // Update client status to inactive
    await supabaseAdmin
      .from('clients')
      .update({ phone_status: 'inactive' })
      .eq('user_id', clientId);

    console.log(`✅ Set client ${clientId} status to inactive`);

    // Switch all phone numbers to TwiML Bin in parallel
    // Step 1: Remove from SIP trunk (voiceUrl is ignored while trunk is assigned)
    // Step 2: Set voiceUrl to TwiML Bin
    const results = await Promise.allSettled(
      phoneNumbers.map(async pn => {
        try {
          // Remove phone number from SIP trunk (unassign, not delete)
          await twilioClient
            .trunking.v1
            .trunks(TRUNK_SID)
            .phoneNumbers(pn.twilio_sid)
            .remove();

          console.log(`📤 Removed ${pn.phone_number} from SIP trunk`);

          // Set voiceUrl to TwiML Bin
          await twilioClient
            .incomingPhoneNumbers(pn.twilio_sid)
            .update({
              voiceUrl: OUT_OF_MINUTES_TWIML_URL,
              voiceMethod: 'POST',
            });

          return { success: true, phone_number: pn.phone_number };
        } catch (error: any) {
          return { success: false, phone_number: pn.phone_number, error: error.message };
        }
      })
    );

    // Count successes and failures
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          console.log(`✅ Switched ${result.value.phone_number} to out-of-minutes TwiML`);
          successCount++;
        } else {
          console.error(`❌ Failed to switch ${result.value.phone_number}:`, 'error' in result.value ? result.value.error : 'Unknown error');
          failedCount++;
        }
      } else {
        console.error(`❌ Unexpected error:`, result.reason);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('❌ Error switching numbers to fallback:', error);
    throw error;
  }
}

/**
 * Restore all active phone numbers for a client back to SIP trunk
 * Used when client purchases minutes
 */
export async function restoreAllNumbersToRealAgents(clientId: string): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;

  try {
    // Get all phone numbers for this client
    const { data: phoneNumbers, error } = await supabaseAdmin
      .from('phone_numbers')
      .select('phone_number, twilio_sid')
      .eq('client_id', clientId);

    if (error) throw error;
    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.log(`ℹ️ No phone numbers to restore for client ${clientId}`);
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 Restoring ${phoneNumbers.length} phone number(s) to SIP trunk for client ${clientId}`);

    // Update client status to active
    await supabaseAdmin
      .from('clients')
      .update({ phone_status: 'active' })
      .eq('user_id', clientId);

    console.log(`✅ Set client ${clientId} status to active`);

    // Restore all phone numbers back to trunk in parallel
    // Add phone number back to SIP trunk
    const results = await Promise.allSettled(
      phoneNumbers.map(async pn => {
        try {
          // Add phone number back to SIP trunk
          await twilioClient
            .trunking.v1
            .trunks(TRUNK_SID)
            .phoneNumbers
            .create({ phoneNumberSid: pn.twilio_sid });

          console.log(`📥 Added ${pn.phone_number} back to SIP trunk`);

          return { success: true, phone_number: pn.phone_number };
        } catch (error: any) {
          return { success: false, phone_number: pn.phone_number, error: error.message };
        }
      })
    );

    // Count successes and failures
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          console.log(`✅ Restored ${result.value.phone_number} to SIP trunk`);
          successCount++;
        } else {
          console.error(`❌ Failed to restore ${result.value.phone_number}:`, 'error' in result.value ? result.value.error : 'Unknown error');
          failedCount++;
        }
      } else {
        console.error(`❌ Unexpected error:`, result.reason);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('❌ Error restoring numbers to SIP trunk:', error);
    throw error;
  }
}

