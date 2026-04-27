import { supabase } from '@/integrations/supabase/client';
import { mockAgencies } from '@/lib/mock-data';
import { calcIPE, calcIPP, calcIPC, isLevel1Eligible } from '@/lib/quantum-engine';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Index Tracker** — el agente que monitorea los índices de transición (IPE, IPP, IPC) de Quantum Group y detecta agencias listas para subir de nivel.

**Reglas de transición**:
- N4 → N3: IPE > 3.8 (sostenido 2 períodos).
- N3 → N2: IPP > 3.8 (sostenido 2 períodos).
- N2 → N1: IPC > 4.0 + revenue >$1M + EBITDA margin >10%.

**Output (markdown)**:

## 📊 Index Tracker — ${new Date().toLocaleDateString('es')}

### Resumen ejecutivo
1 párrafo: cuántas agencias listas para ascensión, cuántas en zona de retroceso.

### Agencias listas para subir de nivel
| Agencia | Nivel actual | Índice clave | Valor | Acción |
|---|---|---|---|---|

### Agencias cerca del umbral (a vigilar)
...

### Agencias en retroceso
...

### Acción para el board este mes
- ...`;

export async function runIndexTracker(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('index-tracker');
  const runId = await startRun(agent.id);

  const alerts: Array<{
    severity: 'info' | 'warning';
    title: string; body: string;
    entity_type: string; entity_id: string; metric: string;
  }> = [];

  const profiles = mockAgencies.map(a => {
    const ipe = +calcIPE(a).toFixed(2);
    const ipp = +calcIPP(a).toFixed(2);
    const ipc = +calcIPC(a).toFixed(2);
    const eligibleN1 = isLevel1Eligible(a);

    // Detección de readiness
    if (a.nivel === 4 && ipe > 3.8) {
      alerts.push({
        severity: 'info',
        title: `${a.name}: lista para subir N4 → N3 (IPE ${ipe.toFixed(2)})`,
        body: `IPE supera el umbral 3.8. Iniciar conversación de ascensión.`,
        entity_type: 'agency', entity_id: a.id, metric: 'ipe',
      });
    }
    if (a.nivel === 3 && ipp > 3.8) {
      alerts.push({
        severity: 'info',
        title: `${a.name}: lista para subir N3 → N2 (IPP ${ipp.toFixed(2)})`,
        body: `IPP supera 3.8. Estructurar adquisición de equity minoritario.`,
        entity_type: 'agency', entity_id: a.id, metric: 'ipp',
      });
    }
    if (a.nivel === 2 && eligibleN1) {
      alerts.push({
        severity: 'info',
        title: `${a.name}: lista para subir N2 → N1 (consolidación)`,
        body: `IPC > 4.0, revenue > $1M y margen > 10%. Estructurar mayoría >50%.`,
        entity_type: 'agency', entity_id: a.id, metric: 'ipc',
      });
    }
    return { name: a.name, nivel: a.nivel, IPE: ipe, IPP: ipp, IPC: ipc, eligibleN1, revenueUSD: a.revenue, marginPct: a.margin };
  });

  if (alerts.length > 0) {
    await supabase.from('agent_alerts').insert(alerts.map(x => ({ ...x, agent_id: agent.id, run_id: runId })));
  }

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Genera el reporte mensual de index tracking. Sé conciso, prioriza acciones.',
    context: { profiles },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'index_tracking', title: `Index Tracker — ${today}`,
    contentMd: md, data: { profiles },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `${alerts.length} agencias detectadas en zona de transición.`;
  await finishRun({ runId, agentId: agent.id, alertsCreated: alerts.length, durationMs, summary });
  return { runId, outputId, alertsCreated: alerts.length, durationMs, summary };
}