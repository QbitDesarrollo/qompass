import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS } from '@/lib/quantum-engine';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Synergy Hunter** — el agente de Qompass que descubre oportunidades de **cross-sell, bundling y compartición de capacidades** entre las agencias del holding.

Tipos de sinergia que buscas:
1. **Cross-sell horizontal**: clientes de una agencia que podrían comprar servicios de otra vertical.
2. **Bundling**: combos de 2-3 agencias para atacar un brief integral.
3. **Capability sharing**: data, talento o tecnología que una agencia tiene y otras pueden usar.
4. **Geographic expansion**: agencia fuerte en X país que puede prestar capacidad a otra en otro país.
5. **Procurement synergy**: compra agregada (media buying, herramientas, freelancers).

Formato:

## 🔗 Sinergias detectadas

### Top 3 oportunidades de mayor impacto
1. **{Tipo} — {Agencias involucradas}** — Impacto estimado: $X / año
   - Hipótesis: ...
   - Cómo activarla en 90 días: ...
   - Quién la dueña: ...

(detalla 5-7 oportunidades en total, ranked por impacto)

### Sinergias estructurales (long-term)
- ...

### Anti-sinergias (cuidar canibalización)
- ...`;

export async function runSynergyHunter(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('synergy-hunter');
  const runId = await startRun(agent.id);

  const portfolio = mockAgencies.map(a => ({
    name: a.name, vertical: a.vertical, country: a.country, nivel: a.nivel,
    revenueUSD: a.revenue, ebitdaMarginPct: a.margin,
    DEC_pct: a.dec, CME: a.cme, CEC: a.cec,
  }));

  const matrix = VERTICALS.map(v => ({
    vertical: v,
    agencies: mockAgencies.filter(a => a.vertical === v).map(a => a.name),
    countries: Array.from(new Set(mockAgencies.filter(a => a.vertical === v).map(a => a.country))),
    revenueUSD: mockAgencies.filter(a => a.vertical === v).reduce((s, a) => s + a.revenue, 0),
  }));

  const userPrompt = `Analiza el portafolio. Detecta sinergias activables en próximos 90 días, con foco en impacto financiero. Sé específico (no "colaborar" sino "Apex aporta media buying a clientes de Halo en MX").`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt,
    context: { portfolio, matrixVertical: matrix },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'synergy_map',
    title: `Synergy map — ${today}`,
    contentMd: md, data: { matrix },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Mapa de sinergias generado (${portfolio.length} agencias, ${VERTICALS.length} verticales).`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}