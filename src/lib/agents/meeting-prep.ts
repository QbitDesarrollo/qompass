import { supabase } from '@/integrations/supabase/client';
import { mockAgencies } from '@/lib/mock-data';
import {
  calcIPE, calcIPP, calcIPC, calcDSCR, getDSCRStatus, NIVEL_LABELS,
} from '@/lib/quantum-engine';
import { getAllHistories } from '@/lib/historical-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Meeting Prep** — antes de cada 1:1 con el fundador de una agencia, le preparás al CEO de Quantum un briefing ejecutivo de 1 página.

**Output (markdown)**:

## 🗓️ Meeting Prep — 1:1 con {Fundador de Agencia}
**Fecha sugerida**: hoy/esta semana · **Agencia**: {nombre} · **Nivel**: {N}

### Contexto en 30 segundos
1 párrafo: dónde está la agencia hoy en el deal con QG.

### Últimos números (last 6m)
| Métrica | Hace 6m | Último | Δ |
|---|---|---|---|

### 🚨 Alertas abiertas sobre esta agencia
- ...

### Oportunidades a poner sobre la mesa
- ...

### Preguntas que debés hacerle (priorizadas)
1. ...
2. ...
3. ...

### Pedidos del fundador esperables (preparar respuesta)
- ...

### Lo que NO podés cerrar en esta reunión
- ...

### One-liner para abrir el meeting
_"..."_`;

export async function runMeetingPrep(agencyId: string): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('meeting-prep');
  const runId = await startRun(agent.id);

  const a = mockAgencies.find(x => x.id === agencyId);
  if (!a) throw new Error('Agencia no encontrada');

  const dscr = calcDSCR(a);
  const histories = getAllHistories();
  const h = histories.find(x => x.agencyId === a.id);
  const last6 = h ? h.points.slice(-6).map(p => ({
    ym: p.ym, revenue: Math.round(p.revenue), ebitda: Math.round(p.ebitda),
  })) : [];

  // Traer alertas abiertas de esta agencia
  const { data: openAlerts } = await supabase
    .from('agent_alerts')
    .select('title, body, severity, created_at')
    .eq('entity_type', 'agency')
    .eq('entity_id', a.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(10);

  const context = {
    agency: {
      name: a.name, country: a.country, vertical: a.vertical,
      nivel: a.nivel, nivelLabel: NIVEL_LABELS[a.nivel],
      equityQGpct: a.equity,
      revenueUSD: a.revenue, ebitdaUSD: a.ebitda, ebitdaMarginPct: a.margin,
      ocfUSD: a.operatingCashflow, debtServiceUSD: a.debtService,
      indices: {
        DEC_pct: a.dec, IRF: a.irf, IS: a.is_,
        IPE: +calcIPE(a).toFixed(2), IPP: +calcIPP(a).toFixed(2), IPC: +calcIPC(a).toFixed(2),
      },
      dscr: isFinite(dscr) ? +dscr.toFixed(2) : null,
      dscrStatus: isFinite(dscr) ? getDSCRStatus(dscr) : 'sin deuda',
    },
    last6Months: last6,
    openAlerts: openAlerts || [],
  };

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Preparame el briefing del 1:1 con el fundador de ${a.name}. Tiene que ser breve (1 pantalla), ejecutivo y específico — no genérico.`,
    context,
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'meeting_prep', title: `1:1 ${a.name} — ${today}`,
    contentMd: md, data: { agencyId: a.id },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Briefing 1:1 generado para ${a.name}.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}