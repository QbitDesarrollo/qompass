import { mockAgencies } from './mock-data';
import { Agency } from './quantum-engine';

/**
 * Generador determinista de series mensuales por agencia.
 * Toma los valores ACTUALES como el "mes presente" (mes ancla)
 * y proyecta 23 meses hacia atrás aplicando:
 *  - Crecimiento mensual compuesto (≈ +1.0% / mes promedio)
 *  - Estacionalidad trimestral suave
 *  - Ruido determinista por agencia (seed = id)
 *  - Variación independiente por métrica
 */

export type Granularity = 'month' | 'quarter' | 'year' | 'last12' | 'last24' | 'custom';

export interface MonthlyPoint {
  /** YYYY-MM */
  ym: string;
  year: number;
  month: number; // 1-12
  revenue: number;
  agi: number;
  ebitda: number;
  operatingCashflow: number;
  debtService: number;
}

export interface AgencyHistory {
  agencyId: string;
  points: MonthlyPoint[];
}

export interface AgencyPeriodMetrics {
  agencyId: string;
  revenue: number;
  agi: number;
  ebitda: number;
  operatingCashflow: number;
  debtService: number;
  margin: number;        // ebitda / revenue * 100
  dscr: number;          // ocf / debtService
  monthsCovered: number;
  available: boolean;
}

/** Mes ancla = mes actual del calendario. Los datos "actuales" se asignan a este mes. */
const NOW = new Date();
export const ANCHOR_YEAR = NOW.getFullYear();
export const ANCHOR_MONTH = NOW.getMonth() + 1; // 1-12
export const HISTORY_MONTHS = 24;

