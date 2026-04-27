// EPIC Deal model — port of EPICDealDashboardv2.xlsx (Sheet1)
// Every formula maps 1:1 to the worksheet so the math stays defensible.

export type AssetKey =
  | 'cash' | 'ar' | 'notesReceivable' | 'cdMmTb' | 'securities'
  | 'rawMaterials' | 'wip' | 'inventory' | 'ffe' | 'vehicles'
  | 'thirdPartyInventory' | 'realEstate' | 'mfgEquipment'
  | 'otherAsset1' | 'otherAsset2';

export interface AssetLine {
  key: AssetKey;
  label: string;
  amount: number;            // C column
  carveout: number;          // E column
  fundingMethod: string;     // G column (informational)
  netFundingPct: number;     // H column (0..1)
  keep: 'Yes' | 'No' | 'N/A';
}

export interface DebtLine {
  label: string;
  amount: number;            // C42:C45
  sellerPays: number;        // E42:E45 — paid off at closing
}

export interface IpItem {
  label: string;
  exists: boolean;
  value: number;             // F25
}

export interface DealInputs {
  // Negotiation
  ask: number;                       // C24
  sales: number;                     // C25
  ebitda: number;                    // C26  (SDE/EBITDA)
  industryMultiple: number;          // C28
  pctEquityAcquired: number;         // K14 (0..1)
  negotiatedDiscount: number;        // K12 — absolute $ off

  // Alternative valuation (3rd party)
  useAlternative: boolean;           // K19
  alternativeValue: number;          // K20

  // Seller financing
  willSellerFinance: boolean;        // C33
  pctDealFinanced: number;           // C34 (0..1)

  // Earnout
  willEarnout: boolean;              // F30 toggle (implicit)
  earnoutPct: number;                // F31 (0..1) of ask

  // Investors
  pctSoldToInvestors: number;        // K24 (0..1)

  // Integrator equity
  integratorEquityPct: number;       // M6 sum (0..1)

  // Assets, debt, IP
  assets: AssetLine[];
  debt: DebtLine[];
  ip: IpItem[];
}

export interface DealOutputs {
  // valuation
  multipleImplied: number;           // C27 = ask / ebitda
  multipleDelta: number;             // C29
  industryFmv: number;               // K7 = ebitda * industryMultiple
  isAskHigherThanFmv: boolean;       // K8
  lowerOfAskFmv: number;             // K10
  thirdPartyValuation: number;       // K21
  netValuation: number;              // K13
  netPurchasePrice: number;          // K15
  // funding sources (Pre-Closing Stack / Post-Closing Stack)
  totalAssets: number;               // C21
  totalCarveouts: number;            // E21
  forFunding: number;                // F21
  totalAssetFunding: number;         // I21
  ipFunding: number;                 // H30
  sellerFinancing: number;           // C35 (= K15 * pctFinanced effectively, but worksheet uses ask)
  earnoutAmount: number;             // K15 * earnoutPct (post)
  totalDebtToReduce: number;         // F46
  cashFromInvestors: number;         // K25
  integratorPurchase: number;        // K7-ish: K21 * integratorEquityPct
  // stacks
  preClosingCashNeed: number;        // M17 = sum
  postClosingNetCash: number;        // M25
}

