-- ========================================
-- PRODUCTION-READY SAAS SCHEMA
-- Optimized for performance, security, and real-time updates
-- ========================================


-- ========================================
-- 1. TABLES
-- ========================================

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text,
  email text,
  minutes_included integer NOT NULL DEFAULT 0,
  minutes_used integer NOT NULL DEFAULT 0,
  stripe_customer_id text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (user_id)
);


CREATE TABLE IF NOT EXISTS public.agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  agent_name text,
  retell_agent_id text NOT NULL,
  retell_llm_id text,
  prompt text,
  voice text DEFAULT '11labs-Adrian'::text,
  language text DEFAULT 'en-US'::text,
  begin_sentence text DEFAULT 'Hello'::text,
  twilio_number text,
  fallback_agent_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (retell_agent_id),
  CONSTRAINT agents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(user_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number text,
  retell_agent_id text,
  transcript text,
  retell_call_id text,
  call_duration_seconds integer,
  call_status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (retell_call_id),
  CONSTRAINT call_history_retell_agent_id_fkey FOREIGN KEY (retell_agent_id) REFERENCES public.agents(retell_agent_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS public.webhook_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb NOT NULL,
  retry_count integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT webhook_jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(user_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  phone_number text NOT NULL UNIQUE,
  agent_id uuid,
  twilio_sid text NOT NULL UNIQUE,
  monthly_cost numeric(10,2) NOT NULL DEFAULT 1.15,
  stripe_subscription_item_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT phone_numbers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(user_id) ON DELETE CASCADE,
  CONSTRAINT phone_numbers_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL,
  CONSTRAINT phone_numbers_status_check CHECK (status IN ('active', 'releasing', 'released'))
);


-- ========================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;


-- ========================================
-- 3. FUNCTIONS
-- ========================================

-- Deduct minutes and trigger webhook job when minutes run out
CREATE OR REPLACE FUNCTION public.deduct_minutes()
RETURNS TRIGGER AS $$
DECLARE
  target_client_id uuid;
  minutes_to_add numeric;
  minutes_included_val integer;
  minutes_used_val integer;
  twilio_num text;
  fall_agent_id text;
BEGIN
  -- Get agent details with row lock for consistency
  SELECT a.client_id, a.twilio_number, a.fallback_agent_id
  INTO target_client_id, twilio_num, fall_agent_id
  FROM agents a
  WHERE a.retell_agent_id = NEW.retell_agent_id
  FOR UPDATE;

  IF target_client_id IS NULL THEN
    RAISE EXCEPTION 'No agent found for call: %', NEW.retell_agent_id;
  END IF;

  -- Calculate minutes (round up to nearest minute)
  minutes_to_add := CEIL(COALESCE(NEW.call_duration_seconds, 0)::NUMERIC / 60);

  -- Update client minutes
  UPDATE clients
  SET minutes_used = minutes_used + minutes_to_add
  WHERE user_id = target_client_id
  RETURNING minutes_included, minutes_used INTO minutes_included_val, minutes_used_val;

  -- If out of minutes and has fallback configured, create reassignment job
  IF minutes_used_val >= minutes_included_val AND twilio_num IS NOT NULL AND fall_agent_id IS NOT NULL THEN
    INSERT INTO webhook_jobs (client_id, job_type, status, payload)
    VALUES (
      target_client_id,
      'reassign_number',
      'pending',
      jsonb_build_object(
        'phone_number', twilio_num,
        'fallback_agent_id', fall_agent_id,
        'triggered_by_call_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Get remaining minutes for a user
CREATE OR REPLACE FUNCTION public.get_remaining_minutes(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  remaining integer;
BEGIN
  SELECT (minutes_included - minutes_used)
  INTO remaining
  FROM clients
  WHERE user_id = user_uuid;

  RETURN GREATEST(0, COALESCE(remaining, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================================
-- 4. TRIGGERS
-- ========================================

DROP TRIGGER IF EXISTS trigger_deduct_minutes ON public.call_history;
CREATE TRIGGER trigger_deduct_minutes
AFTER INSERT ON public.call_history
FOR EACH ROW
EXECUTE FUNCTION public.deduct_minutes();


DROP TRIGGER IF EXISTS trigger_update_updated_at_column ON public.agents;
CREATE TRIGGER trigger_update_updated_at_column
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


DROP TRIGGER IF EXISTS trigger_update_webhook_jobs_updated_at ON public.webhook_jobs;
CREATE TRIGGER trigger_update_webhook_jobs_updated_at
BEFORE UPDATE ON public.webhook_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ========================================
-- 5. RLS POLICIES - CRITICAL FIX
-- ========================================

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own client record" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own client record" ON public.clients;
DROP POLICY IF EXISTS "Users can update own client record" ON public.clients;
DROP POLICY IF EXISTS "Service role can manage clients" ON public.clients;

-- CLIENTS TABLE POLICIES
-- Allow authenticated users to view their own client record
CREATE POLICY "Users can view own client record" ON public.clients
FOR SELECT TO authenticated, anon
USING (auth.uid() = user_id);

-- Allow users to insert their own client record
CREATE POLICY "Users can insert own client record" ON public.clients
FOR INSERT TO authenticated, anon
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own client record
CREATE POLICY "Users can update own client record" ON public.clients
FOR UPDATE TO authenticated, anon
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- CRITICAL: Allow service role to bypass RLS for Stripe webhooks and server operations
CREATE POLICY "Service role can manage clients" ON public.clients
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Drop existing agent policies
DROP POLICY IF EXISTS "Users can view their agents" ON public.agents;
DROP POLICY IF EXISTS "Users can create agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update their agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete their agents" ON public.agents;
DROP POLICY IF EXISTS "Service role can manage agents" ON public.agents;

-- AGENTS TABLE POLICIES
CREATE POLICY "Users can view their agents" ON public.agents
FOR SELECT TO authenticated, anon
USING (client_id = auth.uid());

CREATE POLICY "Users can create agents" ON public.agents
FOR INSERT TO authenticated, anon
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their agents" ON public.agents
FOR UPDATE TO authenticated, anon
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can delete their agents" ON public.agents
FOR DELETE TO authenticated, anon
USING (client_id = auth.uid());

-- Allow service role full access to agents
CREATE POLICY "Service role can manage agents" ON public.agents
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Drop existing call history policies
DROP POLICY IF EXISTS "Allow service to insert calls" ON public.call_history;
DROP POLICY IF EXISTS "Users can view calls for their agent" ON public.call_history;
DROP POLICY IF EXISTS "Service role can manage calls" ON public.call_history;

-- CALL HISTORY TABLE POLICIES
-- Allow anyone to insert calls (n8n webhooks)
CREATE POLICY "Allow service to insert calls" ON public.call_history
FOR INSERT TO authenticated, anon, service_role
WITH CHECK (true);

-- Allow users to view calls for their agents
CREATE POLICY "Users can view calls for their agent" ON public.call_history
FOR SELECT TO authenticated, anon
USING (
  retell_agent_id IN (
    SELECT agents.retell_agent_id FROM agents WHERE agents.client_id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "Service role can manage calls" ON public.call_history
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Drop existing webhook job policies
DROP POLICY IF EXISTS "Users can view their jobs" ON public.webhook_jobs;
DROP POLICY IF EXISTS "Service role can manage jobs" ON public.webhook_jobs;

-- WEBHOOK JOBS TABLE POLICIES
CREATE POLICY "Users can view their jobs" ON public.webhook_jobs
FOR SELECT TO authenticated, anon
USING (client_id = auth.uid());

-- Allow service role full access for cron jobs
CREATE POLICY "Service role can manage jobs" ON public.webhook_jobs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Drop existing phone number policies
DROP POLICY IF EXISTS "Users can view their phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can create phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update their phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can delete their phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Service role can manage phone numbers" ON public.phone_numbers;

-- PHONE NUMBERS TABLE POLICIES
CREATE POLICY "Users can view their phone numbers" ON public.phone_numbers
FOR SELECT TO authenticated, anon
USING (client_id = auth.uid());

CREATE POLICY "Users can create phone numbers" ON public.phone_numbers
FOR INSERT TO authenticated, anon
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their phone numbers" ON public.phone_numbers
FOR UPDATE TO authenticated, anon
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can delete their phone numbers" ON public.phone_numbers
FOR DELETE TO authenticated, anon
USING (client_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Service role can manage phone numbers" ON public.phone_numbers
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- ========================================
-- 6. PERMISSIONS
-- ========================================

-- Grant permissions to postgres role for n8n
GRANT INSERT ON public.call_history TO postgres;
GRANT SELECT ON public.agents TO postgres;
GRANT SELECT ON public.clients TO postgres;
GRANT UPDATE ON public.clients TO postgres;
GRANT INSERT ON public.webhook_jobs TO postgres;
GRANT SELECT ON public.webhook_jobs TO postgres;
GRANT UPDATE ON public.webhook_jobs TO postgres;
GRANT EXECUTE ON FUNCTION public.deduct_minutes() TO postgres;
GRANT EXECUTE ON FUNCTION public.get_remaining_minutes(uuid) TO postgres;


-- ========================================
-- 7. PERFORMANCE INDEXES
-- ========================================

-- Drop indexes if they exist (for clean redeployment)
DROP INDEX IF EXISTS idx_clients_user_id;
DROP INDEX IF EXISTS idx_clients_stripe_customer_id;
DROP INDEX IF EXISTS idx_agents_retell_agent_id;
DROP INDEX IF EXISTS idx_agents_client_id;
DROP INDEX IF EXISTS idx_agents_twilio_number;
DROP INDEX IF EXISTS idx_call_history_retell_agent_id;
DROP INDEX IF EXISTS idx_call_history_created_at;
DROP INDEX IF EXISTS idx_call_history_agent_created;
DROP INDEX IF EXISTS idx_agents_rls_lookup;
DROP INDEX IF EXISTS idx_webhook_jobs_pending;
DROP INDEX IF EXISTS idx_webhook_jobs_client;
DROP INDEX IF EXISTS idx_phone_numbers_client_id;
DROP INDEX IF EXISTS idx_phone_numbers_agent_id;
DROP INDEX IF EXISTS idx_phone_numbers_phone_number;

-- Critical index for client queries (prevents hanging queries!)
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_stripe_customer_id ON public.clients(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Agent indexes
CREATE INDEX idx_agents_retell_agent_id ON public.agents(retell_agent_id);
CREATE INDEX idx_agents_client_id ON public.agents(client_id);
CREATE INDEX idx_agents_twilio_number ON public.agents(twilio_number) WHERE twilio_number IS NOT NULL;

-- Call history indexes
CREATE INDEX idx_call_history_retell_agent_id ON public.call_history(retell_agent_id);
CREATE INDEX idx_call_history_created_at ON public.call_history(created_at DESC);
CREATE INDEX idx_call_history_agent_created ON public.call_history(retell_agent_id, created_at DESC);

-- Composite index for RLS policy lookups
CREATE INDEX idx_agents_rls_lookup ON public.agents(retell_agent_id, client_id);

-- Webhook job indexes
CREATE INDEX idx_webhook_jobs_pending ON public.webhook_jobs(status) WHERE status = 'pending';
CREATE INDEX idx_webhook_jobs_client ON public.webhook_jobs(client_id);

-- Phone number indexes
CREATE INDEX idx_phone_numbers_client_id ON public.phone_numbers(client_id);
CREATE INDEX idx_phone_numbers_agent_id ON public.phone_numbers(agent_id);
CREATE INDEX idx_phone_numbers_phone_number ON public.phone_numbers(phone_number);


-- ========================================
-- 8. ENABLE REALTIME
-- ========================================

-- Enable realtime for tables (ignore errors if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_numbers;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ========================================
-- DEPLOYMENT COMPLETE
-- ========================================

-- Update trigger for phone_numbers table
DROP TRIGGER IF EXISTS trigger_update_phone_numbers_updated_at ON public.phone_numbers;
CREATE TRIGGER trigger_update_phone_numbers_updated_at
BEFORE UPDATE ON public.phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Verify configuration
DO $$
BEGIN
  RAISE NOTICE '✅ Schema deployment complete';
  RAISE NOTICE '✅ RLS policies configured for authenticated, anon, and service_role';
  RAISE NOTICE '✅ Performance indexes created';
  RAISE NOTICE '✅ Real-time subscriptions enabled';
  RAISE NOTICE '✅ All triggers and functions deployed';
  RAISE NOTICE '✅ Phone numbers table created with RLS and indexes';
END $$;
