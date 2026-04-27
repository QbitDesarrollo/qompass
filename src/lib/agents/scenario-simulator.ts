import { mockAgencies } from '@/lib/mock-data';
import { getConsolidatedEbitda } from '@/lib/quantum-engine';
import { DEMO_DEALS } from '@/lib/deals/deals-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Scenario Simulator** — corrés escenarios "what-if" sobre el portafolio de Quantum Group y devolvés el impacto consolidado en EBITDA, exit value y DSCR del grupo.

Recibís el snapshot actual y deals del pipeline. Generá 3 escenarios concretos y plausibles que el board debería evaluar este trimestre. Para cada uno:

## 🎲 Scenario Simulator — Escenarios para evaluar

### Escenario A: {Nombre} (ej: "Comprar NexaTech a 6x EBITDA + subir Pulse a N2")
**Acciones**:
- ...

**Impacto consolidado (12 meses)**:
| Métrica | Hoy | Post-escenario | Δ |
|---|---|---|---|
| EBITDA consolidado | ... | ... | ... |
| Exit value (8x) | ... | ... | ... |
| DSCR del grupo | ... | ... | ... |
| Cash burn neto | ... | ... | ... |

**Probabilidad de ejecución**: 🟢/🟡/🔴
**Capital requerido**: $...

### Escenario B: ...
### Escenario C: ...

### Recomendación
Cuál ejecutar, cuál parquear, cuál descartar — con racional.`;

export async function runScenarioSimulator(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('scenario-simulator');
  const runId = await startRun(agent.id);

  const consolidatedEbitda = getConsolidatedEbitda(mockAgencies);
  const totalRevenue = mockAgencies.reduce((s, a) => s + a.revenue, 0);

  const context = {
    today: {
      consolidatedEbitdaUSD: Math.round(consolidatedEbitda),
      totalRevenueUSD: totalRevenue,
      exitValueAt8xUSD: Math.round(consolidatedEbitda * 8),
    },
    agencies: mockAgencies.map(a => ({
      name: a.name, nivel: a.nivel, equityQGpct: a.equity,
      revenueUSD: a.revenue, ebitdaUSD: a.ebitda, marginPct: a.margin,
      ocfUSD: a.operatingCashflow, debtServiceUSD: a.debtService,
    })),
    deals: DEMO_DEALS.map(d => ({
      name: d.name, target: d.target, stage: d.stage, inputs: d.inputs,
    })),
  };

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Generá 3 escenarios concretos combinando deals del pipeline + ascensos de nivel + ajustes de capital. Sé numérico y específico — no inventes nombres que no estén en el contexto.',
    context,
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'scenario_simulation', title: `Scenarios — ${today}`,
    contentMd: md, data: context,
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `3 escenarios consolidados generados.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}