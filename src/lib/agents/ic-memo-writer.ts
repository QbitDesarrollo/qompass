import { DEMO_DEALS } from '@/lib/deals/deals-data';
import { buildQompassSnapshot } from '@/lib/chat/qompass-snapshot';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **IC Memo Writer** — generás el memo de Investment Committee de Quantum Group para los deals activos del pipeline.

**Estructura obligatoria del memo (markdown institucional)**:

## 📝 IC Memo — {Deal Name}
**Stage**: ... · **Target**: ... · **Fecha**: ...

### 1. Executive Summary
3-4 frases: qué es, por qué ahora, qué pedimos al IC.

### 2. Strategic Rationale
Por qué encaja en la tesis Quantum (hub-and-spoke, vertical, geografía).

### 3. Financial Snapshot del target
| Métrica | Valor |
|---|---|
| Asking price | ... |
| EBITDA seller | ... |
| Múltiplo implícito | ... |
| % equity propuesto | ... |

### 4. Tesis (3 puntos)
- ...

### 5. Riesgos & Mitigantes
| Riesgo | Severidad | Mitigante |
|---|---|---|

### 6. Valuación & Estructura
Range low/mid/high + estructura de pago propuesta.

### 7. Sinergias esperadas (12 meses)
- Cross-sell con: ...
- Capability sharing: ...

### 8. Recomendación
✅ APROBAR / 🟡 CONDICIONAR / ❌ RECHAZAR — con justificación.

### 9. Próximos pasos & condiciones
- ...`;

export async function runICMemoWriter(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('ic-memo-writer');
  const runId = await startRun(agent.id);

  const snapshot = buildQompassSnapshot();
  const deals = DEMO_DEALS.map(d => ({
    id: d.id, name: d.name, target: d.target, stage: d.stage,
    inputs: d.inputs,
    ddItemsCount: Object.keys(d.ddStatus || {}).length,
  }));

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Generá los IC memos para los deals que estén en stage avanzado (DD, Negotiation, IC). Si hay varios, separalos con "---". Si no hay deals avanzados, generá un memo template para el deal más cercano al IC.',
    context: { deals, group: snapshot.group, agencies: snapshot.agencies.slice(0, 12) },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'ic_memo', title: `IC Memos — ${today}`,
    contentMd: md, data: { deals },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `IC memo(s) generados.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}