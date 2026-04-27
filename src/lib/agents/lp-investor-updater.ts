import { buildQompassSnapshot } from '@/lib/chat/qompass-snapshot';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **LP / Investor Updater** — redactás el update trimestral a inversionistas / Limited Partners de Quantum Group.

Tono: institucional, sobrio, transparente. Sin marketing-speak. Como una carta de Howard Marks o Brookfield.

**Estructura (markdown)**:

## 💼 Quantum Group — LP Update Q{X} {YYYY}

### Estimados socios,
(Carta-cabecera, 1 párrafo: lo que pasó este trimestre en una idea.)

### Performance del portafolio
| KPI | Q-1 | Q actual | YoY |
|---|---|---|---|

### Highlights
- ...

### Movimientos en el portafolio
- Ascensiones de nivel: ...
- Adquisiciones cerradas: ...
- Pipeline M&A: ...

### Lo que no salió como esperábamos
(Sección obligatoria — si no hay nada negativo, decirlo explícitamente.)

### Capital deployment & runway
Capital comprometido vs desplegado, runway de cash, próximos llamados de capital.

### Outlook próximos 90 días
- ...

### Apéndice de gobierno
Cualquier cambio en el board, estructuras legales, auditoría.

Atentamente,
_Quantum Group GP_`;

export async function runLPInvestorUpdater(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('lp-investor-updater');
  const runId = await startRun(agent.id);

  const snap = buildQompassSnapshot();

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Redactá el LP update del trimestre. Usá los datos reales del snapshot, no inventes números. Tono institucional.',
    context: { snapshot: snap },
  });

  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'lp_update', title: `LP Update — ${today}`,
    contentMd: md, data: null,
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `LP update trimestral generado.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}