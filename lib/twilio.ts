// lib/twilio.ts
import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('Missing Twilio credentials in environment variables');
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Your Twilio SIP trunk termination URI (you'll set this up once in Twilio)
// Example: "sip:your-trunk.pstn.twilio.com"
export const TWILIO_SIP_TRUNK_URI = process.env.TWILIO_SIP_TRUNK_URI || '';
