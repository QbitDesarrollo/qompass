import { DEMO_DEALS, DD_CATEGORIES, ddProgress } from '@/lib/deals/deals-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **DD Coordinator** — el agente de Qompass que coordina el due diligence de los deals activos de M&A.

Para cada deal en stage 'dd' o 'loi':
1. Analiza el progreso del checklist (% completo, # red flags, # pendientes high-priority).
2. Identifica los **gaps críticos** que están bloqueando el avance.
3. Propone 5-10 **preguntas concretas** para hacerle al target en la próxima reunión.
4. Recomienda **next step**: avanzar a negociación, pedir más info, pausar, abandonar.

Formato:

## 📋 DD Status — Deals activos

### {Project Name} — {Target} ({stage})
**Progreso DD**: X% completo · Y red flags · Z high-priority pendientes

**Gaps críticos**:
- ...

**Preguntas para próxima reunión**:
1. ...

**Recomendación**: avanzar / pedir info / pausar / abandonar
**Por qué**: ...

(repetir por cada deal)`;

export async function runDDCoordinator(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('dd-coordinator');
  const runId = await startRun(agent.id);

  const activeDeals = DEMO_DEALS.filter(d => d.stage === 'dd' || d.stage === 'loi');

  const dealsContext = activeDeals.map(d => {
    const progress = ddProgress(d.ddStatus);
    const redflagItems: string[] = [];
    const pendingHP: string[] = [];
    DD_CATEGORIES.forEach(c => c.sections.forEach(s => s.items.forEach(it => {
      const st = d.ddStatus[it.id];
      if (st === 'redflag') redflagItems.push(`[${c.name}] ${it.q}`);
      if (it.priority && st !== 'complete') pendingHP.push(`[${c.name}] ${it.q}`);
    })));
    return {
      project: d.name, target: d.target, vertical: d.vertical, country: d.country,
      stage: d.stage, thesis: d.thesis,
      askUSD: d.inputs?.ask, ebitdaUSD: d.inputs?.ebitda,
      industryMultiple: d.inputs?.industryMultiple,
      ddProgressPct: progress.pct,
      ddTotals: { complete: progress.complete, review: progress.review, redflag: progress.redflag, total: progress.total },
      redflagItems: redflagItems.slice(0, 10),
      pendingHighPriority: pendingHP.slice(0, 12),
    };
  });

  const userPrompt = `Coordina el DD de los ${activeDeals.length} deals activos. Sé operativo: preguntas concretas y recomendación clara.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt,
    context: { activeDeals: dealsContext },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'dd_status',
    title: `DD Status — ${today}`,
    contentMd: md, data: { deals: dealsContext },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `DD coordinado para ${activeDeals.length} deals.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}