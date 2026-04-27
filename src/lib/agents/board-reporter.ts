import { supabase } from '@/integrations/supabase/client';
import { buildQompassSnapshot } from '@/lib/chat/qompass-snapshot';
import { getPlanVsActual, attainmentPct } from '@/lib/projections/plan-vs-actual';
import {
  callAgentReason, finishRun, getAgentBySlug, saveOutput, startRun, AgentRunResult,
} from './shared';

const SYSTEM_PROMPT = `Eres **Board Reporter** — el agente de Qompass que produce el board pack mensual de Quantum Group para presentar al directorio.

Tono: ejecutivo, directo, sin disclaimers. Toda afirmación numérica debe estar respaldada por la data del snapshot.

Estructura obligatoria (markdown):

# 📑 Board Pack — {Mes Año}

## 1. Executive Summary
(3-4 bullets: lo más importante que el board debe saber)

## 2. KPIs del Grupo vs Plan
| KPI | Plan YTD | Actual YTD | Attainment | Status |
|---|---|---|---|---|
(usa 🟢 ≥98%, 🟡 90-97%, 🔴 <90%)

## 3. Highlights del trimestre
- ...

## 4. Lowlights / Riesgos
- ...

## 5. Pipeline de Deals (M&A)
(tabla con stage, target, valuación implícita, próximo milestone)

## 6. Movimientos en el Framework
(transiciones de nivel completadas, en curso, retrocesos)

## 7. Decisiones requeridas al Board
- [ ] ...
- [ ] ...

## 8. Próximos 30 días
- ...`;

export async function runBoardReporter(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('board-reporter');
  const runId = await startRun(agent.id);

  const snapshot = buildQompassSnapshot();
  const pva = getPlanVsActual('ytd', 'base');

  // Trae alertas abiertas como input para "Lowlights / Riesgos"
  const { data: openAlerts } = await supabase
    .from('agent_alerts')
    .select('severity,title,body,metric')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(15);

  const context = {
    snapshot,
    planVsActualYTD: {
      group: {
        revenue: { plan: Math.round(pva.group.plan.revenue), actual: Math.round(pva.group.actual.revenue), attainment: +attainmentPct(pva.group.actual.revenue, pva.group.plan.revenue).toFixed(1) },
        agi: { plan: Math.round(pva.group.plan.agi), actual: Math.round(pva.group.actual.agi), attainment: +attainmentPct(pva.group.actual.agi, pva.group.plan.agi).toFixed(1) },
        ebitda: { plan: Math.round(pva.group.plan.ebitda), actual: Math.round(pva.group.actual.ebitda), attainment: +attainmentPct(pva.group.actual.ebitda, pva.group.plan.ebitda).toFixed(1) },
        ocf: { plan: Math.round(pva.group.plan.ocf), actual: Math.round(pva.group.actual.ocf), attainment: +attainmentPct(pva.group.actual.ocf, pva.group.plan.ocf).toFixed(1) },
      },
      byAgency: pva.byAgency.map(b => ({
        name: b.agency.name,
        revenueAttainmentPct: +attainmentPct(b.bucket.actual.revenue, b.bucket.plan.revenue).toFixed(1),
        ebitdaAttainmentPct: +attainmentPct(b.bucket.actual.ebitda, b.bucket.plan.ebitda).toFixed(1),
      })),
    },
    openAlerts: openAlerts || [],
    asOfMonth: new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' }),
  };

  const userPrompt = `Genera el board pack para ${context.asOfMonth}. Sé conciso, ejecutivo. Usa los emojis 🟢🟡🔴 en la tabla de attainment.`;

  const md = await callAgentReason({
    systemPrompt: SYSTEM_PROMPT, userPrompt, context,
  });

  const today = new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' });
  const outputId = await saveOutput({
    agentId: agent.id, runId,
    kind: 'board_pack',
    title: `Board Pack — ${today}`,
    contentMd: md,
    data: { groupAttainment: context.planVsActualYTD.group },
  });

  const durationMs = Math.round(performance.now() - t0);
  const summary = `Board pack generado para ${context.asOfMonth}.`;
  await finishRun({ runId, agentId: agent.id, durationMs, summary });
  return { runId, outputId, alertsCreated: 0, durationMs, summary };
}