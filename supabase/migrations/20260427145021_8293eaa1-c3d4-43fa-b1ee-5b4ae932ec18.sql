
REVOKE EXECUTE ON FUNCTION public.schedule_agent(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unschedule_agent(text)     FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.schedule_agent(text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.unschedule_agent(text)     TO authenticated;
