import { mockAgencies } from '@/lib/mock-data';
import { Agency, NivelIntegracion } from '@/lib/quantum-engine';
import { getAllHistories, AgencyHistory, MonthlyPoint } from '@/lib/historical-data';

/* ============================================================
   Projections Engine
   - Forecast 12/24/36 meses por agencia o consolidado del grupo.
   - 3 escenarios: Base / Bull / Bear.
   - Roadmap N4→N3, N3→N2, N2→N1 con gating por índices del framework.
============================================================ */

export type Horizon = 12 | 24 | 36;
export type Scenario = 'base' | 'bull' | 'bear';

export interface Assumptions {
  /** Crecimiento mensual compuesto del Revenue (decimal) */
  revenueGrowth: number;
  /** Margen AGI sobre Revenue (decimal) */
  agiMargin: number;
  /** Margen EBITDA sobre Revenue (decimal) */
  ebitdaMargin: number;
  /** OCF / EBITDA (decimal) */
  ocfConversion: number;
  /** Crecimiento mensual del Debt Service (decimal) */
  debtServiceGrowth: number;
}

export interface ProjectionPoint {
  ym: string; year: number; month: number; t: number;
  revenue: number; agi: number; ebitda: number;
  ocf: number; debtService: number; cumulativeCash: number;
}

export interface ProjectionSummary {
  totalRevenue: number; totalAGI: number; totalEbitda: number;
  endingCash: number; ebitdaMargin: number; cagr: number;
}

