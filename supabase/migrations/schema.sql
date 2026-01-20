-- ========================================
-- PRODUCTION-READY SAAS SCHEMA
-- Final version - Optimized for performance, security, and real-time
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
  phone_status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT clients_phone_status_check CHECK (phone_status IN ('active', 'inactive'))
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
  transfer_calls jsonb DEFAULT NULL,  -- [{ "name": "...", "phone_number": "...", "description": "..." }]
  cal_com jsonb DEFAULT NULL,         -- { "event_type_id": "...", "timezone": "..." }
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


CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  phone_number text NOT NULL UNIQUE,
  agent_id uuid,
  twilio_sid text NOT NULL UNIQUE,
  monthly_cost numeric(10,2) NOT NULL DEFAULT 1.15,
  stripe_subscription_item_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT phone_numbers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(user_id) ON DELETE CASCADE,
  CONSTRAINT phone_numbers_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL
);


-- ========================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;


-- ========================================
-- 3. FUNCTIONS
-- ========================================

-- Deduct minutes from client when call completes
CREATE OR REPLACE FUNCTION public.deduct_minutes()
RETURNS TRIGGER AS $$
DECLARE
  target_client_id uuid;
  minutes_to_add numeric;
BEGIN
  -- Get agent's client_id
  SELECT a.client_id INTO target_client_id
  FROM agents a
  WHERE a.retell_agent_id = NEW.retell_agent_id;

  IF target_client_id IS NULL THEN
    RAISE EXCEPTION 'No agent found for call: %', NEW.retell_agent_id;
  END IF;

  -- Calculate minutes (round up to nearest minute)
  minutes_to_add := CEIL(COALESCE(NEW.call_duration_seconds, 0)::NUMERIC / 60);

  -- Update client minutes
  UPDATE clients
  SET minutes_used = minutes_used + minutes_to_add
  WHERE user_id = target_client_id;

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


