import { mockAgencies } from '@/lib/mock-data';
import {
  calcIPE, calcIPP, calcIPC, getConsolidatedEbitda, isLevel1Eligible,
} from '@/lib/quantum-engine';
import { ANCHOR_YEAR, ANCHOR_MONTH, getAllHistories } from '@/lib/historical-data';
import { DEMO_DEALS } from '@/lib/deals/deals-data';

/**
 * Construye un snapshot compacto pero completo del estado de Qompass para
 * pasarlo al modelo como contexto. Mantiene todo en JSON-serializable.
 */
export function buildQompassSnapshot() {
  const agencies = mockAgencies.map(a => ({
    id: a.id,
    name: a.name,
    vertical: a.vertical,
    country: a.country,
    nivel: a.nivel,
    equityQG_pct: a.equity,
    revenueAnnualUSD: a.revenue,
    agiAnnualUSD: a.agi,
    ebitdaAnnualUSD: a.ebitda,
    ebitdaMarginPct: a.margin,
    operatingCashflowAnnualUSD: a.operatingCashflow,
    debtServiceAnnualUSD: a.debtService,
    indices: {
      DEC_pct: a.dec, IIO: a.iio, IIF: a.iif, IIOT: a.iiot,
      IS: a.is_, IRF: a.irf, IARF: a.iarf,
      CME: a.cme, CEC: a.cec, CEI: a.cei, DET: a.det,
      IPE_current: +calcIPE(a).toFixed(2),
      IPP_current: +calcIPP(a).toFixed(2),
      IPC_current: +calcIPC(a).toFixed(2),
    },
    eligibleForN1: isLevel1Eligible(a),
  }));

  // Agregados del grupo
  const totalRevenue = mockAgencies.reduce((s, a) => s + a.revenue, 0);
  const consolidatedEbitda = getConsolidatedEbitda(mockAgencies);
  const totalOCF = mockAgencies.reduce((s, a) => s + a.operatingCashflow * (a.equity / 100), 0);
  const totalDS = mockAgencies.reduce((s, a) => s + a.debtService * (a.equity / 100), 0);

  const byNivel = [1, 2, 3, 4].map(n => {
    const list = mockAgencies.filter(a => a.nivel === n);
    return {
      nivel: n,
      count: list.length,
      revenueUSD: list.reduce((s, a) => s + a.revenue, 0),
      ebitdaUSD: list.reduce((s, a) => s + a.ebitda, 0),
      avgEquityQG_pct: list.length ? +(list.reduce((s, a) => s + a.equity, 0) / list.length).toFixed(1) : 0,
    };
  });

  // Histórico mensual del grupo (últimos 12)
  const histories = getAllHistories();
  const groupMonthlyMap = new Map<string, { ym: string; revenue: number; agi: number; ebitda: number; ocf: number; ds: number }>();
  histories.forEach(h => h.points.forEach(p => {
    const cur = groupMonthlyMap.get(p.ym) || { ym: p.ym, revenue: 0, agi: 0, ebitda: 0, ocf: 0, ds: 0 };
    cur.revenue += p.revenue; cur.agi += p.agi; cur.ebitda += p.ebitda;
    cur.ocf += p.operatingCashflow; cur.ds += p.debtService;
    groupMonthlyMap.set(p.ym, cur);
  }));
  const groupMonthly = Array.from(groupMonthlyMap.values())
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .slice(-12)
    .map(p => ({
      ym: p.ym,
      revenue: Math.round(p.revenue),
      agi: Math.round(p.agi),
      ebitda: Math.round(p.ebitda),
      ocf: Math.round(p.ocf),
      ds: Math.round(p.ds),
    }));

  // Deals
  const deals = DEMO_DEALS.map(d => ({
    id: d.id,
    name: d.name,
    stage: d.stage,
    targetCompany: d.target,
    askingPriceUSD: d.inputs?.ask,
    sellerEbitdaUSD: d.inputs?.ebitda,
    industryMultiple: d.inputs?.industryMultiple,
    pctEquityAcquired: d.inputs?.pctEquityAcquired,
    ddItems: Object.keys(d.ddStatus || {}).length,
  }));

  return {
    asOf: { year: ANCHOR_YEAR, month: ANCHOR_MONTH },
    group: {
      totalAgencies: mockAgencies.length,
      totalRevenueAnnualUSD: totalRevenue,
      consolidatedEbitdaUSD: Math.round(consolidatedEbitda),
      ebitdaMarginConsolidatedPct: totalRevenue > 0 ? +((consolidatedEbitda / totalRevenue) * 100).toFixed(2) : 0,
      operatingCashflowQGShareUSD: Math.round(totalOCF),
      debtServiceQGShareUSD: Math.round(totalDS),
      netCashflowQGShareUSD: Math.round(totalOCF - totalDS),
      byNivel,
    },
    agencies,
    groupMonthlyLast12: groupMonthly,
    deals,
  };
}