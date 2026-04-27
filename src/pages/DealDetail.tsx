import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Calculator, ShieldCheck, FileText, AlertTriangle, CheckCircle2,
  Circle, Eye, Flame, Star, Search, Filter, TrendingUp, TrendingDown, Banknote,
  HandCoins, Building2, PiggyBank, Coins, FileBarChart2, Mail,
} from 'lucide-react';
import { useDeals } from '@/lib/deals/deals-store';
import DealCommunications from '@/components/deals/DealCommunications';
import {
  computeDeal, fmtCurrency, fmtPct, STAGE_META, DealStage, DealInputs,
  AssetLine, DD_CATEGORIES, ddProgress, ddTotals,
} from '@/lib/deals/deals-data';

type DdStatus = 'pending'|'review'|'complete'|'redflag';

const STATUS_META: Record<DdStatus, { label: string; icon: any; cls: string }> = {
  pending:  { label: 'Pendiente',  icon: Circle,        cls: 'text-muted-foreground' },
  review:   { label: 'En revisión',icon: Eye,           cls: 'text-yellow-300' },
  complete: { label: 'Completo',   icon: CheckCircle2,  cls: 'text-green-400' },
  redflag:  { label: 'Red flag',   icon: AlertTriangle, cls: 'text-destructive' },
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDeal, updateDeal, setDdStatus, setTemplate } = useDeals();
  const deal = id ? getDeal(id) : undefined;

  if (!deal) {
    return (
      <AppLayout>
        <div className="p-8 max-w-3xl mx-auto">
          <p className="text-muted-foreground">Deal no encontrado.</p>
          <Link to="/deals" className="text-primary text-sm mt-4 inline-block">← Volver a Deals</Link>
        </div>
      </AppLayout>
    );
  }

  const out = useMemo(() => computeDeal(deal.inputs), [deal.inputs]);
  const dd = useMemo(() => ddProgress(deal.ddStatus), [deal.ddStatus]);
  const stage = STAGE_META[deal.stage];

  const patchInputs = (patch: Partial<DealInputs>) =>
    updateDeal(deal.id, { inputs: { ...deal.inputs, ...patch } });

  return (
    <AppLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => navigate('/deals')}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-3 h-3" /> Deals
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{deal.name}</div>
              <h1 className="text-3xl font-bold tracking-tight">{deal.target}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{deal.vertical}</span><span>•</span>
                <span>{deal.country}</span><span>•</span>
                <span>Creado {deal.createdAt}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={deal.stage} onValueChange={(v) => updateDeal(deal.id, { stage: v as DealStage })}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STAGE_META) as DealStage[]).map(s => (
                    <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className={stage.tone}>{stage.label}</Badge>
            </div>
          </div>
        </div>

        {/* Top KPI strip */}
        <div className="grid grid-cols-5 gap-3">
          <KPI icon={Banknote}    label="Ask"               value={fmtCurrency(deal.inputs.ask)} />
          <KPI icon={FileBarChart2} label="EBITDA"          value={fmtCurrency(deal.inputs.ebitda)} />
          <KPI icon={TrendingUp}  label="Múltiplo implícito" value={`${out.multipleImplied.toFixed(1)}x`}
               sub={`vs industria ${deal.inputs.industryMultiple.toFixed(1)}x`}
               tone={out.multipleDelta > 1 ? 'warn' : out.multipleDelta < -0.5 ? 'good' : 'neutral'} />
          <KPI icon={HandCoins}   label="Cash needed (closing)" value={fmtCurrency(out.preClosingCashNeed)}
               tone={out.preClosingCashNeed < deal.inputs.ask * 0.4 ? 'good' : 'warn'} />
          <KPI icon={ShieldCheck} label="Due Diligence"     value={`${dd.pct}%`}
               sub={`${dd.complete}/${dd.total}${dd.redflag > 0 ? ` · ${dd.redflag} red flag` : ''}`}
               tone={dd.redflag > 0 ? 'bad' : dd.pct >= 70 ? 'good' : 'neutral'} />
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2"><FileText className="w-4 h-4" /> Overview</TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2"><Calculator className="w-4 h-4" /> Deal Analysis</TabsTrigger>
            <TabsTrigger value="dd"       className="gap-2"><ShieldCheck className="w-4 h-4" /> Due Diligence</TabsTrigger>
            <TabsTrigger value="comms"    className="gap-2"><Mail className="w-4 h-4" /> Comunicación</TabsTrigger>
          </TabsList>

          {/* ─── Overview ─── */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-card border border-border rounded-xl p-6">
                <h3 className="text-sm font-semibold mb-3">Tesis de inversión</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{deal.thesis || '—'}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-semibold mb-2">Snapshot financiero</h3>
                <Row label="Revenue"          value={fmtCurrency(deal.inputs.sales)} />
                <Row label="EBITDA"           value={fmtCurrency(deal.inputs.ebitda)} />
                <Row label="Margen EBITDA"    value={deal.inputs.sales ? fmtPct(deal.inputs.ebitda / deal.inputs.sales) : '—'} />
                <Row label="Industry FMV"     value={fmtCurrency(out.industryFmv)} />
                <Row label="Net Purchase Price" value={fmtCurrency(out.netPurchasePrice)} bold />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FundingCard icon={Coins}      label="Asset funding"     value={out.totalAssetFunding} of={out.netPurchasePrice} />
              <FundingCard icon={PiggyBank}  label="Seller financing"  value={out.sellerFinancing}    of={out.netPurchasePrice} />
              <FundingCard icon={Building2}  label="Investor capital"  value={out.cashFromInvestors}  of={out.netPurchasePrice} />
            </div>
          </TabsContent>

          {/* ─── Deal Analysis ─── */}
          <TabsContent value="analysis" className="mt-6">
            <DealAnalysis deal={deal} out={out} patchInputs={patchInputs} />
          </TabsContent>

          {/* ─── Due Diligence ─── */}
          <TabsContent value="dd" className="mt-6">
            <DueDiligence deal={deal} setStatus={(itemId, st) => setDdStatus(deal.id, itemId, st)} />
          </TabsContent>

          {/* ─── Comunicación ─── */}
          <TabsContent value="comms" className="mt-6">
            <DealCommunications
              deal={deal}
              onSave={(stage, tpl) => setTemplate(deal.id, stage, tpl)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

// ───────────────────────── Overview helpers ─────────────────────────
function KPI({ icon: Icon, label, value, sub, tone='neutral' }:
  { icon: any; label: string; value: string; sub?: string; tone?: 'good'|'warn'|'bad'|'neutral' }) {
  const tcls = tone === 'warn' ? 'text-yellow-300' : tone === 'good' ? 'text-green-400'
              : tone === 'bad' ? 'text-destructive' : '';
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`text-xl font-bold ${tcls}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}

function FundingCard({ icon: Icon, label, value, of }: { icon: any; label: string; value: number; of: number }) {
  const pct = of > 0 ? Math.min(100, Math.round((value / of) * 100)) : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-2xl font-bold">{fmtCurrency(value)}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{pct}% del precio neto</div>
      <Progress value={pct} className="h-1.5 mt-3" />
    </div>
  );
}

// ───────────────────────── Deal Analysis ─────────────────────────
function DealAnalysis({ deal, out, patchInputs }:
  { deal: any; out: ReturnType<typeof computeDeal>; patchInputs: (p: Partial<DealInputs>) => void }) {
  const i: DealInputs = deal.inputs;

  const updAsset = (key: string, patch: Partial<AssetLine>) => {
    patchInputs({ assets: i.assets.map(a => a.key === key ? { ...a, ...patch } : a) });
  };
  const updDebt = (idx: number, patch: any) => {
    patchInputs({ debt: i.debt.map((d, k) => k === idx ? { ...d, ...patch } : d) });
  };
  const updIp = (idx: number, patch: any) => {
    patchInputs({ ip: i.ip.map((d, k) => k === idx ? { ...d, ...patch } : d) });
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LEFT — Inputs */}
      <div className="col-span-7 space-y-6">
        {/* Negotiation */}
        <Section title="Negociación & Valoración" subtitle="Pre-LOI">
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Ask"               value={i.ask}              onChange={v => patchInputs({ ask: v })} />
            <NumField label="Revenue"           value={i.sales}            onChange={v => patchInputs({ sales: v })} />
            <NumField label="EBITDA / SDE"      value={i.ebitda}           onChange={v => patchInputs({ ebitda: v })} />
            <NumField label="Industry Multiple" value={i.industryMultiple} step={0.1} onChange={v => patchInputs({ industryMultiple: v })} />
            <NumField label="Negotiated Discount" value={i.negotiatedDiscount} onChange={v => patchInputs({ negotiatedDiscount: v })} />
            <PctField label="% Equity Acquired" value={i.pctEquityAcquired} onChange={v => patchInputs({ pctEquityAcquired: v })} />
          </div>

          <div className="mt-4 p-3 rounded-lg border border-border/60 bg-secondary/40 space-y-1.5 text-sm">
            <Row label="Múltiplo implícito" value={`${out.multipleImplied.toFixed(2)}x`} />
            <Row label="Industry FMV"        value={fmtCurrency(out.industryFmv)} />
            <Row label={out.isAskHigherThanFmv ? '⚠ Ask > FMV — usa FMV' : '✓ Ask ≤ FMV'} value={fmtCurrency(out.lowerOfAskFmv)} />
            <Row label="Net valuation"       value={fmtCurrency(out.netValuation)} />
            <Row label="Net Purchase Price"  value={fmtCurrency(out.netPurchasePrice)} bold />
          </div>
        </Section>

        {/* Financing strategies */}
        <Section title="Estrategias de financiación" subtitle="Cómo se compone el deal stack">
          <div className="space-y-4">
            <ToggleRow
              label="Seller Financing"
              checked={i.willSellerFinance}
              onCheckedChange={v => patchInputs({ willSellerFinance: v })}
            >
              <PctField label="% del deal financiado" value={i.pctDealFinanced}
                onChange={v => patchInputs({ pctDealFinanced: v })} disabled={!i.willSellerFinance} />
            </ToggleRow>

            <ToggleRow
              label="Earnout"
              checked={i.willEarnout}
              onCheckedChange={v => patchInputs({ willEarnout: v })}
            >
              <PctField label="% del precio en earnout" value={i.earnoutPct}
                onChange={v => patchInputs({ earnoutPct: v })} disabled={!i.willEarnout} />
            </ToggleRow>

            <div className="pt-2 border-t border-border/60 space-y-3">
              <PctField label="% vendido a inversionistas (PPM)"   value={i.pctSoldToInvestors}  onChange={v => patchInputs({ pctSoldToInvestors: v })} />
              <PctField label="% Integrator Equity (Quantum Group)" value={i.integratorEquityPct} onChange={v => patchInputs({ integratorEquityPct: v })} />
            </div>
          </div>
        </Section>

        {/* Assets */}
        <Section title="Activos disponibles para fondeo" subtitle="Tabla EPIC: cada activo libera caja para el deal">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 pr-2 font-medium">Activo</th>
                  <th className="text-right px-2 font-medium">Monto</th>
                  <th className="text-right px-2 font-medium">Carveout</th>
                  <th className="text-right px-2 font-medium">Net %</th>
                  <th className="text-right pl-2 font-medium">Funding $</th>
                </tr>
              </thead>
              <tbody>
                {i.assets.map(a => {
                  const funding = (a.amount - a.carveout) * a.netFundingPct;
                  return (
                    <tr key={a.key} className="border-b border-border/40 hover:bg-secondary/30">
                      <td className="py-1.5 pr-2">
                        <div className="font-medium">{a.label}</div>
                        <div className="text-[10px] text-muted-foreground">{a.fundingMethod}</div>
                      </td>
                      <td className="px-2"><NumInput value={a.amount} onChange={v => updAsset(a.key, { amount: v })} /></td>
                      <td className="px-2"><NumInput value={a.carveout} onChange={v => updAsset(a.key, { carveout: v })} /></td>
                      <td className="px-2"><NumInput value={a.netFundingPct} step={0.05} onChange={v => updAsset(a.key, { netFundingPct: v })} /></td>
                      <td className="pl-2 text-right font-medium">{fmtCurrency(funding)}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="px-2 text-right">{fmtCurrency(out.totalAssets)}</td>
                  <td className="px-2 text-right">{fmtCurrency(out.totalCarveouts)}</td>
                  <td></td>
                  <td className="pl-2 text-right text-primary">{fmtCurrency(out.totalAssetFunding)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Debt + IP side by side */}
        <div className="grid grid-cols-2 gap-6">
          <Section title="Deuda asumida" subtitle="Restará del cash al cierre">
            <div className="space-y-2">
              {i.debt.map((d, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 items-center text-xs">
                  <div className="text-muted-foreground">{d.label}</div>
                  <NumInput value={d.amount}      onChange={v => updDebt(idx, { amount: v })} />
                  <NumInput value={d.sellerPays}  onChange={v => updDebt(idx, { sellerPays: v })} />
                </div>
              ))}
              <div className="text-xs text-right font-semibold pt-2 border-t border-border/60">
                A pagar: {fmtCurrency(out.totalDebtToReduce)}
              </div>
            </div>
          </Section>

          <Section title="Propiedad intelectual defensible" subtitle="Genera funding adicional">
            <div className="space-y-2">
              {i.ip.map((x, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs">
                  <div className="text-muted-foreground">{x.label}</div>
                  <Switch checked={x.exists} onCheckedChange={v => updIp(idx, { exists: v })} />
                  <NumInput value={x.value} onChange={v => updIp(idx, { value: v })} disabled={!x.exists} />
                </div>
              ))}
              <div className="text-xs text-right font-semibold pt-2 border-t border-border/60">
                IP funding: {fmtCurrency(out.ipFunding)}
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* RIGHT — Deal stack */}
      <aside className="col-span-5 space-y-4">
        <div className="sticky top-6 space-y-4">
          <Section title="Pre-Closing Deal Stack" subtitle="Cómo se descompone el precio">
            <StackBar label="Net Purchase Price"     value={out.netPurchasePrice} sign="+" tone="primary" />
            <StackBar label="(−) Integrator Equity"  value={out.integratorPurchase} sign="-" />
            <StackBar label="(−) Investor Capital"   value={out.cashFromInvestors} sign="-" />
            <StackBar label="(−) Seller Financing"   value={out.sellerFinancing} sign="-" />
            <StackBar label="(−) Earnout"            value={out.earnoutAmount} sign="-" />
            <StackBar label="(−) Debt Assumed"       value={out.totalDebtToReduce} sign="-" />
            <StackBar label="(−) Carveouts"          value={out.totalCarveouts} sign="-" />
            <Divider />
            <StackBar label="Cash Needed (Pre-Closing)" value={out.preClosingCashNeed} sign="=" tone="warn" />
          </Section>

          <Section title="Post-Closing Stack" subtitle="Después de monetizar activos">
            <StackBar label="Pre-closing cash need"  value={out.preClosingCashNeed} sign="+" />
            <StackBar label="(−) Asset Funding"      value={out.totalAssetFunding} sign="-" />
            <StackBar label="(−) IP-Based Funding"   value={out.ipFunding} sign="-" />
            <Divider />
            <StackBar
              label="Net Cash Out-of-Pocket"
              value={out.postClosingNetCash}
              sign="="
              tone={out.postClosingNetCash <= 0 ? 'good' : 'warn'}
            />
          </Section>

          <div className="bg-card border border-border rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-medium">
              <Star className="w-3.5 h-3.5 text-primary" /> Recomendación EPIC
            </div>
            <Recommendation out={out} i={i} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Recommendation({ out, i }: { out: ReturnType<typeof computeDeal>; i: DealInputs }) {
  const items: { ok: boolean; text: string }[] = [];
  if (out.isAskHigherThanFmv) items.push({ ok: false, text: `Ask supera FMV en ${fmtCurrency(i.ask - out.industryFmv)} — negociar a FMV.` });
  else items.push({ ok: true, text: 'Ask alineado o por debajo del FMV de industria.' });

  if (i.willSellerFinance && i.pctDealFinanced >= 0.5) items.push({ ok: true, text: `Seller financing al ${fmtPct(i.pctDealFinanced,0)} reduce capital propio.` });
  else items.push({ ok: false, text: 'Empujar seller financing ≥50% para reducir cash al cierre.' });

  if (out.totalAssetFunding > out.netPurchasePrice * 0.2) items.push({ ok: true, text: `Activos fondean ${fmtPct(out.totalAssetFunding / Math.max(1, out.netPurchasePrice), 0)} del precio.` });
  else items.push({ ok: false, text: 'Explorar SLB / factoring para liberar más caja de activos.' });

  if (out.postClosingNetCash <= 0) items.push({ ok: true, text: 'Deal puede cerrarse sin cash neto out-of-pocket.' });

  return (
    <ul className="space-y-1.5">
      {items.map((it, k) => (
        <li key={k} className="flex items-start gap-2 text-muted-foreground">
          {it.ok
            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            : <Flame className="w-3.5 h-3.5 text-yellow-300 mt-0.5 flex-shrink-0" />}
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input type="number" step={step ?? 1} value={value}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="h-9 mt-1" />
    </div>
  );
}

function PctField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-xs font-semibold tabular-nums">{fmtPct(value, 0)}</span>
      </div>
      <Slider value={[value * 100]} min={0} max={100} step={5}
        onValueChange={v => onChange((v[0] || 0) / 100)} disabled={disabled} />
    </div>
  );
}

function NumInput({ value, onChange, step, disabled }: { value: number; onChange: (v: number) => void; step?: number; disabled?: boolean }) {
  return (
    <Input type="number" step={step ?? 1} value={value} disabled={disabled}
      onChange={e => onChange(Number(e.target.value) || 0)}
      className="h-7 text-xs px-2 text-right" />
  );
}

function ToggleRow({ label, checked, onCheckedChange, children }:
  { label: string; checked: boolean; onCheckedChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );
}

function StackBar({ label, value, sign, tone }: { label: string; value: number; sign: '+'|'-'|'='; tone?: 'primary'|'warn'|'good' }) {
  const tcls = tone === 'primary' ? 'text-primary'
             : tone === 'warn'    ? 'text-yellow-300'
             : tone === 'good'    ? 'text-green-400' : '';
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold tabular-nums ${tcls}`}>{sign === '-' ? '−' : ''}{fmtCurrency(Math.abs(value))}</span>
    </div>
  );
}

function Divider() { return <div className="border-t border-border/60 my-1" />; }

// ───────────────────────── Due Diligence ─────────────────────────
function DueDiligence({ deal, setStatus }: { deal: any; setStatus: (itemId: string, s: DdStatus) => void }) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string>(DD_CATEGORIES[0].slug);
  const [onlyHp, setOnlyHp] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DdStatus | 'all'>('all');

  const cat = DD_CATEGORIES.find(c => c.slug === activeCat)!;
  const totals = ddTotals();
  const overall = ddProgress(deal.ddStatus);
  const catProgress = ddProgress(deal.ddStatus, cat);

  const matches = (q: string) =>
    !search || q.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="col-span-3 space-y-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Progreso global</div>
          <div className="text-2xl font-bold mb-1">{overall.pct}%</div>
          <Progress value={overall.pct} className="h-1.5" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-[11px] text-muted-foreground">
            <span>Total: <span className="text-foreground font-medium">{totals.total}</span></span>
            <span>High pri: <span className="text-foreground font-medium">{totals.hp}</span></span>
            <span>Completos: <span className="text-green-400 font-medium">{overall.complete}</span></span>
            <span>Red flags: <span className="text-destructive font-medium">{overall.redflag}</span></span>
          </div>
        </div>

        {DD_CATEGORIES.map(c => {
          const p = ddProgress(deal.ddStatus, c);
          const t = ddTotals(c);
          const active = c.slug === activeCat;
          return (
            <button key={c.slug} onClick={() => setActiveCat(c.slug)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                active ? 'bg-primary/10 border-primary/40' : 'bg-card border-border hover:border-border/80'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">{p.complete}/{t.total}</span>
              </div>
              <Progress value={p.pct} className="h-1" />
            </button>
          );
        })}
      </aside>

      {/* Main */}
      <div className="col-span-9 space-y-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold">{cat.name}</h3>
              <p className="text-[11px] text-muted-foreground">
                {catProgress.complete}/{catProgress.total} completos · {catProgress.pct}%
                {catProgress.redflag > 0 && <> · <span className="text-destructive">{catProgress.redflag} red flag{catProgress.redflag>1?'s':''}</span></>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar…" className="h-8 pl-8 w-56 text-xs"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as DdStatus | 'all')}>
                <SelectTrigger className="h-8 w-36 text-xs"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="review">En revisión</SelectItem>
                  <SelectItem value="complete">Completo</SelectItem>
                  <SelectItem value="redflag">Red flag</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={onlyHp ? 'default' : 'outline'} size="sm"
                onClick={() => setOnlyHp(v => !v)} className="h-8 text-xs gap-1">
                <Star className="w-3 h-3" /> Prioridad alta
              </Button>
            </div>
          </div>
          <Progress value={catProgress.pct} className="h-1" />
        </div>

        {cat.sections.map(sec => {
          const items = sec.items.filter(it =>
            matches(it.q) &&
            (!onlyHp || it.priority) &&
            (statusFilter === 'all' || (deal.ddStatus[it.id] || 'pending') === statusFilter)
          );
          if (items.length === 0) return null;
          return (
            <div key={sec.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-secondary/40 border-b border-border flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{sec.id} · {sec.title}</div>
                <span className="text-[11px] text-muted-foreground">{items.length} ítem{items.length>1?'s':''}</span>
              </div>
              <ul>
                {items.map(it => {
                  const st: DdStatus = (deal.ddStatus[it.id] as DdStatus) || 'pending';
                  const meta = STATUS_META[st];
                  const Icon = meta.icon;
                  return (
                    <li key={it.id} className="px-4 py-3 border-b border-border/40 last:border-0 flex items-start gap-3 hover:bg-secondary/30">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${meta.cls}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground">{it.id}</span>
                          {it.priority && <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-primary/10 text-primary border-primary/30">HIGH</Badge>}
                        </div>
                        <p className="text-xs text-foreground mt-0.5 leading-relaxed">{it.q}</p>
                      </div>
                      <Select value={st} onValueChange={v => setStatus(it.id, v as DdStatus)}>
                        <SelectTrigger className="h-7 w-32 text-xs flex-shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(['pending','review','complete','redflag'] as DdStatus[]).map(s => (
                            <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
