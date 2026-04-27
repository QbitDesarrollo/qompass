-- Outputs (reports/recommendations) generados por agentes
CREATE TABLE public.agent_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  data JSONB,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_outputs_agent ON public.agent_outputs(agent_id, created_at DESC);
CREATE INDEX idx_agent_outputs_kind  ON public.agent_outputs(kind, created_at DESC);

ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outputs public read"  ON public.agent_outputs FOR SELECT USING (true);
CREATE POLICY "outputs public write" ON public.agent_outputs FOR ALL USING (true) WITH CHECK (true);

-- Seed de los 4 nuevos agentes
INSERT INTO public.agents (slug, name, description, category, icon, schedule) VALUES
  ('capital-allocator', 'Capital Allocator',
   'Cruza EBITDA, capacidad de apalancamiento y momentum estratégico para proponer dónde inyectar el próximo dólar de capital.',
   'crecimiento', 'target', 'on-demand'),
  ('ascension-coach', 'Ascension Coach',
   'Identifica agencias listas para subir de nivel (N4→N3, N3→N2, N2→N1) y genera el roadmap específico por cada una.',
   'crecimiento', 'rocket', 'on-demand'),
  ('board-reporter', 'Board Reporter',
   'Genera el board pack mensual: highlights, lowlights, KPIs vs plan, deals activos y decisiones requeridas.',
   'governance', 'file-text', 'monthly'),
  ('deal-scout', 'Deal Scout',
   'Analiza el pipeline actual y propone nuevos targets sintéticos alineados a la tesis del grupo (verticales faltantes, geografías, tamaño).',
   'm&a', 'binoculars', 'weekly');