export const DEFAULT_ASSETS: AssetLine[] = [
  { key: 'cash',                label: 'Cash',                  amount: 0, carveout: 0, fundingMethod: 'W/C Adjust',         netFundingPct: 1.0, keep: 'Yes' },
  { key: 'ar',                  label: 'Accounts Receivable',   amount: 0, carveout: 0, fundingMethod: 'Factor AR',          netFundingPct: 0.8, keep: 'Yes' },
  { key: 'notesReceivable',     label: 'Notes Receivable',      amount: 0, carveout: 0, fundingMethod: 'Discount',           netFundingPct: 0.9, keep: 'Yes' },
  { key: 'cdMmTb',              label: 'CD / MM / T-Bills',     amount: 0, carveout: 0, fundingMethod: '—',                  netFundingPct: 1.0, keep: 'No'  },
  { key: 'securities',          label: 'Securities',            amount: 0, carveout: 0, fundingMethod: '—',                  netFundingPct: 1.0, keep: 'No'  },
  { key: 'rawMaterials',        label: 'Raw Materials',         amount: 0, carveout: 0, fundingMethod: 'Return',             netFundingPct: 0.5, keep: 'Yes' },
  { key: 'wip',                 label: 'Work In Process',       amount: 0, carveout: 0, fundingMethod: 'Finance',            netFundingPct: 0.5, keep: 'Yes' },
  { key: 'inventory',           label: 'Inventory',             amount: 0, carveout: 0, fundingMethod: '3P / Seller Consign',netFundingPct: 1.0, keep: 'Yes' },
  { key: 'ffe',                 label: 'FF&E',                  amount: 0, carveout: 0, fundingMethod: 'SLB',                netFundingPct: 1.0, keep: 'Yes' },
  { key: 'vehicles',            label: 'Vehicles',              amount: 0, carveout: 0, fundingMethod: 'Lease Option',       netFundingPct: 1.0, keep: 'Yes' },
  { key: 'thirdPartyInventory', label: '3rd Party Inventory',   amount: 0, carveout: 0, fundingMethod: 'Return',             netFundingPct: 1.0, keep: 'Yes' },
  { key: 'realEstate',          label: 'Real Estate',           amount: 0, carveout: 0, fundingMethod: 'RE Loan / SLB',      netFundingPct: 1.0, keep: 'Yes' },
  { key: 'mfgEquipment',        label: 'Manufacturing Equipment',amount: 0,carveout: 0, fundingMethod: 'Spindle',            netFundingPct: 1.0, keep: 'Yes' },
  { key: 'otherAsset1',         label: 'Other Asset #1',        amount: 0, carveout: 0, fundingMethod: '—',                  netFundingPct: 1.0, keep: 'N/A' },
  { key: 'otherAsset2',         label: 'Other Asset #2',        amount: 0, carveout: 0, fundingMethod: '—',                  netFundingPct: 1.0, keep: 'N/A' },
];

export const DEFAULT_DEBT: DebtLine[] = [
  { label: 'Accounts Payable', amount: 0, sellerPays: 0 },
  { label: 'Note Payable',     amount: 0, sellerPays: 0 },
  { label: 'Mortgage',         amount: 0, sellerPays: 0 },
  { label: 'Related Party',    amount: 0, sellerPays: 0 },
];

export const DEFAULT_IP: IpItem[] = [
  { label: 'Patents',          exists: false, value: 0 },
  { label: 'Trademarks',       exists: false, value: 0 },
  { label: 'Copyrights',       exists: false, value: 0 },
  { label: 'Trade Secrets',    exists: false, value: 0 },
  { label: 'License from Others', exists: false, value: 0 },
];

export function emptyInputs(): DealInputs {
  return {
    ask: 0, sales: 0, ebitda: 0, industryMultiple: 4,
    pctEquityAcquired: 1, negotiatedDiscount: 0,
    useAlternative: false, alternativeValue: 0,
    willSellerFinance: false, pctDealFinanced: 0,
    willEarnout: false, earnoutPct: 0,
    pctSoldToInvestors: 0,
    integratorEquityPct: 0.3,
    assets: DEFAULT_ASSETS.map(a => ({ ...a })),
    debt: DEFAULT_DEBT.map(d => ({ ...d })),
    ip: DEFAULT_IP.map(i => ({ ...i })),
  };
}

