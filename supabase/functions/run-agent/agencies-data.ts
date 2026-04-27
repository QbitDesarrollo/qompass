// Snapshot portable de mockAgencies para uso en el edge function.
// Mantener sincronizado con src/lib/mock-data.ts cuando cambie.

export interface AgencyData {
  id: string; name: string; vertical: string; nivel: 1|2|3|4;
  equity: number; revenue: number; agi: number; ebitda: number; margin: number;
  dec: number; iio: number; iif: number; iiot: number;
  is_: number; irf: number; iarf: number;
  cme: number; cec: number; cei: number; det: number;
  country: string;
  operatingCashflow: number; debtService: number;
}

export const AGENCIES: AgencyData[] = [
  { id:'1', name:'Apex Creative Studio', vertical:'Creative & Strategy', nivel:1, equity:65, revenue:4_200_000, agi:2_940_000, ebitda:840_000, margin:20, dec:72, iio:4.5, iif:4.8, iiot:4.2, is_:4, irf:2, iarf:1.5, cme:4.5, cec:4.2, cei:4.6, det:4.3, country:'México', operatingCashflow:760_000, debtService:320_000 },
  { id:'2', name:'Pulse Media Group', vertical:'Media & Performance', nivel:2, equity:30, revenue:6_800_000, agi:3_400_000, ebitda:1_020_000, margin:15, dec:45, iio:3.5, iif:3.8, iiot:3.2, is_:3, irf:3.5, iarf:3, cme:3.8, cec:4.0, cei:3.5, det:3.8, country:'Colombia', operatingCashflow:920_000, debtService:540_000 },
  { id:'3', name:'StreetForce BTL', vertical:'Trade & BTL', nivel:3, equity:0, revenue:2_100_000, agi:1_260_000, ebitda:378_000, margin:18, dec:35, iio:2.8, iif:2.5, iiot:2.0, is_:2.5, irf:4, iarf:3.8, cme:3.2, cec:3.0, cei:2.8, det:2.5, country:'Perú', operatingCashflow:320_000, debtService:280_000 },
  { id:'4', name:'NexaTech Solutions', vertical:'Data / Tech / AI', nivel:2, equity:25, revenue:8_500_000, agi:5_100_000, ebitda:1_700_000, margin:20, dec:55, iio:3.8, iif:4.0, iiot:3.5, is_:4.5, irf:2.5, iarf:2, cme:4.2, cec:4.5, cei:4.0, det:4.2, country:'México', operatingCashflow:1_550_000, debtService:620_000 },
  { id:'5', name:'VelocitySales Co', vertical:'Contact & Sales', nivel:4, equity:0, revenue:1_800_000, agi:900_000, ebitda:270_000, margin:15, dec:28, iio:2.0, iif:1.8, iiot:1.5, is_:2, irf:4.5, iarf:4, cme:2.8, cec:2.5, cei:2.0, det:2.0, country:'Chile', operatingCashflow:240_000, debtService:220_000 },
  { id:'6', name:'Lumina Creatives', vertical:'Creative & Strategy', nivel:3, equity:0, revenue:1_500_000, agi:900_000, ebitda:225_000, margin:15, dec:40, iio:3.0, iif:2.8, iiot:2.5, is_:3, irf:3.8, iarf:3.5, cme:3.5, cec:3.2, cei:3.0, det:2.8, country:'Argentina', operatingCashflow:200_000, debtService:180_000 },
  { id:'7', name:'Broadcast Digital', vertical:'Media & Performance', nivel:1, equity:55, revenue:5_500_000, agi:3_300_000, ebitda:990_000, margin:18, dec:80, iio:4.8, iif:4.5, iiot:4.5, is_:4.5, irf:1.5, iarf:1.2, cme:4.8, cec:4.5, cei:4.8, det:4.5, country:'México', operatingCashflow:900_000, debtService:380_000 },
  { id:'8', name:'ImpactoBTL', vertical:'Trade & BTL', nivel:4, equity:0, revenue:950_000, agi:475_000, ebitda:95_000, margin:10, dec:20, iio:1.8, iif:1.5, iiot:1.2, is_:1.5, irf:4.8, iarf:4.5, cme:2.0, cec:1.8, cei:1.5, det:1.5, country:'Ecuador', operatingCashflow:80_000, debtService:95_000 },
  { id:'9', name:'CloudStack Dev', vertical:'Data / Tech / AI', nivel:3, equity:0, revenue:3_200_000, agi:2_240_000, ebitda:640_000, margin:20, dec:42, iio:3.2, iif:3.0, iiot:2.8, is_:3.5, irf:3.2, iarf:3.0, cme:3.8, cec:3.5, cei:3.2, det:3.5, country:'Colombia', operatingCashflow:580_000, debtService:320_000 },
  { id:'10', name:'Revenue Partners', vertical:'Contact & Sales', nivel:2, equity:20, revenue:3_800_000, agi:1_900_000, ebitda:570_000, margin:15, dec:50, iio:3.5, iif:3.5, iiot:3.0, is_:3, irf:3.0, iarf:2.8, cme:3.8, cec:3.8, cei:3.5, det:3.5, country:'México', operatingCashflow:510_000, debtService:300_000 },
  { id:'11', name:'Kreatik Lab', vertical:'Creative & Strategy', nivel:2, equity:35, revenue:2_800_000, agi:1_680_000, ebitda:504_000, margin:18, dec:48, iio:3.5, iif:3.8, iiot:3.2, is_:3.5, irf:2.8, iarf:2.5, cme:4.0, cec:3.8, cei:3.5, det:3.8, country:'Colombia', operatingCashflow:460_000, debtService:230_000 },
  { id:'12', name:'DataDriven Media', vertical:'Media & Performance', nivel:3, equity:0, revenue:2_200_000, agi:1_320_000, ebitda:396_000, margin:18, dec:38, iio:2.8, iif:2.5, iiot:2.2, is_:2.8, irf:3.5, iarf:3.2, cme:3.2, cec:3.0, cei:2.8, det:2.8, country:'Perú', operatingCashflow:350_000, debtService:270_000 },
];

