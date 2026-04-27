-- AGENTS CATALOG
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'shield',
  schedule TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RUN HISTORY
CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'success',
  alerts_created INT NOT NULL DEFAULT 0,
  duration_ms INT,
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ALERTS INBOX
CREATE TABLE public.agent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metric TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_alerts_status ON public.agent_alerts(status, created_at DESC);
CREATE INDEX idx_agent_alerts_agent ON public.agent_alerts(agent_id, created_at DESC);
CREATE INDEX idx_agent_runs_agent ON public.agent_runs(agent_id, started_at DESC);

-- RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents public read"   ON public.agents       FOR SELECT USING (true);
CREATE POLICY "agents public write"  ON public.agents       FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "runs public read"     ON public.agent_runs   FOR SELECT USING (true);
CREATE POLICY "runs public write"    ON public.agent_runs   FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "alerts public read"   ON public.agent_alerts FOR SELECT USING (true);
CREATE POLICY "alerts public write"  ON public.agent_alerts FOR ALL    USING (true) WITH CHECK (true);

-- SEED: Sentinel
INSERT INTO public.agents (slug, name, description, category, icon, schedule)
VALUES (
  'sentinel',
  'Sentinel',
  'Vigila desviaciones de plan vs actual en revenue, AGI, EBITDA y cashflow. Genera alertas priorizadas por severidad.',
  'vigilancia',
  'shield',
  'on-demand'
);