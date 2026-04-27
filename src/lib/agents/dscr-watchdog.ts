import { supabase } from '@/integrations/supabase/client';
import { mockAgencies } from '@/lib/mock-data';
import { calcDSCR, getDSCRStatus, formatCurrency } from '@/lib/quantum-engine';
import { finishRun, getAgentBySlug, startRun, AgentRunResult } from './shared';

/**
 * DSCR Watchdog: chequea el ratio de cobertura de servicio de deuda de cada agencia.
 * - <1.25x → alerta crítica.
 * - 1.25-1.5x → warning.
 * - >2x con baja deuda → info de "capacidad ociosa" (oportunidad de leverage).
 */
export async function runDscrWatchdog(): Promise<AgentRunResult> {
  const t0 = performance.now();
  const agent = await getAgentBySlug('dscr-watchdog');
  const runId = await startRun(agent.id);

  const alerts: Array<{
    severity: 'critical' | 'warning' | 'info';
    title: string; body: string;
    entity_type: string; entity_id: string; metric: string;
  }> = [];

  mockAgencies.forEach(a => {
    if (!a.debtService || a.debtService <= 0) {
      // Sin deuda: oportunidad de leverage si OCF es robusto y nivel >=2
      if (a.operatingCashflow > 400_000 && a.nivel <= 2) {
        alerts.push({
          severity: 'info',
          title: `${a.name}: capacidad ociosa de leverage`,
          body: `OCF ${formatCurrency(a.operatingCashflow)} sin servicio de deuda. Podría tomar deuda para acelerar crecimiento.`,
          entity_type: 'agency', entity_id: a.id, metric: 'leverage_capacity',
        });
      }
      return;
    }
    const dscr = calcDSCR(a);
    const status = getDSCRStatus(dscr);
    if (status === 'riesgo') {
      alerts.push({
        severity: 'critical',
        title: `${a.name}: DSCR en riesgo (${dscr.toFixed(2)}x)`,
        body: `OCF ${formatCurrency(a.operatingCashflow)} vs servicio ${formatCurrency(a.debtService)}. Refinanciar o inyectar capital.`,
        entity_type: 'agency', entity_id: a.id, metric: 'dscr',
      });
    } else if (status === 'aceptable') {
      alerts.push({
        severity: 'warning',
        title: `${a.name}: DSCR aceptable (${dscr.toFixed(2)}x)`,
        body: `Cobertura limitada. Sin margen para nueva deuda.`,
        entity_type: 'agency', entity_id: a.id, metric: 'dscr',
      });
    } else if (dscr >= 2.5) {
      alerts.push({
        severity: 'info',
        title: `${a.name}: capacidad ociosa de leverage (DSCR ${dscr.toFixed(2)}x)`,
        body: `Cobertura muy holgada. Evaluar tomar deuda adicional para acelerar M&A o expansión.`,
        entity_type: 'agency', entity_id: a.id, metric: 'leverage_capacity',
      });
    }
  });

  if (alerts.length > 0) {
    await supabase.from('agent_alerts').insert(alerts.map(x => ({ ...x, agent_id: agent.id, run_id: runId })));
  }

  const durationMs = Math.round(performance.now() - t0);
  const summary = `${alerts.length} señales DSCR generadas.`;
  await finishRun({ runId, agentId: agent.id, alertsCreated: alerts.length, durationMs, summary });
  return { runId, alertsCreated: alerts.length, durationMs, summary };
}