// ───────────────────────────── EPIC engine ─────────────────────────────
export function computeDeal(i: DealInputs): DealOutputs {
  const totalAssets   = i.assets.reduce((s,a) => s + a.amount, 0);                       // C21
  const totalCarveouts= i.assets.reduce((s,a) => s + a.carveout, 0);                     // E21
  const forFunding    = i.assets.reduce((s,a) => s + (a.amount - a.carveout), 0);        // F21
  const totalAssetFunding = i.assets.reduce((s,a) => s + (a.amount - a.carveout) * a.netFundingPct, 0); // I21

  const ipFunding = i.ip.reduce((s,x) => s + (x.exists ? x.value : 0), 0);               // H30

  const multipleImplied = i.ebitda > 0 ? i.ask / i.ebitda : 0;                           // C27
  const multipleDelta   = multipleImplied - i.industryMultiple;                          // C29
  const industryFmv     = i.ebitda * i.industryMultiple;                                 // K7
  const isAskHigherThanFmv = i.ask > industryFmv;                                        // K8
  const lowerOfAskFmv   = isAskHigherThanFmv ? industryFmv : i.ask;                      // K10
  const greaterOfAskFmv = i.ask > industryFmv ? i.ask : industryFmv;                    // K18
  const thirdPartyValuation = i.useAlternative ? i.alternativeValue : greaterOfAskFmv;  // K21

  const suggestedMaxOffer = lowerOfAskFmv;                                               // K11
  const netValuation      = suggestedMaxOffer - i.negotiatedDiscount;                    // K13
  const netPurchasePrice  = netValuation * i.pctEquityAcquired;                          // K15 = M10

  const integratorPurchase = thirdPartyValuation * i.integratorEquityPct;                // M7
  const cashFromInvestors  = thirdPartyValuation * i.pctSoldToInvestors;                 // K25

  const sellerFinancing = i.willSellerFinance ? netPurchasePrice * i.pctDealFinanced : 0; // ~K15*pct
  const earnoutAmount   = i.willEarnout       ? netPurchasePrice * i.earnoutPct     : 0;
  const totalDebtToReduce = i.debt.reduce((s,d) => s + Math.max(0, d.amount - d.sellerPays), 0); // F46

  // Pre-closing cash need (M17): purchase price minus all stacks
  // M10 + M11 + M12 + M13 + M14 + M15 + M16
  const preClosingCashNeed =
    netPurchasePrice
    - integratorPurchase
    - cashFromInvestors
    - sellerFinancing
    - earnoutAmount
    - totalDebtToReduce
    - totalCarveouts;

  // Post-closing: M21 + M22, then M24 + (M21+M22) = net OOP
  const postClosingNetCash = preClosingCashNeed - totalAssetFunding - ipFunding;

  return {
    multipleImplied, multipleDelta, industryFmv, isAskHigherThanFmv,
    lowerOfAskFmv, thirdPartyValuation, netValuation, netPurchasePrice,
    totalAssets, totalCarveouts, forFunding, totalAssetFunding,
    ipFunding, sellerFinancing, earnoutAmount, totalDebtToReduce,
    cashFromInvestors, integratorPurchase,
    preClosingCashNeed, postClosingNetCash,
  };
}

// ───────────────────────────── Deal model ─────────────────────────────
export type DealStage = 'sourcing' | 'loi' | 'dd' | 'negotiation' | 'closing' | 'closed' | 'lost';

