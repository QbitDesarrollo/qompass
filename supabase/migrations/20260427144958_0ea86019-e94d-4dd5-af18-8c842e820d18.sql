
-- 1. Extensiones para cron y HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Columnas de scheduling en agents
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS cron_expression text,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

-- 3. RPC: schedule_agent(slug, cron_expression)
--    Reemplaza el job existente para ese slug si lo hay.
CREATE OR REPLACE FUNCTION public.schedule_agent(p_slug text, p_cron text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_agent_id uuid;
  v_jobname text;
  v_url text := 'https://tsuygzvluuedowlztfhv.supabase.co/functions/v1/run-agent';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdXlnenZsdXVlZG93bHp0Zmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzI0NDgsImV4cCI6MjA5Mjg0ODQ0OH0.ptiqDC5hoOwKygQOg6VR_ENy_gi2RQdvC1I15SSykvk';
  v_command text;
  v_jobid bigint;
BEGIN
  SELECT id INTO v_agent_id FROM public.agents WHERE slug = p_slug;
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Agent slug % not found', p_slug;
  END IF;

  v_jobname := 'agent_' || replace(p_slug, '-', '_');

  -- Eliminar job previo si existe
  PERFORM cron.unschedule(v_jobname)
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_jobname);

  v_command := format(
    $cmd$select net.http_post(
      url := %L,
      headers := %L::jsonb,
      body := %L::jsonb
    );$cmd$,
    v_url,
    json_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||v_anon,
      'apikey', v_anon
    )::text,
    json_build_object('slug', p_slug, 'source','cron')::text
  );

  v_jobid := cron.schedule(v_jobname, p_cron, v_command);

  UPDATE public.agents
     SET cron_expression = p_cron,
         schedule = p_cron
   WHERE id = v_agent_id;

  RETURN jsonb_build_object('jobid', v_jobid, 'jobname', v_jobname, 'cron', p_cron);
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_agent(text, text) TO authenticated, anon;

-- 4. RPC: unschedule_agent(slug)
CREATE OR REPLACE FUNCTION public.unschedule_agent(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_jobname text;
  v_existed boolean;
BEGIN
  v_jobname := 'agent_' || replace(p_slug, '-', '_');

  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_jobname) INTO v_existed;
  IF v_existed THEN
    PERFORM cron.unschedule(v_jobname);
  END IF;

  UPDATE public.agents
     SET cron_expression = NULL,
         schedule = 'on-demand'
   WHERE slug = p_slug;

  RETURN jsonb_build_object('removed', v_existed, 'jobname', v_jobname);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unschedule_agent(text) TO authenticated, anon;
