import { mockAgencies } from '@/lib/mock-data';
import {
  computeCapitalPriorities, calcLeverageCapacity, getConsolidatedEbitda,
  formatCurrency, QUADRANT_META,
} from '@/lib/quantum-engine';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Capital Allocator** — el agente de Qompass que decide a dónde va el próximo dólar de capital del grupo.

Tu trabajo:
1. Leer el ranking pre-calculado de prioridades (cuadrantes deploy / optimize / investigate / restructure).
2. Recomendar **una asignación concreta** de un capital hipotético de $5M total entre las top oportunidades.
3. Justificar cada ticket con: monto, instrumento (equity injection / debt facility / refinancing / earnout), retorno esperado en 12 meses, y riesgo principal.
4. Identificar al menos 1 caso de **NO invertir** (descartar / reestructurar) con racional.

Formato de salida (markdown estricto):

## 🎯 Recomendación de Allocation — $5M

### Resumen ejecutivo
(2-3 frases)

### Tickets propuestos
| Agencia | Monto | Instrumento | Cuadrante | Retorno 12m | Riesgo |
|---|---|---|---|---|---|
| ... | $XM | ... | ... | +$X EBITDA / X% IRR | ... |

### Racional por ticket
**1. {Agencia} — ${monto}**
- Por qué: ...
- Cómo se despliega: ...
- KPIs de éxito a 12m: ...

(repetir para cada ticket)

### NO invertir
**{Agencia}** — ...

### Próximos checkpoints
- ...`;

export async function runCapitalAllocator(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('capital-allocator');
  const runId = await startRun(agent.id);

  // Prepara contexto cuantitativo
  const priorities = computeCapitalPriorities(mockAgencies).slice(0, 8);
  const consolidated = getConsolidatedEbitda(mockAgencies);

  const context = {
    consolidatedEbitdaUSD: Math.round(consolidated),
    capitalPool: 5_000_000,
    priorities: priorities.map(p => ({
      agency: p.agency.name,
      vertical: p.agency.vertical,
      country: p.agency.country,
      nivel: p.agency.nivel,
      equityQGpct: p.agency.equity,
      revenueUSD: p.agency.revenue,
      ebitdaUSD: p.ebitda,
      ebitdaMarginPct: p.agency.margin,
      operatingCashflowUSD: p.agency.operatingCashflow,
      debtServiceUSD: p.agency.debtService,
      leverageCapacity: calcLeverageCapacity(p.agency),
      score: +p.score.toFixed(1),
      quadrant: p.quadrant,
      quadrantLabel: QUADRANT_META[p.quadrant].label,
      rationale: p.rationale,
    })),
  };

  const userPrompt = `Tenemos $${formatCurrency(context.capitalPool)} disponibles para desplegar este trimestre. Analiza las prioridades pre-calculadas y entrega tu recomendación final.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    context,
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'capital_allocation',
    title: `Allocation $5M — ${today}`,
    contentMd: md,
    data: { priorities: context.priorities },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Recomendación de allocation generada (${priorities.length} oportunidades analizadas).`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });

  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}