import { mockAgencies } from '@/lib/mock-data';
import {
  baselineFromHistory, deriveAssumptionsFromHistory, applyScenario, forecast,
  groupBaseline, deriveGroupAssumptions,
} from '@/lib/projections/projections-engine';
import { getAllHistories, ANCHOR_YEAR, ANCHOR_MONTH } from '@/lib/historical-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Forecaster** — el agente de Qompass que reentrena las proyecciones financieras del grupo.

Para cada horizonte (12m), te entregamos baseline, supuestos derivados del histórico (last-12m), y los 3 escenarios (base/bull/bear) ya calculados.

Tu trabajo:
1. Explicar los **drivers** que movieron las proyecciones (crecimiento, márgenes, OCF, deuda).
2. Comparar **vs el período anterior** y narrar la dirección del grupo.
3. Entregar un **rango defendible** (low/mid/high) por KPI.
4. Marcar **agencias outlier** (las que más empujan/frenan el resultado).
5. Confidence level (Low / Medium / High) con racional.

Formato:

## 📈 Forecast Group — 12 meses

### Bottom line
| KPI | Bear | Base | Bull |
|---|---|---|---|
| Revenue | $X | $X | $X |
| EBITDA | $X | $X | $X |
| Cash neto | $X | $X | $X |

### Drivers principales del cambio
- ...

### Outliers
- **Aceleran**: ...
- **Frenan**: ...

### Confidence: {Low|Medium|High}
Racional: ...

### Acciones que mejorarían el forecast
- ...`;

export async function runForecaster(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('forecaster');
  const runId = await startRun(agent.id);

  const baseline = groupBaseline();
  const assumptions = deriveGroupAssumptions();

  const scenarios = (['bear','base','bull'] as const).map(sc => {
    const ass = applyScenario(assumptions, sc);
    const r = forecast({
      baseline, startYear: ANCHOR_YEAR, startMonth: ANCHOR_MONTH,
      horizon: 12, assumptions: ass, scenario: sc,
    });
    return {
      scenario: sc,
      assumptions: {
        revenueGrowthMonthly: +(ass.revenueGrowth * 100).toFixed(2),
        ebitdaMarginPct: +(ass.ebitdaMargin * 100).toFixed(1),
        ocfConversion: +(ass.ocfConversion * 100).toFixed(1),
      },
      summary: {
        totalRevenue: Math.round(r.summary.totalRevenue),
        totalEbitda: Math.round(r.summary.totalEbitda),
        endingCash: Math.round(r.summary.endingCash),
        ebitdaMarginPct: +r.summary.ebitdaMargin.toFixed(1),
      },
    };
  });

  // outliers por agencia (proyección base individual vs share del grupo)
  const histories = getAllHistories();
  const perAgency = mockAgencies.map(a => {
    const h = histories.find(x => x.agencyId === a.id);
    if (!h) return null;
    const b = baselineFromHistory(h);
    const ass = deriveAssumptionsFromHistory(h);
    const r = forecast({
      baseline: b, startYear: ANCHOR_YEAR, startMonth: ANCHOR_MONTH,
      horizon: 12, assumptions: ass, scenario: 'base',
    });
    return {
      agency: a.name, vertical: a.vertical,
      revenueGrowthMonthly: +(ass.revenueGrowth * 100).toFixed(2),
      projected12mRevenue: Math.round(r.summary.totalRevenue),
      projected12mEbitda: Math.round(r.summary.totalEbitda),
    };
  }).filter(Boolean);

  const userPrompt = `Genera el forecast 12m del grupo, narrando los drivers, los outliers y el confidence level.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt,
    context: {
      baselineGroup: {
        revenueMonthly: Math.round(baseline.revenue),
        ebitdaMonthly: Math.round(baseline.ebitda),
        ocfMonthly: Math.round(baseline.ocf),
      },
      scenarios, perAgency,
    },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'forecast_12m',
    title: `Forecast 12m — ${today}`,
    contentMd: md, data: { scenarios },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Forecast 12m generado para ${perAgency.length} agencias y consolidado del grupo.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}