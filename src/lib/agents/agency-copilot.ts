import { mockAgencies } from '@/lib/mock-data';
import {
  calcIPE, calcIPP, calcIPC, calcDSCR, getDSCRStatus,
  calcLeverageCapacity, getAscensionOpportunity, NIVEL_LABELS,
} from '@/lib/quantum-engine';
import { getAllHistories } from '@/lib/historical-data';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Agency Copilot** — el agente de Qompass dedicado a UNA agencia específica del grupo. Operás como un Chief of Staff para el CEO de esa portfolio company.

Tu output debe ser:
1. **Diagnóstico flash** (1 párrafo): dónde está la agencia hoy.
2. **Lo bueno / lo malo / lo urgente** (3-3-3 bullets).
3. **Plan 30/60/90 días** (acciones específicas, no genéricas).
4. **3 KPIs a obsesionarse este mes**.
5. **Red flag escondida** (algo que el CEO probablemente no está mirando).

Formato (markdown):

## 🤖 Copilot — {Agencia}

### Diagnóstico flash
...

### Lo bueno · Lo malo · Lo urgente
**Bueno**:
- ...

**Malo**:
- ...

**Urgente**:
- ...

### Plan 30 / 60 / 90
**Días 1-30**:
- ...

**Días 31-60**:
- ...

**Días 61-90**:
- ...

### KPIs del mes
1. ...
2. ...
3. ...

### 🚩 Red flag escondida
...`;

export async function runAgencyCopilot(agencyId: string): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('agency-copilot');
  const runId = await startRun(agent.id);

  const a = mockAgencies.find(x => x.id === agencyId);
  if (!a) throw new Error('Agencia no encontrada');

  const dscr = calcDSCR(a);
  const lev = calcLeverageCapacity(a);
  const opp = getAscensionOpportunity(a);

  const histories = getAllHistories();
  const h = histories.find(x => x.agencyId === a.id);
  const last6 = h ? h.points.slice(-6).map(p => ({
    ym: p.ym, revenue: Math.round(p.revenue), ebitda: Math.round(p.ebitda),
    ocf: Math.round(p.operatingCashflow),
  })) : [];

  const context = {
    agency: {
      name: a.name, country: a.country, vertical: a.vertical,
      nivel: a.nivel, nivelLabel: NIVEL_LABELS[a.nivel],
      equityQGpct: a.equity,
      revenueUSD: a.revenue, ebitdaUSD: a.ebitda, ebitdaMarginPct: a.margin,
      ocfUSD: a.operatingCashflow, debtServiceUSD: a.debtService,
      indices: {
        DEC_pct: a.dec, IIO: a.iio, IIF: a.iif, IIOT: a.iiot,
        IS: a.is_, IRF: a.irf, IARF: a.iarf,
        CME: a.cme, CEC: a.cec, CEI: a.cei, DET: a.det,
        IPE: +calcIPE(a).toFixed(2), IPP: +calcIPP(a).toFixed(2), IPC: +calcIPC(a).toFixed(2),
      },
      dscr: isFinite(dscr) ? +dscr.toFixed(2) : null,
      dscrStatus: isFinite(dscr) ? getDSCRStatus(dscr) : 'sin deuda',
      leverageCapacityUSD: Math.round(lev.additionalDebt),
      ascensionOpportunity: opp,
    },
    last6Months: last6,
  };

  const userPrompt = `Sos el copiloto de ${a.name}. Construí un plan accionable y específico — no genérico. Conocés el contexto del grupo Quantum.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt, context,
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'agency_copilot',
    title: `Copilot ${a.name} — ${today}`,
    contentMd: md, data: { agencyId: a.id },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Plan 30/60/90 generado para ${a.name}.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}