function seededRand(seed: number) {
  // Mulberry32
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ymKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/** Genera la serie mensual completa para una agencia (24 meses, oldest → newest). */
function buildAgencyHistory(agency: Agency): AgencyHistory {
  const rand = seededRand(hashId(agency.id));
  const monthlyGrowth = 0.010; // ~12.7% anual base
  // Variabilidad de crecimiento por agencia
  const growthBias = (rand() - 0.5) * 0.012; // ±0.6%/mes
  const g = monthlyGrowth + growthBias;

  // Construimos en orden cronológico desde el más antiguo al ancla.
  const points: MonthlyPoint[] = [];
  const anchor = { year: ANCHOR_YEAR, month: ANCHOR_MONTH };

  for (let offset = HISTORY_MONTHS - 1; offset >= 0; offset--) {
    const { year, month } = addMonths(anchor.year, anchor.month, -offset);
    // Factor de escala: el ancla = 1, meses anteriores = (1+g)^-offset
    const baseFactor = Math.pow(1 + g, -offset);
    // Estacionalidad: Q4 fuerte, Q1 suave
    const seasonal = 1 + 0.06 * Math.sin(((month - 1) / 12) * Math.PI * 2 - Math.PI / 2);
    // Ruido por mes y métrica (determinista)
    const noise = (k: number) => 1 + (rand() - 0.5) * (0.04 + k * 0.01);

    const revenue = (agency.revenue / 12) * baseFactor * seasonal * noise(0);
    const agi = (agency.agi / 12) * baseFactor * seasonal * noise(1);
    // EBITDA es más volátil que revenue
    const ebitda = (agency.ebitda / 12) * baseFactor * seasonal * noise(2);
    // Operating cashflow sigue al ebitda con ligero rezago
    const ocf = (agency.operatingCashflow / 12) * baseFactor * seasonal * noise(3);
    // Debt service relativamente estable, baja levemente atrás (deuda nueva)
    const ds = (agency.debtService / 12) * (0.85 + 0.15 * baseFactor) * noise(4);

    points.push({
      ym: ymKey(year, month),
      year, month,
      revenue, agi, ebitda,
      operatingCashflow: ocf,
      debtService: ds,
    });
  }
  return { agencyId: agency.id, points };
}

/** Cache en memoria de las historias generadas. */
let _cache: AgencyHistory[] | null = null;
export function getAllHistories(): AgencyHistory[] {
  if (!_cache) {
    _cache = mockAgencies.map(a => buildAgencyHistory(a));
  }
  return _cache;
}

/* ============================================================
   Period model
============================================================ */

export interface Period {
  granularity: Granularity;
  /** Año del periodo (granularity=month|quarter|year). Ignorado en last12/last24/custom. */
  year: number;
  /** Mes 1-12 (granularity=month), trimestre 1-4 (granularity=quarter), o 0. Ignorado en presets/custom. */
  index: number;
  /** Rango personalizado YYYY-MM (sólo granularity=custom). */
  customFrom?: string;
  customTo?: string;
}

export function currentPeriod(g: Granularity): Period {
  if (g === 'month') return { granularity: g, year: ANCHOR_YEAR, index: ANCHOR_MONTH };
  if (g === 'quarter') return { granularity: g, year: ANCHOR_YEAR, index: Math.ceil(ANCHOR_MONTH / 3) };
  if (g === 'year') return { granularity: g, year: ANCHOR_YEAR, index: 0 };
  if (g === 'last12' || g === 'last24') return { granularity: g, year: ANCHOR_YEAR, index: ANCHOR_MONTH };
  // custom — por defecto, los últimos 6 meses
  const start = addMonths(ANCHOR_YEAR, ANCHOR_MONTH, -5);
  return {
    granularity: 'custom',
    year: ANCHOR_YEAR,
    index: ANCHOR_MONTH,
    customFrom: ymKey(start.year, start.month),
    customTo: ymKey(ANCHOR_YEAR, ANCHOR_MONTH),
  };
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.granularity === 'month') {
    const { year, month } = addMonths(p.year, p.index, delta);
    return { granularity: 'month', year, index: month };
  }
  if (p.granularity === 'quarter') {
    const totalQ = p.year * 4 + (p.index - 1) + delta;
    return { granularity: 'quarter', year: Math.floor(totalQ / 4), index: (totalQ % 4) + 1 };
  }
  if (p.granularity === 'year') return { granularity: 'year', year: p.year + delta, index: 0 };
  // last12/last24/custom: desplazar el ancla en meses
  const months = p.granularity === 'last12' ? 12 : p.granularity === 'last24' ? 24 : 1;
  const anchor = addMonths(p.year, p.index, delta * months);
  if (p.granularity === 'custom' && p.customFrom && p.customTo) {
    const [fy, fm] = p.customFrom.split('-').map(Number);
    const [ty, tm] = p.customTo.split('-').map(Number);
    const f = addMonths(fy, fm, delta);
    const t = addMonths(ty, tm, delta);
    return { ...p, customFrom: ymKey(f.year, f.month), customTo: ymKey(t.year, t.month) };
  }
  return { ...p, year: anchor.year, index: anchor.month };
}

export function previousPeriod(p: Period): Period {
  return shiftPeriod(p, -1);
}