export const STAGE_META: Record<DealStage, { label: string; tone: string }> = {
  sourcing:    { label: 'Sourcing',     tone: 'bg-muted text-muted-foreground border-border' },
  loi:         { label: 'LOI',          tone: 'bg-accent/15 text-accent-foreground border-accent/30' },
  dd:          { label: 'Due Diligence',tone: 'bg-primary/15 text-primary border-primary/30' },
  negotiation: { label: 'Negociación',  tone: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  closing:     { label: 'Closing',      tone: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  closed:      { label: 'Cerrado',      tone: 'bg-green-500/15 text-green-300 border-green-500/30' },
  lost:        { label: 'Perdido',      tone: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export interface Deal {
  id: string;
  name: string;
  target: string;          // company being acquired
  vertical: string;
  country: string;
  stage: DealStage;
  thesis: string;
  inputs: DealInputs;
  ddStatus: Record<string, 'pending' | 'review' | 'complete' | 'redflag'>;
  createdAt: string;
}

export const DEMO_DEALS: Deal[] = [
  {
    id: 'd1',
    name: 'Project Halo',
    target: 'Halo Performance Marketing',
    vertical: 'Media & Performance',
    country: 'México',
    stage: 'dd',
    thesis: 'Bolt-on a Pulse Media Group para sumar capacidad de programmatic y data-stack propietario. Sinergia esperada en COGS (~12%) y cross-sell con clientes de Apex.',
    inputs: {
      ...emptyInputs(),
      ask: 3200000, sales: 6000000, ebitda: 333000, industryMultiple: 7.94,
      pctEquityAcquired: 1, negotiatedDiscount: 0,
      willSellerFinance: true, pctDealFinanced: 0.8,
      willEarnout: true, earnoutPct: 0.10,
      pctSoldToInvestors: 0.20, integratorEquityPct: 0.30,
      assets: DEFAULT_ASSETS.map(a => {
        const overrides: Partial<Record<AssetKey, number>> = {
          cash: 925000, ar: 138750, notesReceivable: 200000, cdMmTb: 50000,
          securities: 120000, rawMaterials: 225000, wip: 138750, inventory: 735000,
          ffe: 430000, vehicles: 120000,
        };
        return { ...a, amount: overrides[a.key] ?? 0,
                 carveout: a.key === 'securities' ? 120000 : 0 };
      }),
      debt: [
        { label: 'Accounts Payable', amount: 140000, sellerPays: 0 },
        { label: 'Note Payable',     amount: 0,      sellerPays: 0 },
        { label: 'Mortgage',         amount: 0,      sellerPays: 0 },
        { label: 'Related Party',    amount: 0,      sellerPays: 0 },
      ],
      ip: [
        { label: 'Patents',          exists: true,  value: 10000 },
        { label: 'Trademarks',       exists: false, value: 0 },
        { label: 'Copyrights',       exists: false, value: 0 },
        { label: 'Trade Secrets',    exists: false, value: 0 },
        { label: 'License from Others', exists: false, value: 0 },
      ],
    },
    ddStatus: {},
    createdAt: '2025-03-12',
  },
  {
    id: 'd2',
    name: 'Project Atlas',
    target: 'Atlas Data Studio',
    vertical: 'Data / Tech / AI',
    country: 'Colombia',
    stage: 'loi',
    thesis: 'Adquisición control 60% para apalancar capacidad de IA generativa across portfolio. Earnout largo + equity swap con NexaTech.',
    inputs: {
      ...emptyInputs(),
      ask: 4800000, sales: 5200000, ebitda: 720000, industryMultiple: 6.5,
      pctEquityAcquired: 0.6, negotiatedDiscount: 200000,
      willSellerFinance: true, pctDealFinanced: 0.5,
      willEarnout: true, earnoutPct: 0.20,
      pctSoldToInvestors: 0.10, integratorEquityPct: 0.25,
    },
    ddStatus: {},
    createdAt: '2025-04-01',
  },
  {
    id: 'd3',
    name: 'Project Vertex',
    target: 'Vertex BTL Group',
    vertical: 'Trade & BTL',
    country: 'Perú',
    stage: 'sourcing',
    thesis: 'Roll-up regional para fortalecer la pata BTL. Múltiplo bajo, alta dependencia del fundador. Aún sin LOI.',
    inputs: {
      ...emptyInputs(),
      ask: 1200000, sales: 2100000, ebitda: 240000, industryMultiple: 4.5,
      integratorEquityPct: 0.40,
    },
    ddStatus: {},
    createdAt: '2025-04-20',
  },
];

// ───────────────────────────── DD checklist ─────────────────────────────
import ddRaw from './dd-checklist.json';

export interface DdItem  { id: string; q: string; priority: boolean }
export interface DdSection { id: string; title: string; items: DdItem[] }
export interface DdCategory { slug: string; name: string; sections: DdSection[] }

export const DD_CATEGORIES = ddRaw as DdCategory[];

export function ddTotals(category?: DdCategory) {
  const cats = category ? [category] : DD_CATEGORIES;
  let total = 0, hp = 0;
  for (const c of cats) for (const s of c.sections) for (const it of s.items) {
    total++; if (it.priority) hp++;
  }
  return { total, hp };
}

export function ddProgress(status: Record<string,string>, category?: DdCategory) {
  const cats = category ? [category] : DD_CATEGORIES;
  let total = 0, complete = 0, review = 0, redflag = 0;
  for (const c of cats) for (const s of c.sections) for (const it of s.items) {
    total++;
    const st = status[it.id];
    if (st === 'complete') complete++;
    else if (st === 'review') review++;
    else if (st === 'redflag') redflag++;
  }
  return { total, complete, review, redflag, pct: total ? Math.round((complete/total)*100) : 0 };
}

export function fmtCurrency(n: number): string {
  if (!isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs/1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs/1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtPct(n: number, digits = 1): string {
  return `${(n*100).toFixed(digits)}%`;
}
