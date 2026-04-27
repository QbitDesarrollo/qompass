import { supabase } from '@/integrations/supabase/client';
import { mockAgencies } from '@/lib/mock-data';
import { calcDSCR, getDSCRStatus, formatCurrency, formatPercent } from '@/lib/quantum-engine';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Risk Radar** — el agente de Qompass que mapea el riesgo agregado del portafolio.

Cubrís 4 dimensiones:
1. **Riesgo financiero**: DSCR, leverage, exposición de OCF.
2. **Riesgo de concentración**: dependencia económica con QG (DEC alto = bueno para integración pero riesgo si depende de pocos clientes; DEC bajo = autonomía pero baja palanca).
3. **Riesgo fundador (IRF)**: agencias donde el fundador concentra know-how.
4. **Riesgo estratégico**: alta sustituibilidad (IS), bajo CME/CEC.

Salida (markdown):

## 🛰️ Risk Radar — Estado del riesgo del portafolio

### Top 5 riesgos del grupo (ranked)
| # | Agencia | Tipo | Severidad | Métrica |
|---|---|---|---|---|

### Detalle por agencia en zona roja
**{Agencia}** — {tipo}
- Métrica: ...
- Implicancia: ...
- Acción sugerida: ...

### Riesgos sistémicos del portafolio
- ...

### Decisiones que el board debería tomar este trimestre
- ...`;

export async function runRiskRadar(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('risk-radar');
  const runId = await startRun(agent.id);

  const profiles = mockAgencies.map(a => {
    const dscr = calcDSCR(a);
    return {
      name: a.name, country: a.country, vertical: a.vertical, nivel: a.nivel,
      equityQGpct: a.equity, revenueUSD: a.revenue, ebitdaUSD: a.ebitda,
      ebitdaMarginPct: a.margin,
      dscr: isFinite(dscr) ? +dscr.toFixed(2) : null,
      dscrStatus: isFinite(dscr) ? getDSCRStatus(dscr) : 'sin deuda',
      DEC_pct: a.dec, IRF: a.irf, IS: a.is_, CME: a.cme, CEC: a.cec,
      operatingCashflowUSD: a.operatingCashflow,
      debtServiceUSD: a.debtService,
    };
  });

  // alertas determinísticas (DSCR riesgo + IRF >=4 + IS >=4)
  const alerts: { severity: 'critical' | 'warning'; title: string; body: string; entity_type: string; entity_id: string; metric: string }[] = [];
  mockAgencies.forEach(a => {
    if (a.irf >= 4) alerts.push({
      severity: a.irf >= 4.5 ? 'critical' : 'warning',
      title: `${a.name}: riesgo fundador alto (IRF ${a.irf.toFixed(1)})`,
      body: `Concentración de know-how en el fundador. Plan de retención y sucesión recomendado.`,
      entity_type: 'agency', entity_id: a.id, metric: 'irf',
    });
    if (a.is_ >= 4) alerts.push({
      severity: a.is_ >= 4.5 ? 'critical' : 'warning',
      title: `${a.name}: alta sustituibilidad (IS ${a.is_.toFixed(1)})`,
      body: `Capacidad reemplazable por competidores. Diferenciar oferta o capturar IP.`,
      entity_type: 'agency', entity_id: a.id, metric: 'is',
    });
  });
  if (alerts.length > 0) {
    await supabase.from('agent_alerts').insert(alerts.map(x => ({ ...x, agent_id: agent.id, run_id: runId })));
  }

  const userPrompt = `Genera el Risk Radar consolidado. Sé directo: nombra agencias, monta números (${formatCurrency(0).replace('$0','$X')}, ${formatPercent(0).replace('0.0','X')}), y prioriza las 5 acciones más urgentes.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt, context: { profiles },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'risk_radar',
    title: `Risk Radar — ${today}`,
    contentMd: md, data: { profiles },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `${alerts.length} alertas + reporte completo de riesgo generados.`;
  await finishRun({ runId, agentId: agent.id, alertsCreated: alerts.length, durationMs, summary });
  return { runId, outputId, alertsCreated: alerts.length, durationMs, summary };
}