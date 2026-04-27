import { mockAgencies } from '@/lib/mock-data';
import { Agency } from '@/lib/quantum-engine';
import {
  AgencyHistory, MonthlyPoint, getAllHistories, ANCHOR_YEAR, ANCHOR_MONTH,
} from '@/lib/historical-data';
import {
  Assumptions, Scenario, applyScenario, deriveAssumptionsFromHistory,
  forecast,
} from './projections-engine';

/* ============================================================
   Plan vs Actual — engine
   El "plan" se construye proyectando hacia adelante desde el
   cierre del año anterior (Dic Y-1), usando los supuestos
   derivados de los 12 meses previos a esa fecha (Y-1 completo).
   Así el plan no se contamina con datos del año en curso.
============================================================ */

export interface PlanActualBucket {
  plan: { revenue: number; agi: number; ebitda: number; ocf: number };
  actual: { revenue: number; agi: number; ebitda: number; ocf: number };
  monthsCovered: number;
}

export interface PlanActualSnapshot {
  scenario: Scenario;
  window: 'mtd' | 'ytd';
  year: number;
  monthIndex: number; // mes ancla 1-12
  group: PlanActualBucket;
  byAgency: Array<{ agency: Agency; bucket: PlanActualBucket }>;
}

function actualForRange(history: AgencyHistory, year: number, fromMonth: number, toMonth: number) {
  const acc = { revenue: 0, agi: 0, ebitda: 0, ocf: 0 };
  let months = 0;
  history.points.forEach(p => {
    if (p.year === year && p.month >= fromMonth && p.month <= toMonth) {
      acc.revenue += p.revenue;
      acc.agi += p.agi;
      acc.ebitda += p.ebitda;
      acc.ocf += p.operatingCashflow;
      months++;
    }
  });
  return { acc, months };
}

function priorYearHistory(history: AgencyHistory, year: number): AgencyHistory {
  return {
    agencyId: history.agencyId,
    points: history.points.filter(p => p.year === year - 1),
  };
}

function endOfPriorYearBaseline(history: AgencyHistory, year: number) {
  // promedio últimos 3 meses del año anterior
  const prior = history.points.filter(p => p.year === year - 1);
  const last3 = prior.slice(-3);
  if (!last3.length) {
    const last = history.points[history.points.length - 1];
    return last
      ? { revenue: last.revenue, agi: last.agi, ebitda: last.ebitda, ocf: last.operatingCashflow, debtService: last.debtService }
      : { revenue: 0, agi: 0, ebitda: 0, ocf: 0, debtService: 0 };
  }
  const avg = (sel: (p: MonthlyPoint) => number) => last3.reduce((s, p) => s + sel(p), 0) / last3.length;
  return {
    revenue: avg(p => p.revenue),
    agi: avg(p => p.agi),
    ebitda: avg(p => p.ebitda),
    ocf: avg(p => p.operatingCashflow),
    debtService: avg(p => p.debtService),
  };
}

export function buildAgencyPlan(history: AgencyHistory, year: number, scenario: Scenario): MonthlyPoint[] {
  const baseAssumptions: Assumptions = (() => {
    const py = priorYearHistory(history, year);
    if (py.points.length >= 6) return deriveAssumptionsFromHistory(py);
    return deriveAssumptionsFromHistory(history);
  })();
  const assumptions = applyScenario(baseAssumptions, scenario);
  const baseline = endOfPriorYearBaseline(history, year);
  const result = forecast({
    baseline,
    startYear: year - 1, startMonth: 12,
    horizon: 12, assumptions, scenario,
  });
  // Mapear a MonthlyPoint-like de los 12 meses del año actual
  return result.points.map(p => ({
    ym: p.ym, year: p.year, month: p.month,
    revenue: p.revenue, agi: p.agi, ebitda: p.ebitda,
    operatingCashflow: p.ocf, debtService: p.debtService,
  }));
}

function planForRange(plan: MonthlyPoint[], year: number, fromMonth: number, toMonth: number) {
  const acc = { revenue: 0, agi: 0, ebitda: 0, ocf: 0 };
  plan.forEach(p => {
    if (p.year === year && p.month >= fromMonth && p.month <= toMonth) {
      acc.revenue += p.revenue;
      acc.agi += p.agi;
      acc.ebitda += p.ebitda;
      acc.ocf += p.operatingCashflow;
    }
  });
  return acc;
}

export function getPlanVsActual(window: 'mtd' | 'ytd', scenario: Scenario): PlanActualSnapshot {
  const year = ANCHOR_YEAR;
  const month = ANCHOR_MONTH;
  const fromMonth = window === 'mtd' ? month : 1;
  const toMonth = month;

  const histories = getAllHistories();
  const byAgency: PlanActualSnapshot['byAgency'] = [];
  const group: PlanActualBucket = {
    plan: { revenue: 0, agi: 0, ebitda: 0, ocf: 0 },
    actual: { revenue: 0, agi: 0, ebitda: 0, ocf: 0 },
    monthsCovered: toMonth - fromMonth + 1,
  };

  histories.forEach(h => {
    const agency = mockAgencies.find(a => a.id === h.agencyId);
    if (!agency) return;
    const plan = buildAgencyPlan(h, year, scenario);
    const planAgg = planForRange(plan, year, fromMonth, toMonth);
    const { acc: actualAgg } = actualForRange(h, year, fromMonth, toMonth);
    byAgency.push({
      agency,
      bucket: { plan: planAgg, actual: actualAgg, monthsCovered: toMonth - fromMonth + 1 },
    });
    (['revenue', 'agi', 'ebitda', 'ocf'] as const).forEach(k => {
      group.plan[k] += planAgg[k];
      group.actual[k] += actualAgg[k];
    });
  });

  return { scenario, window, year, monthIndex: month, group, byAgency };
}

export function attainmentPct(actual: number, plan: number): number {
  if (plan <= 0) return 0;
  return (actual / plan) * 100;
}

export function attainmentTone(pct: number): 'ok' | 'warn' | 'bad' {
  if (pct >= 98) return 'ok';
  if (pct >= 90) return 'warn';
  return 'bad';
}