export function calcDSCR(a: AgencyData): number {
  if (!a.debtService || a.debtService <= 0) return Infinity;
  return a.operatingCashflow / a.debtService;
}
export function dscrStatus(dscr: number): 'excelente'|'bueno'|'aceptable'|'riesgo' {
  if (dscr >= 2) return 'excelente';
  if (dscr >= 1.5) return 'bueno';
  if (dscr >= 1.25) return 'aceptable';
  return 'riesgo';
}
export function calcIPE(a: AgencyData) { return (a.dec/100*5)*0.35 + a.cme*0.35 + a.iio*0.15 + (6-a.is_)*0.15; }
export function calcIPP(a: AgencyData) { return (a.dec/100*5)*0.30 + a.cec*0.30 + a.iif*0.20 + (6-a.irf)*0.20; }
export function calcIPC(a: AgencyData) { return a.det*0.30 + a.cei*0.30 + a.iiot*0.20 + (6-a.iarf)*0.20; }

export function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function buildSnapshot() {
  const totalRevenue = AGENCIES.reduce((s,a)=>s+a.revenue,0);
  const consolidatedEbitda = AGENCIES.reduce((s,a)=>s+a.ebitda*(a.equity/100),0);
  return {
    asOf: new Date().toISOString().slice(0,10),
    group: {
      totalAgencies: AGENCIES.length,
      totalRevenueAnnualUSD: totalRevenue,
      consolidatedEbitdaUSD: Math.round(consolidatedEbitda),
      ebitdaMarginConsolidatedPct: totalRevenue>0 ? +((consolidatedEbitda/totalRevenue)*100).toFixed(2) : 0,
    },
    agencies: AGENCIES.map(a => ({
      id: a.id, name: a.name, vertical: a.vertical, country: a.country,
      nivel: a.nivel, equityQGpct: a.equity,
      revenueUSD: a.revenue, ebitdaUSD: a.ebitda, ebitdaMarginPct: a.margin,
      ocfUSD: a.operatingCashflow, debtServiceUSD: a.debtService,
      indices: {
        DEC_pct: a.dec, IIO: a.iio, IIF: a.iif, IIOT: a.iiot,
        IS: a.is_, IRF: a.irf, IARF: a.iarf,
        CME: a.cme, CEC: a.cec, CEI: a.cei, DET: a.det,
        IPE: +calcIPE(a).toFixed(2), IPP: +calcIPP(a).toFixed(2), IPC: +calcIPC(a).toFixed(2),
      },
      dscr: isFinite(calcDSCR(a)) ? +calcDSCR(a).toFixed(2) : null,
    })),
  };
}