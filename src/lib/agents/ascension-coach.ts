import { mockAgencies } from '@/lib/mock-data';
import {
  calcIPE, calcIPP, calcIPC, getAscensionOpportunity, NIVEL_LABELS,
} from '@/lib/quantum-engine';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Ascension Coach** — el agente de Qompass que diseña el roadmap para que cada agencia suba de nivel en el framework de integración (N4 → N3 → N2 → N1).

Reglas del framework:
- N4→N3 se activa cuando IPE > 3.8 sostenido en 2 períodos.
- N3→N2 se activa cuando IPP > 3.8 sostenido.
- N2→N1 se activa cuando IPC > 4.0 sostenido + revenue > $1M + EBITDA margin > 10%.
- Drivers de IPE: DEC (dependencia económica), CME (calidad métrica), IIO (integración operativa), bajar IS (sustituibilidad).
- Drivers de IPP: DEC, CEC (capacidad estratégica comercial), IIF (integración financiera), bajar IRF (riesgo fundador).
- Drivers de IPC: DET (dependencia estratégica total), CEI (capacidad estratégica institucional), IIOT, bajar IARF (autonomía residual).

Tu trabajo:
Para cada agencia analizada, entrega un roadmap **concreto y accionable**. Sé específico (no "mejorar la integración" sino "instalar dashboard compartido de pipeline en Q2").

Formato de salida (markdown):

## 🚀 Roadmaps de Ascensión

### Resumen
- **Listas para subir ya**: X agencias
- **A 1-2 trimestres**: Y agencias
- **Bloqueadas**: Z agencias

---

### {Nombre Agencia} — {NivelActual} → {NivelObjetivo}
**Estado**: {ya elegible / a 1Q / a 2Q / bloqueada}
**Índice clave**: {IPE/IPP/IPC} = X.X (umbral: Y.Y)
**Gap principal**: ...

**Roadmap (next 90 días)**:
1. ...
2. ...
3. ...

**KPIs a mover**:
- {indicador} de X → Y

**Riesgo si no se ejecuta**: ...

(repetir para cada agencia relevante; ordenar por proximidad a la transición)`;

export async function runAscensionCoach(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('ascension-coach');
  const runId = await startRun(agent.id);

  const candidates = mockAgencies
    .filter(a => a.nivel > 1) // N1 ya está arriba
    .map(a => {
      const ipe = +calcIPE(a).toFixed(2);
      const ipp = +calcIPP(a).toFixed(2);
      const ipc = +calcIPC(a).toFixed(2);
      const opp = getAscensionOpportunity(a);
      const targetIndex = a.nivel === 4 ? 'IPE' : a.nivel === 3 ? 'IPP' : 'IPC';
      const targetValue = a.nivel === 4 ? ipe : a.nivel === 3 ? ipp : ipc;
      const threshold = a.nivel === 2 ? 4.0 : 3.8;
      return {
        name: a.name, country: a.country, vertical: a.vertical,
        nivelActual: a.nivel, nivelActualLabel: NIVEL_LABELS[a.nivel],
        nivelObjetivo: (a.nivel - 1),
        equityQGpct: a.equity, revenueUSD: a.revenue,
        ebitdaUSD: a.ebitda, ebitdaMarginPct: a.margin,
        indices: {
          IPE: ipe, IPP: ipp, IPC: ipc,
          DEC: a.dec, IIO: a.iio, IIF: a.iif, IIOT: a.iiot,
          IS: a.is_, IRF: a.irf, IARF: a.iarf,
          CME: a.cme, CEC: a.cec, CEI: a.cei, DET: a.det,
        },
        targetIndex, targetValue, threshold,
        gap: +(threshold - targetValue).toFixed(2),
        eligibleNow: !!opp,
      };
    })
    .sort((a, b) => a.gap - b.gap);

  const userPrompt = `Diseña roadmaps para las agencias a continuación. Prioriza las más cercanas a su transición. Si una agencia tiene gap > 1.5, márcala como bloqueada y propón si reestructurar o desinvertir.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt,
    context: { candidates },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'ascension_roadmap',
    title: `Roadmaps de ascensión — ${today}`,
    contentMd: md,
    data: { candidates },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Roadmaps generados para ${candidates.length} agencias.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}