export interface ProjectionResult {
  scenario: Scenario; horizon: Horizon; assumptions: Assumptions;
  baseline: { revenue: number; agi: number; ebitda: number; ocf: number; debtService: number };
  points: ProjectionPoint[]; summary: ProjectionSummary;
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export function formatYM(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${String(y).slice(2)}`;
}

function clamp(v: number, min: number, max: number): number {
  if (!isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}
function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function lastNMonths(points: MonthlyPoint[], n: number): MonthlyPoint[] {
  return points.slice(Math.max(0, points.length - n));
}
function geometricGrowth(values: number[]): number {
  const valid = values.filter(v => v > 0);
  if (valid.length < 2) return 0;
  const periods = valid.length - 1;
  return Math.pow(valid[valid.length - 1] / valid[0], 1 / periods) - 1;
}
function addMonths(year: number, month: number, delta: number) {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}
function ymKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/* ----- Supuestos derivados del histórico ----- */

export function deriveAssumptionsFromHistory(history: AgencyHistory): Assumptions {
  const last12 = lastNMonths(history.points, 12);
  const revenues = last12.map(p => p.revenue);
  const ebitdas = last12.map(p => p.ebitda);
  const agis = last12.map(p => p.agi);
  const ocfs = last12.map(p => p.operatingCashflow);
  const ds = last12.map(p => p.debtService);
  const totalRev = revenues.reduce((a, b) => a + b, 0);
  const totalEb = ebitdas.reduce((a, b) => a + b, 0);
  const totalAgi = agis.reduce((a, b) => a + b, 0);
  const totalOcf = ocfs.reduce((a, b) => a + b, 0);
  return {
    revenueGrowth: clamp(geometricGrowth(revenues), -0.05, 0.06),
    agiMargin: totalRev > 0 ? clamp(totalAgi / totalRev, 0.2, 0.85) : 0.55,
    ebitdaMargin: totalRev > 0 ? clamp(totalEb / totalRev, 0.02, 0.45) : 0.15,
    ocfConversion: totalEb > 0 ? clamp(totalOcf / totalEb, 0.3, 1.4) : 0.85,
    debtServiceGrowth: clamp(geometricGrowth(ds), -0.02, 0.03),
  };
}

export function deriveGroupAssumptions(): Assumptions {
  const histories = getAllHistories();
  const byYm = new Map<string, MonthlyPoint>();
  histories.forEach(h => h.points.forEach(p => {
    const cur = byYm.get(p.ym);
    if (!cur) byYm.set(p.ym, { ...p });
    else {
      cur.revenue += p.revenue; cur.agi += p.agi; cur.ebitda += p.ebitda;
      cur.operatingCashflow += p.operatingCashflow; cur.debtService += p.debtService;
    }
  }));
  const sorted = Array.from(byYm.values()).sort((a, b) => a.ym.localeCompare(b.ym));
  return deriveAssumptionsFromHistory({ agencyId: '__group__', points: sorted });
}

/* ----- Escenarios ----- */

export const SCENARIO_TUNING: Record<Scenario, { growth: number; margin: number; ocf: number; label: string; tone: string }> = {
  base: { growth: 1, margin: 1, ocf: 1, label: 'Base', tone: 'primary' },
  bull: { growth: 1.6, margin: 1.15, ocf: 1.05, label: 'Bull', tone: 'accent' },
  bear: { growth: 0.4, margin: 0.85, ocf: 0.9, label: 'Bear', tone: 'destructive' },
};

export function applyScenario(base: Assumptions, scenario: Scenario): Assumptions {
  const t = SCENARIO_TUNING[scenario];
  return {
    revenueGrowth: base.revenueGrowth * t.growth + (scenario === 'bear' ? -0.002 : scenario === 'bull' ? 0.003 : 0),
    agiMargin: clamp(base.agiMargin * t.margin, 0.15, 0.9),
    ebitdaMargin: clamp(base.ebitdaMargin * t.margin, 0.02, 0.5),
    ocfConversion: clamp(base.ocfConversion * t.ocf, 0.3, 1.4),
    debtServiceGrowth: base.debtServiceGrowth,
  };
}

/* ----- Forecast ----- */

export interface ForecastInput {
  baseline: { revenue: number; agi: number; ebitda: number; ocf: number; debtService: number };
  startYear: number; startMonth: number;
  horizon: Horizon; assumptions: Assumptions; scenario: Scenario;
}

export function forecast(input: ForecastInput): ProjectionResult {
  const a = input.assumptions;
  const points: ProjectionPoint[] = [];
  let cumulativeCash = 0;
  let totalRevenue = 0, totalAGI = 0, totalEbitda = 0;

  for (let i = 1; i <= input.horizon; i++) {
    const { year, month } = addMonths(input.startYear, input.startMonth, i);
    const seasonal = 1 + 0.05 * Math.sin(((month - 1) / 12) * Math.PI * 2 - Math.PI / 2);
    const revenue = input.baseline.revenue * Math.pow(1 + a.revenueGrowth, i) * seasonal;
    const agi = revenue * a.agiMargin;
    const ebitda = revenue * a.ebitdaMargin;
    const ocf = ebitda * a.ocfConversion;
    const debtService = input.baseline.debtService * Math.pow(1 + a.debtServiceGrowth, i);
    cumulativeCash += (ocf - debtService);
    totalRevenue += revenue; totalAGI += agi; totalEbitda += ebitda;
    points.push({
      ym: ymKey(year, month), year, month, t: i,
      revenue, agi, ebitda, ocf, debtService, cumulativeCash,
    });
  }

  return {
    scenario: input.scenario, horizon: input.horizon, assumptions: a,
    baseline: input.baseline, points,
    summary: {
      totalRevenue, totalAGI, totalEbitda,
      endingCash: cumulativeCash,
      ebitdaMargin: totalRevenue > 0 ? (totalEbitda / totalRevenue) * 100 : 0,
      cagr: (Math.pow(1 + a.revenueGrowth, 12) - 1) * 100,
    },
  };
}

/* ----- Baselines ----- */

export function baselineFromHistory(history: AgencyHistory) {
  const last3 = lastNMonths(history.points, 3);
  return {
    revenue: avg(last3.map(p => p.revenue)),
    agi: avg(last3.map(p => p.agi)),
    ebitda: avg(last3.map(p => p.ebitda)),
    ocf: avg(last3.map(p => p.operatingCashflow)),
    debtService: avg(last3.map(p => p.debtService)),
  };
}

export function groupBaseline() {
  const histories = getAllHistories();
  const byYm = new Map<string, MonthlyPoint>();
  histories.forEach(h => h.points.forEach(p => {
    const cur = byYm.get(p.ym);
    if (!cur) byYm.set(p.ym, { ...p });
    else {
      cur.revenue += p.revenue; cur.agi += p.agi; cur.ebitda += p.ebitda;
      cur.operatingCashflow += p.operatingCashflow; cur.debtService += p.debtService;
    }
  }));
  const sorted = Array.from(byYm.values()).sort((a, b) => a.ym.localeCompare(b.ym));
  return baselineFromHistory({ agencyId: '__group__', points: sorted });
}

export function getStartFromHistory(history: AgencyHistory) {
  const last = history.points[history.points.length - 1];
  return { startYear: last.year, startMonth: last.month };
}

export function getAgencyHistory(agencyId: string): AgencyHistory | undefined {
  return getAllHistories().find(h => h.agencyId === agencyId);
}

export function projectableAgencies(): Agency[] {
  return mockAgencies.filter(a => a.nivel <= 3);
}

/* ============================================================
   Roadmap de Transición de Niveles
============================================================ */

export interface TransitionGate {
  code: string; label: string; current: number; target: number;
  unit: 'index' | 'pct' | 'months' | 'usd';
  status: 'ok' | 'gap' | 'critical';
  hint: string;
}

export interface TransitionPlan {
  from: NivelIntegracion; to: NivelIntegracion;
  title: string; description: string;
  gates: TransitionGate[];
  readiness: number;
  etaMonths: number | null;
  milestones: { month: number; label: string; owner: string }[];
}

function gate(code: string, label: string, current: number, target: number, unit: TransitionGate['unit'], hint: string, higherIsBetter = true): TransitionGate {
  const ok = higherIsBetter ? current >= target : current <= target;
  const gap = higherIsBetter ? (target - current) / Math.max(target, 1) : (current - target) / Math.max(target, 1);
  let status: TransitionGate['status'] = 'ok';
  if (!ok) status = gap > 0.25 ? 'critical' : 'gap';
  return { code, label, current, target, unit, status, hint };
}

function planN3toN2(a: Agency): TransitionPlan {
  const ipp = (a.dec / 100 * 5) * 0.30 + a.cec * 0.30 + a.iif * 0.20 + (6 - a.irf) * 0.20;
  const gates: TransitionGate[] = [
    gate('IPP', 'Índice de Preparación para Participación', ipp, 3.8, 'index', 'Activa transición a participación minoritaria.'),
    gate('IIF', 'Integración Financiera', a.iif, 3.5, 'index', 'Reporting auditable, NIIF, close mensual <10 días.'),
    gate('DEC', 'Dependencia Económica Cruzada', a.dec, 40, 'pct', '% de revenue desde QG y clientes QG.'),
    gate('Margen', 'EBITDA Margin', a.margin, 12, 'pct', 'Mínimo de rentabilidad para integración financiera.'),
    gate('IRF', 'Riesgo Fundador (inverso)', 6 - a.irf, 3, 'index', 'Delegación operativa demostrada.'),
  ];
  const okCount = gates.filter(g => g.status === 'ok').length;
  const readiness = (okCount / gates.length) * 100;
  return {
    from: 3, to: 2,
    title: 'Integración Operativa & Financiera (N3 → N2)',
    description: 'Pasar de "agencia aliada" a "participación minoritaria con integración operativa". Requiere abrir libros, alinear procesos y reducir riesgo fundador.',
    gates, readiness,
    etaMonths: readiness >= 100 ? 0 : Math.ceil((100 - readiness) / 8),
    milestones: [
      { month: 1, label: 'Audit-readiness: cierre contable mensual auditable', owner: 'CFO QG + Founder' },
      { month: 2, label: 'Integración con ERP / dashboards QG', owner: 'CTO QG' },
      { month: 3, label: 'Carta de intención y valuación independiente', owner: 'M&A QG' },
      { month: 5, label: 'Cierre minoritario (15-35% equity)', owner: 'Legal' },
      { month: 6, label: 'Plan 100 días post-deal', owner: 'COO QG' },
    ],
  };
}

function planN2toN1(a: Agency): TransitionPlan {
  const ipc = a.det * 0.30 + a.cei * 0.30 + a.iiot * 0.20 + (6 - a.iarf) * 0.20;
  const gates: TransitionGate[] = [
    gate('IPC', 'Índice de Preparación para Control', ipc, 4.0, 'index', 'Activa toma de control mayoritario.'),
    gate('IIOT', 'Integración Operativa Total', a.iiot, 3.5, 'index', 'Sistemas y operación centralizada.'),
    gate('DET', 'Dependencia Estratégica Total', a.det, 4, 'index', 'Dependencia recíproca QG ↔ agencia.'),
    gate('CEI', 'Capacidad Estratégica Institucional', a.cei, 4, 'index', 'Governance, compliance, procesos plenos.'),
    gate('Equity', 'Equity QG actual', a.equity, 35, 'pct', 'Base mínima para escalar a control mayoritario.'),
    gate('Revenue', 'Revenue anual ($M)', a.revenue / 1_000_000, 1, 'usd', 'Mínimo $1M para ser elegible a N1.'),
  ];
  const okCount = gates.filter(g => g.status === 'ok').length;
  const readiness = (okCount / gates.length) * 100;
  return {
    from: 2, to: 1,
    title: 'Toma de Control Mayoritario (N2 → N1)',
    description: 'Convertir participación minoritaria en subsidiaria controlada (≥51%). Requiere governance institucional y operación integrada al hub.',
    gates, readiness,
    etaMonths: readiness >= 100 ? 0 : Math.ceil((100 - readiness) / 6),
    milestones: [
      { month: 2, label: 'Comité de governance instalado (board QG)', owner: 'Chairman QG' },
      { month: 4, label: 'Integración de sistemas críticos (ERP, BI, CRM)', owner: 'CTO QG' },
      { month: 6, label: 'Acuerdo de control mayoritario (≥51%)', owner: 'M&A + Legal' },
      { month: 9, label: 'Transición de CEO o ratificación con plan de sucesión', owner: 'CEO QG' },
      { month: 12, label: 'Consolidación contable plena en grupo', owner: 'CFO QG' },
    ],
  };
}

function planN4toN3(a: Agency): TransitionPlan {
  const ipe = (a.dec / 100 * 5) * 0.35 + a.cme * 0.35 + a.iio * 0.15 + (6 - a.is_) * 0.15;
  const gates: TransitionGate[] = [
    gate('IPE', 'Índice de Poder Estratégico', ipe, 3.8, 'index', 'Capacidad real de QG de influir.'),
    gate('DEC', 'Dependencia Económica Cruzada', a.dec, 25, 'pct', 'Mínimo de revenue cruzado.'),
    gate('IIO', 'Integración Operativa', a.iio, 3, 'index', 'Procesos comunes con QG.'),
    gate('CME', 'Calidad de Métricas', a.cme, 3.5, 'index', 'KPIs y data trazables.'),
  ];
  const okCount = gates.filter(g => g.status === 'ok').length;
  const readiness = (okCount / gates.length) * 100;
  return {
    from: 4, to: 3,
    title: 'Alianza Estratégica Formal (N4 → N3)',
    description: 'Pasar de proveedor a socio estratégico con dependencia mutua y MSA de largo plazo.',
    gates, readiness,
    etaMonths: readiness >= 100 ? 0 : Math.ceil((100 - readiness) / 10),
    milestones: [
      { month: 1, label: 'MSA marco firmado (3+ años)', owner: 'Legal' },
      { month: 2, label: 'Dashboards compartidos en vivo', owner: 'BI QG' },
      { month: 3, label: 'Onboarding al Playbook QG', owner: 'COO QG' },
    ],
  };
}

export function getTransitionPlan(a: Agency): TransitionPlan | null {
  if (a.nivel === 4) return planN4toN3(a);
  if (a.nivel === 3) return planN3toN2(a);
  if (a.nivel === 2) return planN2toN1(a);
  return null;
}
