import { supabase } from '@/integrations/supabase/client';
import { getPlanVsActual, attainmentPct } from '@/lib/projections/plan-vs-actual';
import { calcDSCR, getDSCRStatus, formatCurrency, formatPercent } from '@/lib/quantum-engine';
import { mockAgencies } from '@/lib/mock-data';

export type Severity = 'critical' | 'warning' | 'info';

interface NewAlert {
  severity: Severity;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  metric: string | null;
}

function severityForAttainment(pct: number): Severity | null {
  if (pct < 80) return 'critical';
  if (pct < 90) return 'warning';
  return null; // ≥90% no genera alerta
}

/**
 * Sentinel: detecta desviaciones plan vs actual (YTD) por agencia y a nivel grupo,
 * y problemas de DSCR. Persiste resultado en agent_runs + agent_alerts.
 */
export async function runSentinel(): Promise<{
  runId: string;
  alertsCreated: number;
  durationMs: number;
}> {
  const t0 = performance.now();

  // 1. Obtener el agente Sentinel
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id')
    .eq('slug', 'sentinel')
    .single();
  if (agentErr || !agent) throw new Error('Agente Sentinel no encontrado');

  // 2. Crear el run (status running)
  const { data: runRow, error: runErr } = await supabase
    .from('agent_runs')
    .insert({ agent_id: agent.id, status: 'running' })
    .select('id')
    .single();
  if (runErr || !runRow) throw new Error('No se pudo crear el run');
  const runId = runRow.id;

  // 3. Calcular plan vs actual YTD escenario base
  const snap = getPlanVsActual('ytd', 'base');
  const alerts: NewAlert[] = [];

  // 3a. Alertas por agencia (revenue + ebitda)
  snap.byAgency.forEach(({ agency, bucket }) => {
    const revPct = attainmentPct(bucket.actual.revenue, bucket.plan.revenue);
    const ebPct = attainmentPct(bucket.actual.ebitda, bucket.plan.ebitda);

    const sevRev = severityForAttainment(revPct);
    if (sevRev && bucket.plan.revenue > 0) {
      alerts.push({
        severity: sevRev,
        title: `${agency.name}: revenue ${formatPercent(revPct)} del plan YTD`,
        body: `Actual ${formatCurrency(bucket.actual.revenue)} vs plan ${formatCurrency(bucket.plan.revenue)} (gap ${formatCurrency(bucket.actual.revenue - bucket.plan.revenue)}).`,
        entity_type: 'agency',
        entity_id: agency.id,
        metric: 'revenue_attainment',
      });
    }

    const sevEb = severityForAttainment(ebPct);
    if (sevEb && bucket.plan.ebitda > 0) {
      alerts.push({
        severity: sevEb,
        title: `${agency.name}: EBITDA ${formatPercent(ebPct)} del plan YTD`,
        body: `Actual ${formatCurrency(bucket.actual.ebitda)} vs plan ${formatCurrency(bucket.plan.ebitda)}. Margen actual ${formatPercent((bucket.actual.ebitda / Math.max(1, bucket.actual.revenue)) * 100)}.`,
        entity_type: 'agency',
        entity_id: agency.id,
        metric: 'ebitda_attainment',
      });
    }
  });

  // 3b. Alerta de grupo si attainment < 90%
  const groupRevPct = attainmentPct(snap.group.actual.revenue, snap.group.plan.revenue);
  const groupEbPct = attainmentPct(snap.group.actual.ebitda, snap.group.plan.ebitda);
  if (groupRevPct < 90 && snap.group.plan.revenue > 0) {
    alerts.push({
      severity: groupRevPct < 80 ? 'critical' : 'warning',
      title: `Grupo: revenue consolidado ${formatPercent(groupRevPct)} del plan YTD`,
      body: `Actual ${formatCurrency(snap.group.actual.revenue)} vs plan ${formatCurrency(snap.group.plan.revenue)}.`,
      entity_type: 'group',
      entity_id: null,
      metric: 'revenue_attainment',
    });
  }
  if (groupEbPct < 90 && snap.group.plan.ebitda > 0) {
    alerts.push({
      severity: groupEbPct < 80 ? 'critical' : 'warning',
      title: `Grupo: EBITDA consolidado ${formatPercent(groupEbPct)} del plan YTD`,
      body: `Actual ${formatCurrency(snap.group.actual.ebitda)} vs plan ${formatCurrency(snap.group.plan.ebitda)}.`,
      entity_type: 'group',
      entity_id: null,
      metric: 'ebitda_attainment',
    });
  }

  // 3c. DSCR en riesgo
  mockAgencies.forEach(a => {
    if (!a.debtService || a.debtService <= 0) return;
    const dscr = calcDSCR(a);
    const status = getDSCRStatus(dscr);
    if (status === 'riesgo') {
      alerts.push({
        severity: 'critical',
        title: `${a.name}: DSCR en riesgo (${dscr.toFixed(2)}x)`,
        body: `Operating cashflow ${formatCurrency(a.operatingCashflow)} vs servicio de deuda ${formatCurrency(a.debtService)}. Recomendación: refinanciar o inyectar capital de trabajo.`,
        entity_type: 'agency',
        entity_id: a.id,
        metric: 'dscr',
      });
    } else if (status === 'aceptable') {
      alerts.push({
        severity: 'warning',
        title: `${a.name}: DSCR aceptable (${dscr.toFixed(2)}x)`,
        body: `Cobertura limitada. Sin margen para nueva deuda hasta mejorar OCF.`,
        entity_type: 'agency',
        entity_id: a.id,
        metric: 'dscr',
      });
    }
  });

  // 4. Insertar alertas
  if (alerts.length > 0) {
    const { error: insErr } = await supabase
      .from('agent_alerts')
      .insert(alerts.map(a => ({ ...a, agent_id: agent.id, run_id: runId })));
    if (insErr) console.error('Error insertando alertas:', insErr);
  }

  const durationMs = Math.round(performance.now() - t0);
  const summary = `${alerts.length} alertas generadas (${alerts.filter(a => a.severity === 'critical').length} críticas, ${alerts.filter(a => a.severity === 'warning').length} warning).`;

  // 5. Cerrar run y marcar last_run_at
  await supabase
    .from('agent_runs')
    .update({ status: 'success', alerts_created: alerts.length, duration_ms: durationMs, summary })
    .eq('id', runId);

  await supabase
    .from('agents')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', agent.id);

  return { runId, alertsCreated: alerts.length, durationMs };
}