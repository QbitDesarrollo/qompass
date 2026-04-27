export type Vertical =
  | 'Creative & Strategy'
  | 'Media & Performance'
  | 'Trade & BTL'
  | 'Data / Tech / AI'
  | 'Contact & Sales';
export type NivelIntegracion = 1 | 2 | 3 | 4;

export interface Agency {
  id: string;
  name: string;
  vertical: Vertical;
  nivel: NivelIntegracion;
  equity: number; // % owned by QG
  revenue: number; // annual revenue USD
  agi: number; // gross margin
  ebitda: number;
  margin: number; // ebitda margin %
  // Qualitative indices (1-5)
  dec: number; // Dependencia Económica Cruzada (as %)
  iio: number; // Integración Operativa
  iif: number; // Integración Financiera
  iiot: number; // Integración Operativa Total
  is_: number; // Sustituibilidad
  irf: number; // Riesgo Fundador
  iarf: number; // Autonomía Residual
  // Qualitative extras for formulas
  cme: number; // Calidad de la Métrica Estratégica (1-5)
  cec: number; // Capacidad Estratégica Comercial (1-5)
  cei: number; // Capacidad Estratégica Institucional (1-5)
  det: number; // Dependencia Estratégica Total (1-5)
  // History for 2-period rule
  ipeHistory: number[];
  ippHistory: number[];
  ipcHistory: number[];
  country: string;
  // Cash & Debt
  operatingCashflow: number; // annual operating cash flow USD
  debtService: number;       // annual debt obligation (principal + interest) USD
}

// Index calculations
export function calcIPE(a: Agency): number {
  return (a.dec / 100 * 5) * 0.35 + a.cme * 0.35 + a.iio * 0.15 + (6 - a.is_) * 0.15;
}

export function calcIPP(a: Agency): number {
  return (a.dec / 100 * 5) * 0.30 + a.cec * 0.30 + a.iif * 0.20 + (6 - a.irf) * 0.20;
}

export function calcIPC(a: Agency): number {
  return a.det * 0.30 + a.cei * 0.30 + a.iiot * 0.20 + (6 - a.iarf) * 0.20;
}

export function getAscensionOpportunity(a: Agency): { type: string; index: string; value: number } | null {
  const ipe = calcIPE(a);
  const ipp = calcIPP(a);
  const ipc = calcIPC(a);

  if (a.nivel === 4 && ipe > 3.8 && a.ipeHistory.length > 0 && a.ipeHistory[a.ipeHistory.length - 1] > 3.8) {
    return { type: '4→3', index: 'IPE', value: ipe };
  }
  if (a.nivel === 3 && ipp > 3.8 && a.ippHistory.length > 0 && a.ippHistory[a.ippHistory.length - 1] > 3.8) {
    return { type: '3→2', index: 'IPP', value: ipp };
  }
  if (a.nivel === 2 && ipc > 4.0 && a.ipcHistory.length > 0 && a.ipcHistory[a.ipcHistory.length - 1] > 4.0) {
    return { type: '2→1', index: 'IPC', value: ipc };
  }
  return null;
}

export function isLevel1Eligible(a: Agency): boolean {
  return a.revenue > 1_000_000 && a.ebitda > 0 && a.margin > 10;
}

export function getConsolidatedEbitda(agencies: Agency[]): number {
  return agencies.reduce((sum, a) => sum + a.ebitda * (a.equity / 100), 0);
}

// Cash flow helpers
export function calcDSCR(a: Agency): number {
  if (!a.debtService || a.debtService <= 0) return Infinity;
  return a.operatingCashflow / a.debtService;
}

export type DSCRStatus = 'excelente' | 'bueno' | 'aceptable' | 'riesgo';

export function getDSCRStatus(dscr: number): DSCRStatus {
  if (dscr >= 2) return 'excelente';
  if (dscr >= 1.5) return 'bueno';
  if (dscr >= 1.25) return 'aceptable';
  return 'riesgo';
}

export const DSCR_STATUS_LABEL: Record<DSCRStatus, string> = {
  excelente: 'Excelente (≥2.0x)',
  bueno: 'Bueno (1.5–2.0x)',
  aceptable: 'Aceptable (1.25–1.5x)',
  riesgo: 'En Riesgo (<1.25x)',
};

// Leverage capacity: cuánto debt service adicional puede soportar la agencia
// manteniendo el DSCR objetivo. Asume mismo costo de deuda que el actual
// (el debt service incremental se traduce a deuda incremental usando un
// múltiplo deuda/servicio). Si no hay debt service base, asumimos un coverage
// service factor estándar de ~6x (≈ deuda a 6 años amortizada con interés).
// Present value of an annuity: principal soportado por una cuota anual constante
// dado plazo (años) y tasa anual. Si tasa = 0, el principal es cuota × plazo.
export function pvAnnuity(annualPayment: number, years: number, annualRate: number): number {
  if (annualPayment <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return annualPayment * years;
  const r = annualRate;
  return annualPayment * (1 - Math.pow(1 + r, -years)) / r;
}

export function calcLeverageCapacity(
  a: Agency,
  targetDSCR: number = 1.5,
  amortYears: number = 6,
  annualRate: number = 0.10,
): {
  additionalDebtService: number;
  additionalDebt: number;
  annualInterestEst: number;
  currentDSCR: number;
  maxDebtService: number;
  amortYears: number;
  annualRate: number;
} {
  const currentDSCR = calcDSCR(a);
  const maxDebtService = a.operatingCashflow / targetDSCR;
  const additionalDebtService = Math.max(0, maxDebtService - a.debtService);
  const additionalDebt = pvAnnuity(additionalDebtService, amortYears, annualRate);
  // Estimación de intereses del primer año sobre el principal nuevo
  const annualInterestEst = additionalDebt * annualRate;
  return { additionalDebtService, additionalDebt, annualInterestEst, currentDSCR, maxDebtService, amortYears, annualRate };
}

export function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

export const VERTICALS: Vertical[] = [
  'Creative & Strategy',
  'Media & Performance',
  'Trade & BTL',
  'Data / Tech / AI',
  'Contact & Sales',
];
export const NIVELES: NivelIntegracion[] = [1, 2, 3, 4];

export const VERTICAL_COLORS: Record<Vertical, string> = {
  'Creative & Strategy': 'hsl(270, 67%, 55%)',
  'Media & Performance': 'hsl(217, 91%, 60%)',
  'Trade & BTL': 'hsl(350, 89%, 60%)',
  'Data / Tech / AI': 'hsl(160, 84%, 39%)',
  'Contact & Sales': 'hsl(45, 93%, 58%)',
};

export const NIVEL_LABELS: Record<NivelIntegracion, string> = {
  1: 'Subsidiaria Majority',
  2: 'Participación Minoritaria',
  3: 'Partner Estratégico',
  4: 'Operador Certificado',
};