-- Automatically create client record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.clients (user_id, email, company_name, minutes_included, minutes_used, phone_status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    0,
    0,
    'active'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Automatically delete client record when user is deleted (CASCADE to agents, calls, phone_numbers)
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.clients WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================================
-- 4. TRIGGERS
-- ========================================

-- Deduct minutes when call is inserted
DROP TRIGGER IF EXISTS trigger_deduct_minutes ON public.call_history;
CREATE TRIGGER trigger_deduct_minutes
AFTER INSERT ON public.call_history
FOR EACH ROW
EXECUTE FUNCTION public.deduct_minutes();

-- Update timestamps on agents
DROP TRIGGER IF EXISTS trigger_update_updated_at_column ON public.agents;
CREATE TRIGGER trigger_update_updated_at_column
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on phone_numbers
DROP TRIGGER IF EXISTS trigger_update_phone_numbers_updated_at ON public.phone_numbers;
CREATE TRIGGER trigger_update_phone_numbers_updated_at
BEFORE UPDATE ON public.phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create client when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Auto-delete client when user is deleted (cascades to all related data)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
BEFORE DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_delete();


-- ========================================
-- 5. RLS POLICIES
-- ========================================

-- Clean slate for policies
DROP POLICY IF EXISTS "Users can view own client record" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own client record" ON public.clients;
DROP POLICY IF EXISTS "Users can update own client record" ON public.clients;
DROP POLICY IF EXISTS "Service role can manage clients" ON public.clients;

-- CLIENTS TABLE POLICIES (authenticated users only)
CREATE POLICY "Users can view own client record" ON public.clients
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own client record" ON public.clients
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage clients" ON public.clients
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Clean slate for agent policies
DROP POLICY IF EXISTS "Users can view their agents" ON public.agents;
DROP POLICY IF EXISTS "Users can create agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update their agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete their agents" ON public.agents;
DROP POLICY IF EXISTS "Service role can manage agents" ON public.agents;

-- AGENTS TABLE POLICIES (authenticated users only)
CREATE POLICY "Users can view their agents" ON public.agents
FOR SELECT TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Users can create agents" ON public.agents
FOR INSERT TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their agents" ON public.agents
FOR UPDATE TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can delete their agents" ON public.agents
FOR DELETE TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Service role can manage agents" ON public.agents
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Clean slate for call history policies
DROP POLICY IF EXISTS "Allow service to insert calls" ON public.call_history;
DROP POLICY IF EXISTS "Users can view calls for their agent" ON public.call_history;
DROP POLICY IF EXISTS "Service role can manage calls" ON public.call_history;

-- CALL HISTORY TABLE POLICIES
-- Only service role can insert calls (from Retell webhooks)
CREATE POLICY "Service role can insert calls" ON public.call_history
FOR INSERT TO service_role
WITH CHECK (true);

-- Users can view calls for their own agents
CREATE POLICY "Users can view calls for their agent" ON public.call_history
FOR SELECT TO authenticated
USING (
  retell_agent_id IN (
    SELECT agents.retell_agent_id FROM agents WHERE agents.client_id = auth.uid()
  )
);

-- Service role has full access
CREATE POLICY "Service role can manage calls" ON public.call_history
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- Clean slate for phone number policies
DROP POLICY IF EXISTS "Users can view their phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can create phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update their phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can delete their phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Service role can manage phone numbers" ON public.phone_numbers;

-- PHONE NUMBERS TABLE POLICIES (authenticated users only)
CREATE POLICY "Users can view their phone numbers" ON public.phone_numbers
FOR SELECT TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Users can create phone numbers" ON public.phone_numbers
FOR INSERT TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their phone numbers" ON public.phone_numbers
FOR UPDATE TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can delete their phone numbers" ON public.phone_numbers
FOR DELETE TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Service role can manage phone numbers" ON public.phone_numbers
FOR ALL TO service_role
USING (true)
WITH CHECK (true);


-- ========================================
-- 6. PERFORMANCE INDEXES
-- ========================================

DROP INDEX IF EXISTS idx_clients_user_id;
DROP INDEX IF EXISTS idx_clients_stripe_customer_id;
DROP INDEX IF EXISTS idx_agents_retell_agent_id;
DROP INDEX IF EXISTS idx_agents_client_id;
DROP INDEX IF EXISTS idx_call_history_retell_agent_id;
DROP INDEX IF EXISTS idx_call_history_created_at;
DROP INDEX IF EXISTS idx_call_history_agent_created;
DROP INDEX IF EXISTS idx_agents_rls_lookup;
DROP INDEX IF EXISTS idx_phone_numbers_client_id;
DROP INDEX IF EXISTS idx_phone_numbers_agent_id;
DROP INDEX IF EXISTS idx_phone_numbers_phone_number;

-- Client indexes
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_stripe_customer_id ON public.clients(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Agent indexes
CREATE INDEX idx_agents_retell_agent_id ON public.agents(retell_agent_id);
CREATE INDEX idx_agents_client_id ON public.agents(client_id);
CREATE INDEX idx_agents_rls_lookup ON public.agents(retell_agent_id, client_id);

-- Call history indexes
CREATE INDEX idx_call_history_retell_agent_id ON public.call_history(retell_agent_id);
CREATE INDEX idx_call_history_created_at ON public.call_history(created_at DESC);
CREATE INDEX idx_call_history_agent_created ON public.call_history(retell_agent_id, created_at DESC);

-- Phone number indexes
CREATE INDEX idx_phone_numbers_client_id ON public.phone_numbers(client_id);
CREATE INDEX idx_phone_numbers_agent_id ON public.phone_numbers(agent_id);
CREATE INDEX idx_phone_numbers_phone_number ON public.phone_numbers(phone_number);


-- ========================================
-- 7. ENABLE REALTIME
-- ========================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.phone_numbers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ========================================
-- DEPLOYMENT COMPLETE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCHEMA DEPLOYMENT COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables: clients, agents, call_history, phone_numbers';
  RAISE NOTICE '';
  RAISE NOTICE 'Auto-triggers:';
  RAISE NOTICE '  - User signup -> client record created';
  RAISE NOTICE '  - User deleted -> client + all data deleted (cascade)';
  RAISE NOTICE '  - Call inserted -> minutes deducted';
  RAISE NOTICE '  - Agent/phone updated -> timestamp updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  - RLS enabled on all tables';
  RAISE NOTICE '  - Only authenticated users can access their own data';
  RAISE NOTICE '  - Only service_role can insert calls (webhooks)';
  RAISE NOTICE '';
  RAISE NOTICE 'Realtime: Enabled on all tables';
  RAISE NOTICE '========================================';
END $$;
