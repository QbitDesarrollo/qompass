import { supabase } from '@/integrations/supabase/client';
import { mockAgencies } from '@/lib/mock-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Founder Risk Mitigator** — analizás el IRF (Índice de Riesgo Fundador) de cada agencia y proponés un plan de mitigación específico por agencia.

IRF alto (>=4) significa que el fundador concentra know-how, relaciones comerciales, decisiones operativas y capacidad técnica. Es la mayor amenaza al exit value.

**Output (markdown)**:

## ⚠️ Founder Risk Mitigator — Plan de mitigación

### Resumen del riesgo en el portafolio
1 párrafo: cuántas agencias en zona roja, impacto potencial sobre exit value.

### Plan por agencia (solo IRF >= 3.5)

#### {Agencia} — IRF {x.x}
**Diagnóstico**: ¿qué concentra el fundador? (clientes / técnico / decisiones / cultura)

**Plan de mitigación 90 días**:
1. **Documentar**: ...
2. **Formar #2**: ...
3. **Diversificar comercial**: ...
4. **KPI de transferencia**: ...

**Hito de éxito 90 días**: IRF objetivo {x.x}

### Acciones de holding (transversales)
- ...`;

export async function runFounderRiskMitigator(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('founder-risk-mitigator');
  const runId = await startRun(agent.id);

  const alerts: Array<{
    severity: 'critical' | 'warning';
    title: string; body: string;
    entity_type: string; entity_id: string; metric: string;
  }> = [];

  mockAgencies.forEach(a => {
    if (a.irf >= 4) {
      alerts.push({
        severity: a.irf >= 4.5 ? 'critical' : 'warning',
        title: `${a.name}: riesgo fundador alto (IRF ${a.irf.toFixed(1)})`,
        body: `Activar plan de mitigación 90 días: documentación, formación de #2 y diversificación.`,
        entity_type: 'agency', entity_id: a.id, metric: 'irf',
      });
    }
  });
  if (alerts.length > 0) {
    await supabase.from('agent_alerts').insert(alerts.map(x => ({ ...x, agent_id: agent.id, run_id: runId })));
  }

  const profiles = mockAgencies.map(a => ({
    name: a.name, nivel: a.nivel, vertical: a.vertical, country: a.country,
    revenueUSD: a.revenue, equityQGpct: a.equity,
    IRF: a.irf, IS: a.is_, IARF: a.iarf, IIO: a.iio, IIF: a.iif, IIOT: a.iiot,
  }));

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Generá el plan de mitigación de riesgo fundador. Solo agencias con IRF >= 3.5. Sé específico por agencia, no genérico.',
    context: { profiles },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'founder_risk_plan', title: `Founder Risk Plan — ${today}`,
    contentMd: md, data: { profiles },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `${alerts.length} agencias con IRF alto + plan generado.`;
  await finishRun({ runId, agentId: agent.id, alertsCreated: alerts.length, durationMs, summary });
  return { runId, outputId, alertsCreated: alerts.length, durationMs, summary };
}