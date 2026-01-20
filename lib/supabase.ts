// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Client = {
  id: string;
  user_id: string;
  company_name: string | null;
  email: string | null;
  minutes_included: number;
  minutes_used: number;
  stripe_customer_id: string | null;
  phone_status: 'active' | 'inactive';
  created_at: string;
};

export type TransferCallIntegration = {
  name: string;
  phone_number: string;
  description: string;
};

export type CalComIntegration = {
  event_type_id: string;
  timezone: string;
};

export type Agent = {
  id: string;
  client_id: string;
  agent_name: string;
  retell_agent_id: string;
  retell_llm_id: string;
  prompt: string;
  voice: string;
  language?: string;
  transfer_calls: TransferCallIntegration[] | null;
  cal_com: CalComIntegration | null;
  created_at: string;
  updated_at: string;
};

export type CallHistory = {
  id: string;
  phone_number: string;
  retell_agent_id: string;
  transcript: string | null;
  retell_call_id: string | null;
  call_duration_seconds: number | null;
  call_status: 'completed' | 'failed' | 'no_answer' | 'in_progress' | null;
  created_at: string;
};

export type PhoneNumber = {
  id: string;
  client_id: string;
  phone_number: string;
  agent_id: string | null;
  twilio_sid: string;
  monthly_cost: number;
  stripe_subscription_item_id: string | null;
  created_at: string;
  updated_at: string;
};