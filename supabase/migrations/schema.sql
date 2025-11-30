-- ========================================
-- COMPLETE SAAS SCHEMA WITH 0-MINUTES HANDLING
-- ========================================


-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text,
  email text,
  minutes_included integer DEFAULT 0,
  minutes_used integer DEFAULT 0,
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
  voice text DEFAULT 'en-US-Neural2-C'::text,
  begin_sentence text DEFAULT 'Hello'::text,
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


-- 2. ADD COLUMNS TO AGENTS TABLE
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS twilio_number text,
ADD COLUMN IF NOT EXISTS fallback_agent_id text;


-- 3. ENABLE RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_jobs ENABLE ROW LEVEL SECURITY;


-- 4. FUNCTIONS
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
  SELECT a.client_id, a.twilio_number, a.fallback_agent_id
  INTO target_client_id, twilio_num, fall_agent_id
  FROM agents a
  WHERE a.retell_agent_id = NEW.retell_agent_id
  FOR UPDATE;


  IF target_client_id IS NULL THEN
    RAISE EXCEPTION 'No agent found for call: %', NEW.retell_agent_id;
  END IF;


  minutes_to_add := CEIL(COALESCE(NEW.call_duration_seconds, 0)::NUMERIC / 60);


  UPDATE clients
  SET minutes_used = minutes_used + minutes_to_add
  WHERE user_id = target_client_id
  RETURNING minutes_included, minutes_used INTO minutes_included_val, minutes_used_val;


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
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.get_remaining_minutes(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  remaining integer;
BEGIN
  SELECT (minutes_included - minutes_used)
  INTO remaining
  FROM clients
  WHERE user_id = user_uuid;
 
  RETURN GREATEST(0, remaining);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.update_webhook_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 5. TRIGGERS
CREATE TRIGGER trigger_deduct_minutes
AFTER INSERT ON public.call_history
FOR EACH ROW
EXECUTE FUNCTION public.deduct_minutes();


CREATE TRIGGER trigger_update_updated_at_column
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


CREATE TRIGGER trigger_update_webhook_jobs_updated_at
BEFORE UPDATE ON public.webhook_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_webhook_jobs_updated_at();


-- 6. RLS POLICIES
CREATE POLICY "Users can view own client record" ON public.clients
FOR SELECT TO public USING (auth.uid() = user_id);


CREATE POLICY "Users can insert own client record" ON public.clients
FOR INSERT TO public WITH CHECK (auth.uid() = user_id);


CREATE POLICY "Users can update own client record" ON public.clients
FOR UPDATE TO public USING (auth.uid() = user_id);


CREATE POLICY "Users can view their agents" ON public.agents
FOR SELECT TO public USING (client_id = auth.uid());


CREATE POLICY "Users can create agents" ON public.agents
FOR INSERT TO public WITH CHECK (client_id = auth.uid());


CREATE POLICY "Users can update their agents" ON public.agents
FOR UPDATE TO public USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());


CREATE POLICY "Users can delete their agents" ON public.agents
FOR DELETE TO public USING (client_id = auth.uid());


CREATE POLICY "Allow service to insert calls" ON public.call_history
FOR INSERT TO public WITH CHECK (true);


CREATE POLICY "Users can view calls for their agent" ON public.call_history
FOR SELECT TO public USING (
  retell_agent_id IN (
    SELECT agents.retell_agent_id FROM agents WHERE agents.client_id = auth.uid()
  )
);


CREATE POLICY "Users can view their jobs" ON public.webhook_jobs
FOR SELECT TO public USING (client_id = auth.uid());


-- 7. PERMISSIONS (for n8n postgres role)
GRANT INSERT ON public.call_history TO postgres;
GRANT SELECT ON public.agents TO postgres;
GRANT UPDATE ON public.clients TO postgres;
GRANT INSERT ON public.webhook_jobs TO postgres;
GRANT EXECUTE ON FUNCTION public.deduct_minutes() TO postgres;


-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_agents_retell_agent_id ON public.agents(retell_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_client_id ON public.agents(client_id);
CREATE INDEX IF NOT EXISTS idx_call_history_retell_agent_id ON public.call_history(retell_agent_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON public.call_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_rls_lookup ON public.agents(retell_agent_id, client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_pending ON public.webhook_jobs(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_jobs_client ON public.webhook_jobs(client_id);


-- 9. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;


-- ========================================
-- DEPLOYMENT COMPLETE
-- ========================================