export function yoyPeriod(p: Period): Period {
  if (p.granularity === 'month') return shiftPeriod(p, -12);
  if (p.granularity === 'quarter') return shiftPeriod(p, -4);
  if (p.granularity === 'year') return shiftPeriod(p, -1);
  // last12/last24/custom: shift de 12 meses
  if (p.granularity === 'custom' && p.customFrom && p.customTo) {
    const [fy, fm] = p.customFrom.split('-').map(Number);
    const [ty, tm] = p.customTo.split('-').map(Number);
    const f = addMonths(fy, fm, -12);
    const t = addMonths(ty, tm, -12);
    return { ...p, customFrom: ymKey(f.year, f.month), customTo: ymKey(t.year, t.month) };
  }
  const a = addMonths(p.year, p.index, -12);
  return { ...p, year: a.year, index: a.month };
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatPeriod(p: Period): string {
  if (p.granularity === 'month') return `${MONTH_NAMES[p.index - 1]} ${p.year}`;
  if (p.granularity === 'quarter') return `Q${p.index} ${p.year}`;
  if (p.granularity === 'year') return `${p.year}`;
  if (p.granularity === 'last12') {
    const start = addMonths(p.year, p.index, -11);
    return `${MONTH_NAMES[start.month - 1]} ${start.year} → ${MONTH_NAMES[p.index - 1]} ${p.year}`;
  }
  if (p.granularity === 'last24') {
    const start = addMonths(p.year, p.index, -23);
    return `${MONTH_NAMES[start.month - 1]} ${start.year} → ${MONTH_NAMES[p.index - 1]} ${p.year}`;
  }
  // custom
  if (p.customFrom && p.customTo) {
    const [fy, fm] = p.customFrom.split('-').map(Number);
    const [ty, tm] = p.customTo.split('-').map(Number);
    return `${MONTH_NAMES[fm - 1]} ${fy} → ${MONTH_NAMES[tm - 1]} ${ty}`;
  }
  return 'Personalizado';
}

/** ¿Pertenece (year,month) al periodo p? */
function pointInPeriod(year: number, month: number, p: Period): boolean {
  if (p.granularity === 'month') return year === p.year && month === p.index;
  if (p.granularity === 'quarter') {
    if (year !== p.year) return false;
    const q = Math.ceil(month / 3);
    return q === p.index;
  }
  if (p.granularity === 'year') return year === p.year;
  // Rango por meses (inclusive)
  let fromY: number, fromM: number, toY: number, toM: number;
  if (p.granularity === 'last12') {
    const start = addMonths(p.year, p.index, -11);
    fromY = start.year; fromM = start.month; toY = p.year; toM = p.index;
  } else if (p.granularity === 'last24') {
    const start = addMonths(p.year, p.index, -23);
    fromY = start.year; fromM = start.month; toY = p.year; toM = p.index;
  } else {
    if (!p.customFrom || !p.customTo) return false;
    [fromY, fromM] = p.customFrom.split('-').map(Number);
    [toY, toM] = p.customTo.split('-').map(Number);
  }
  const k = year * 12 + month;
  return k >= fromY * 12 + fromM && k <= toY * 12 + toM;
}

/** ¿Está el periodo dentro del rango cubierto por la historia? */
export function isPeriodAvailable(p: Period): boolean {
  const histories = getAllHistories();
  const sample = histories[0]?.points ?? [];
  if (sample.length === 0) return false;
  return sample.some(pt => pointInPeriod(pt.year, pt.month, p));
}

/* ============================================================
   Snapshot aggregation
============================================================ */

export interface PeriodSnapshot {
  period: Period;
  totalRevenue: number;
  totalAGI: number;
  totalEbitda: number;
  consolidatedEbitda: number;
  totalOCF: number;
  totalDS: number;
  groupDSCR: number;
  ebitdaMargin: number;
  consolidatedEbitdaMargin: number;
  dsOverOcf: number;
  /** EBITDA consolidado por vertical */
  byVertical: Record<string, number>;
  /** Número de meses agregados (1, 3 o 12) */
  monthsCovered: number;
  available: boolean;
}

function emptySnapshot(period: Period): PeriodSnapshot {
  return {
    period,
    totalRevenue: 0, totalAGI: 0, totalEbitda: 0, consolidatedEbitda: 0,
    totalOCF: 0, totalDS: 0, groupDSCR: 0,
    ebitdaMargin: 0, consolidatedEbitdaMargin: 0, dsOverOcf: 0,
    byVertical: {}, monthsCovered: 0, available: false,
  };
}

export function getSnapshot(period: Period): PeriodSnapshot {
  const histories = getAllHistories();
  const snap = emptySnapshot(period);

  let monthsSet = new Set<string>();

  histories.forEach(h => {
    const agency = mockAgencies.find(a => a.id === h.agencyId);
    if (!agency) return;
    const equityFactor = agency.equity / 100;

    h.points.forEach(pt => {
      if (!pointInPeriod(pt.year, pt.month, period)) return;
      monthsSet.add(pt.ym);
      snap.totalRevenue += pt.revenue;
      snap.totalAGI += pt.agi;
      snap.totalEbitda += pt.ebitda;
      snap.consolidatedEbitda += pt.ebitda * equityFactor;
      snap.totalOCF += pt.operatingCashflow;
      snap.totalDS += pt.debtService;
      snap.byVertical[agency.vertical] = (snap.byVertical[agency.vertical] || 0) + pt.ebitda * equityFactor;
    });
  });

  snap.monthsCovered = monthsSet.size;
  snap.available = snap.monthsCovered > 0;
  snap.groupDSCR = snap.totalDS > 0 ? snap.totalOCF / snap.totalDS : Infinity;
  snap.ebitdaMargin = snap.totalRevenue > 0 ? (snap.totalEbitda / snap.totalRevenue) * 100 : 0;
  snap.consolidatedEbitdaMargin = snap.totalRevenue > 0 ? (snap.consolidatedEbitda / snap.totalRevenue) * 100 : 0;
  snap.dsOverOcf = snap.totalOCF > 0 ? (snap.totalDS / snap.totalOCF) * 100 : 0;

  return snap;
}

/* ============================================================
   Deltas
============================================================ */

export interface Delta {
  abs: number;     // diferencia absoluta
  pct: number;     // %
  available: boolean;
}

export function delta(current: number, previous: number, available: boolean): Delta {
  if (!available || !isFinite(previous) || previous === 0) {
    return { abs: current - (previous || 0), pct: 0, available: false };
  }
  return { abs: current - previous, pct: ((current - previous) / Math.abs(previous)) * 100, available: true };
}

export interface DualDelta {
  vsPrev: Delta;
  vsYoY: Delta;
}

export function getDualDelta(
  current: PeriodSnapshot,
  prev: PeriodSnapshot,
  yoy: PeriodSnapshot,
  selector: (s: PeriodSnapshot) => number,
): DualDelta {
  return {
    vsPrev: delta(selector(current), selector(prev), prev.available),
    vsYoY:  delta(selector(current), selector(yoy),  yoy.available),
  };
}

/** Serie temporal para charts: últimos N periodos terminando en `endPeriod`. */
export function getPeriodSeries(endPeriod: Period, count: number): PeriodSnapshot[] {
  const out: PeriodSnapshot[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const p = shiftPeriod(endPeriod, -i);
    out.push(getSnapshot(p));
  }
  return out;
}

/* ============================================================
   Per-agency aggregation
============================================================ */

/** Agrega las métricas de UNA agencia para el periodo dado. */
export function getAgencyPeriodMetrics(agencyId: string, period: Period): AgencyPeriodMetrics {
  const histories = getAllHistories();
  const h = histories.find(x => x.agencyId === agencyId);
  const empty: AgencyPeriodMetrics = {
    agencyId, revenue: 0, agi: 0, ebitda: 0, operatingCashflow: 0, debtService: 0,
    margin: 0, dscr: 0, monthsCovered: 0, available: false,
  };
  if (!h) return empty;

  const months = new Set<string>();
  let revenue = 0, agi = 0, ebitda = 0, ocf = 0, ds = 0;
  h.points.forEach(pt => {
    if (!pointInPeriod(pt.year, pt.month, period)) return;
    months.add(pt.ym);
    revenue += pt.revenue;
    agi += pt.agi;
    ebitda += pt.ebitda;
    ocf += pt.operatingCashflow;
    ds += pt.debtService;
  });

  const monthsCovered = months.size;
  return {
    agencyId,
    revenue, agi, ebitda,
    operatingCashflow: ocf,
    debtService: ds,
    margin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
    dscr: ds > 0 ? ocf / ds : Infinity,
    monthsCovered,
    available: monthsCovered > 0,
  };
}

export function getAllAgencyMetrics(period: Period): Record<string, AgencyPeriodMetrics> {
  const out: Record<string, AgencyPeriodMetrics> = {};
  mockAgencies.forEach(a => {
    out[a.id] = getAgencyPeriodMetrics(a.id, period);
  });
  return out;
}

/** Serie temporal para UNA agencia: últimos N periodos terminando en `endPeriod`. */
export function getAgencyPeriodSeries(agencyId: string, endPeriod: Period, count: number): AgencyPeriodMetrics[] {
  const out: AgencyPeriodMetrics[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const p = shiftPeriod(endPeriod, -i);
    out.push(getAgencyPeriodMetrics(agencyId, p));
  }
  return out;
}