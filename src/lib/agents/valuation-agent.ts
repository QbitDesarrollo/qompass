import { DEMO_DEALS, computeDeal } from '@/lib/deals/deals-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Valuation Agent** — el agente de Qompass que recalcula valuaciones de targets.

Para cada deal: ya tenés el ask, EBITDA, múltiplo industry y los outputs del modelo EPIC.

Tu trabajo:
1. Validar si el ask es razonable vs el FMV de la industria.
2. Generar un **rango defendible** de oferta (low / mid / high) con racional.
3. Sugerir **estructura óptima**: % cash, % seller financing, % earnout, % equity QG.
4. Calcular **sensibilidades**: ¿qué pasa si EBITDA real es 10% menor? ¿si el múltiplo apropiado es 1x menor?
5. Bandera roja si hay sobrepago > 20% del FMV.

Formato:

## 💰 Valuation Review — Deals activos

### {Project} — {Target}
- **Ask**: $X · **EBITDA**: $X · **Múltiplo implícito**: X.Xx vs industria X.Xx
- **FMV industria**: $X · **Delta**: ${'{+/- $X (% sobre FMV)}'}

**Rango sugerido**:
| Tier | Oferta | Múltiplo | Probabilidad cierre |
|---|---|---|---|
| Low | $X | X.Xx | 80% |
| Mid | $X | X.Xx | 50% |
| High | $X | X.Xx | 25% |

**Estructura recomendada**: cash X% / seller fin Y% / earnout Z% — racional ...

**Sensibilidades**:
- Si EBITDA real -10%: ...
- Si múltiplo apropiado -1x: ...

**Bandera**: 🟢 OK | 🟡 revisar | 🔴 sobrepago

(repetir por deal)`;

export async function runValuationAgent(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('valuation-agent');
  const runId = await startRun(agent.id);

  const dealsContext = DEMO_DEALS.map(d => {
    const out = computeDeal(d.inputs);
    return {
      project: d.name, target: d.target, country: d.country, vertical: d.vertical,
      stage: d.stage, thesis: d.thesis,
      askUSD: d.inputs.ask, ebitdaUSD: d.inputs.ebitda,
      industryMultiple: d.inputs.industryMultiple,
      pctEquityAcquired: d.inputs.pctEquityAcquired,
      computed: {
        impliedMultiple: +out.multipleImplied.toFixed(2),
        multipleDelta: +out.multipleDelta.toFixed(2),
        industryFmvUSD: Math.round(out.industryFmv),
        netValuationUSD: Math.round(out.netValuation),
        netPurchasePriceUSD: Math.round(out.netPurchasePrice),
        sellerFinancingUSD: Math.round(out.sellerFinancing),
        earnoutUSD: Math.round(out.earnoutAmount),
        preClosingCashNeedUSD: Math.round(out.preClosingCashNeed),
      },
    };
  });

  const userPrompt = `Recalcula valuación para todos los deals del pipeline. Sé técnico pero claro.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt,
    context: { deals: dealsContext },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'valuation_review',
    title: `Valuation review — ${today}`,
    contentMd: md, data: { deals: dealsContext },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Valuación revisada para ${dealsContext.length} deals.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}