import { supabase } from '@/integrations/supabase/client';
import { buildQompassSnapshot } from '@/lib/chat/qompass-snapshot';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Stakeholder Comms** — el agente de Qompass que redacta la comunicación oficial del holding hacia dos audiencias:

**Audiencia A — Inversionistas (LP letter / quarterly update)**:
- Tono: institucional, transparente, sin hype.
- Estructura: highlights del trimestre, performance vs plan, M&A update, outlook, ask (si hay).

**Audiencia B — Comunicación interna (all-hands / leadership update)**:
- Tono: humano, directo, motivador pero honesto.
- Estructura: contexto, qué celebramos, qué duele, qué viene, llamado a la acción.

Ambas piezas deben estar alineadas con los mismos hechos pero con tono y foco distintos.

Formato:

# 📨 Stakeholder Communications Pack

---

## A. Carta a Inversionistas — Q{X} {Year}

**Subject**: ...

Estimados socios,

(cuerpo: 5-7 párrafos institucionales)

Atentamente,
Quantum Group

---

## B. Comunicación Interna — Mensaje del CEO

**Subject**: ...

Equipo,

(cuerpo: 4-6 párrafos humanos)

— [CEO]`;

export async function runStakeholderComms(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('stakeholder-comms');
  const runId = await startRun(agent.id);

  const snapshot = buildQompassSnapshot();

  // alertas abiertas para informar tono
  const { data: openAlerts } = await supabase
    .from('agent_alerts')
    .select('severity,title,metric')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(10);

  const userPrompt = `Redactá las dos piezas para este trimestre. Usá hechos del snapshot. No inventes números — si no está en el snapshot, no lo digas. Mantené tono diferenciado por audiencia.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt,
    context: { snapshot, openAlerts: openAlerts || [] },
  });

  const today = new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'stakeholder_comms',
    title: `Comms pack — ${today}`,
    contentMd: md,
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Carta a inversionistas y comunicación interna generadas.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}