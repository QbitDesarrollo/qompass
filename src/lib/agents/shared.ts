import { supabase } from '@/integrations/supabase/client';

export interface AgentRunResult {
  runId: string;
  outputId?: string;
  alertsCreated: number;
  durationMs: number;
  summary: string;
}

/** Llama al endpoint genérico de razonamiento. Devuelve markdown. */
export async function callAgentReason(args: {
  systemPrompt: string;
  userPrompt: string;
  context: unknown;
  model?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke('agent-reason', { body: args });
  if (error) throw new Error(error.message || 'Error llamando a agent-reason');
  if (!data?.content) throw new Error('Respuesta vacía del agente');
  return data.content as string;
}

export async function getAgentBySlug(slug: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('agents').select('id').eq('slug', slug).single();
  if (error || !data) throw new Error(`Agente ${slug} no encontrado`);
  return data;
}

export async function startRun(agentId: string): Promise<string> {
  const { data, error } = await supabase
    .from('agent_runs')
    .insert({ agent_id: agentId, status: 'running' })
    .select('id').single();
  if (error || !data) throw new Error('No se pudo crear el run');
  return data.id;
}

export async function finishRun(args: {
  runId: string;
  agentId: string;
  alertsCreated?: number;
  durationMs: number;
  summary: string;
  status?: 'success' | 'error';
}) {
  await supabase.from('agent_runs').update({
    status: args.status || 'success',
    alerts_created: args.alertsCreated ?? 0,
    duration_ms: args.durationMs,
    summary: args.summary,
  }).eq('id', args.runId);
  await supabase.from('agents').update({ last_run_at: new Date().toISOString() }).eq('id', args.agentId);
}

export async function saveOutput(args: {
  agentId: string;
  runId: string;
  kind: string;
  title: string;
  contentMd: string;
  data?: unknown;
}): Promise<string> {
  const { data, error } = await supabase.from('agent_outputs').insert({
    agent_id: args.agentId,
    run_id: args.runId,
    kind: args.kind,
    title: args.title,
    content_md: args.contentMd,
    data: args.data ? (args.data as never) : null,
  }).select('id').single();
  if (error || !data) throw new Error('No se pudo guardar el output');
  return data.id;
}