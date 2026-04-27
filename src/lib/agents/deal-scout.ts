import { mockAgencies } from '@/lib/mock-data';
import { DEMO_DEALS } from '@/lib/deals/deals-data';
import { VERTICALS } from '@/lib/quantum-engine';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Deal Scout** — el agente de Qompass que descubre nuevos targets de M&A para Quantum Group.

Tesis del grupo:
- Holding de agencias de marketing & tech en LATAM.
- 5 verticales: Creative & Strategy, Media & Performance, Trade & BTL, Data / Tech / AI, Contact & Sales.
- Busca: ticket $1M-$15M ask, EBITDA margin >12%, fundador dispuesto a quedarse 2-3 años, dependencia económica con QG razonable o escalable.
- Evita: agencias mono-cliente, fundadores con riesgo alto (IRF>4), márgenes <8%.

Tu trabajo:
1. Detectar **gaps en el portafolio** (verticales/geografías subrepresentadas).
2. Proponer **3-5 targets sintéticos plausibles** (nombres ficticios LATAM realistas) que cierren esos gaps.
3. Para cada target dar: descripción, vertical, geografía, EBITDA estimado, ask range, múltiplo razonable, racional estratégico, primera acción.
4. Comentar el pipeline actual: qué deal acelerar, cuál pausar.

Formato (markdown):

## 🔭 Deal Scouting — Reporte

### Gaps detectados en el portafolio
- ...

### Targets propuestos

#### 1. {Nombre del target} — {Vertical} / {País}
- **Descripción**: ...
- **Tamaño estimado**: revenue ~$X, EBITDA ~$X (X% margin)
- **Ask range**: $X-$X (múltiplo X-X EBITDA)
- **Por qué encaja**: ...
- **Riesgo principal**: ...
- **Primera acción**: ...

(repetir 3-5 veces)

### Pipeline actual — comentario
- **Acelerar**: {deal} porque ...
- **Revisar**: {deal} porque ...`;

export async function runDealScout(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('deal-scout');
  const runId = await startRun(agent.id);

  // Coverage actual del portafolio
  const coverage = VERTICALS.map(v => {
    const list = mockAgencies.filter(a => a.vertical === v);
    return {
      vertical: v,
      agencyCount: list.length,
      countries: Array.from(new Set(list.map(a => a.country))),
      totalRevenueUSD: list.reduce((s, a) => s + a.revenue, 0),
      totalEbitdaUSD: list.reduce((s, a) => s + a.ebitda, 0),
    };
  });

  const countriesPresent = Array.from(new Set(mockAgencies.map(a => a.country)));

  const pipeline = DEMO_DEALS.map(d => ({
    name: d.name,
    target: d.target,
    stage: d.stage,
    askUSD: d.inputs?.ask,
    sellerEbitdaUSD: d.inputs?.ebitda,
    industryMultiple: d.inputs?.industryMultiple,
    pctEquityAcquired: d.inputs?.pctEquityAcquired,
  }));

  const context = {
    portfolioCoverage: coverage,
    countriesPresent,
    pipelineActual: pipeline,
  };

  const userPrompt = `Analiza el portafolio actual y el pipeline. Detecta gaps y propón 3-5 targets sintéticos plausibles para LATAM. Sé específico (nombres realistas, ciudades, montos).`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt, context,
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'deal_scouting',
    title: `Deal Scout report — ${today}`,
    contentMd: md,
    data: context,
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Reporte de scouting generado (${coverage.length} verticales analizadas).`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}