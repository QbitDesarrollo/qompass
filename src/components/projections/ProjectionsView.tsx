import { useMemo, useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Legend } from 'recharts';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Target, Calendar, RefreshCw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Agency, formatCurrency, formatPercent, NIVEL_LABELS } from '@/lib/quantum-engine';
import {
  Assumptions, Horizon, Scenario, SCENARIO_TUNING,
  applyScenario, forecast, formatYM,
  deriveAssumptionsFromHistory, deriveGroupAssumptions,
  baselineFromHistory, groupBaseline, getStartFromHistory,
  getAgencyHistory, getTransitionPlan, TransitionPlan,
} from '@/lib/projections/projections-engine';
import { ANCHOR_YEAR, ANCHOR_MONTH } from '@/lib/historical-data';

interface Props {
  /** Si se pasa una agencia, vista por agencia. Si no, vista del grupo. */
  agency?: Agency;
}

const HORIZONS: Horizon[] = [12, 24, 36];
const SCENARIOS: Scenario[] = ['base', 'bull', 'bear'];

export default function ProjectionsView({ agency }: Props) {
  const isGroup = !agency;

  // Baseline + supuestos derivados del histórico
  const initialAssumptions = useMemo<Assumptions>(() => {
    if (isGroup) return deriveGroupAssumptions();
    const h = getAgencyHistory(agency!.id);
    if (!h) return { revenueGrowth: 0.01, agiMargin: 0.55, ebitdaMargin: 0.15, ocfConversion: 0.85, debtServiceGrowth: 0 };
    return deriveAssumptionsFromHistory(h);
  }, [isGroup, agency]);

  const baseline = useMemo(() => {
    if (isGroup) return groupBaseline();
    const h = getAgencyHistory(agency!.id);
    if (!h) return { revenue: 0, agi: 0, ebitda: 0, ocf: 0, debtService: 0 };
    return baselineFromHistory(h);
  }, [isGroup, agency]);

  const start = useMemo(() => {
    if (isGroup) return { startYear: ANCHOR_YEAR, startMonth: ANCHOR_MONTH };
    const h = getAgencyHistory(agency!.id);
    return h ? getStartFromHistory(h) : { startYear: ANCHOR_YEAR, startMonth: ANCHOR_MONTH };
  }, [isGroup, agency]);

  const [horizon, setHorizon] = useState<Horizon>(24);
  const [scenario, setScenario] = useState<Scenario>('base');
  const [assumptions, setAssumptions] = useState<Assumptions>(initialAssumptions);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  // Sync cuando cambia la agencia
  useEffect(() => {
    setAssumptions(initialAssumptions);
    setAiRationale(null);
  }, [initialAssumptions]);

  const scenarioAssumptions = useMemo(() => applyScenario(assumptions, scenario), [assumptions, scenario]);

  const result = useMemo(() => forecast({
    baseline, startYear: start.startYear, startMonth: start.startMonth,
    horizon, assumptions: scenarioAssumptions, scenario,
  }), [baseline, start, horizon, scenarioAssumptions, scenario]);

  // Calcular los 3 escenarios para overlay
  const allScenarios = useMemo(() => SCENARIOS.map(s => forecast({
    baseline, startYear: start.startYear, startMonth: start.startMonth,
    horizon, assumptions: applyScenario(assumptions, s), scenario: s,
  })), [baseline, start, horizon, assumptions]);

  const chartData = useMemo(() => result.points.map((p, i) => ({
    label: formatYM(p.ym),
    base: allScenarios[0].points[i].revenue,
    bull: allScenarios[1].points[i].revenue,
    bear: allScenarios[2].points[i].revenue,
  })), [result.points, allScenarios]);

  const ebitdaCashData = useMemo(() => result.points.map(p => ({
    label: formatYM(p.ym),
    ebitda: p.ebitda,
    ocf: p.ocf,
    cash: p.cumulativeCash,
  })), [result.points]);

  const handleAiSuggest = async () => {
    setAiBusy(true);
    setAiRationale(null);
    try {
      const trailing12 = {
        revenue: baseline.revenue * 12,
        agi: baseline.agi * 12,
        ebitda: baseline.ebitda * 12,
        ocf: baseline.ocf * 12,
        debtService: baseline.debtService * 12,
      };
      const { data, error } = await supabase.functions.invoke('forecast-suggest', {
        body: {
          agencyName: agency?.name || 'Quantum Group (consolidado)',
          vertical: agency?.vertical || 'Mixed',
          nivel: agency?.nivel,
          country: agency?.country || 'LATAM',
          trailing12,
          current: assumptions,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAssumptions({
        revenueGrowth: clamp(data.revenueGrowth, -0.05, 0.06),
        agiMargin: clamp(data.agiMargin, 0.15, 0.9),
        ebitdaMargin: clamp(data.ebitdaMargin, 0.02, 0.5),
        ocfConversion: clamp(data.ocfConversion, 0.3, 1.4),
        debtServiceGrowth: clamp(data.debtServiceGrowth, -0.02, 0.03),
      });
      setAiRationale(data.rationale || null);
      toast.success('Supuestos sugeridos por AI aplicados');
    } catch (e: any) {
      toast.error(e?.message || 'Error sugiriendo supuestos');
    } finally {
      setAiBusy(false);
    }
  };

  const handleReset = () => {
    setAssumptions(initialAssumptions);
    setAiRationale(null);
    toast('Supuestos restaurados desde histórico');
  };

  const transitionPlan = !isGroup ? getTransitionPlan(agency!) : null;

  return (
    <div className="space-y-6">
      {/* Header del bloque */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Proyecciones {isGroup ? 'del Grupo' : agency!.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Forecast a {horizon} meses · Escenario {SCENARIO_TUNING[scenario].label} · Baseline: {formatCurrency(baseline.revenue * 12)} revenue anualizado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleAiSuggest} disabled={aiBusy} size="sm" variant="outline" className="gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${aiBusy ? 'animate-pulse' : ''}`} />
            {aiBusy ? 'Pensando…' : 'Sugerir con AI'}
          </Button>
          <Button onClick={handleReset} size="sm" variant="ghost" className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      </div>

      {aiRationale && (
        <div className="glass-card p-3 border-accent/30 bg-accent/5">
          <p className="text-[11px] text-accent inline-flex items-center gap-1.5 font-semibold mb-1">
            <Sparkles className="w-3 h-3" /> AI rationale
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed">{aiRationale}</p>
        </div>
      )}

      {/* Controles: horizonte + escenario */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
          {HORIZONS.map(h => (
            <button key={h} onClick={() => setHorizon(h)}
              className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors ${horizon === h ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {h}m
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
          {SCENARIOS.map(s => (
            <button key={s} onClick={() => setScenario(s)}
              className={`px-3 py-1 text-xs uppercase tracking-wider rounded-sm transition-colors ${
                scenario === s
                  ? s === 'bull' ? 'bg-accent text-accent-foreground'
                  : s === 'bear' ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'}`}>
              {SCENARIO_TUNING[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label={`Revenue total ${horizon}m`} value={formatCurrency(result.summary.totalRevenue)} hint={`CAGR ${result.summary.cagr.toFixed(1)}% anual`} />
        <SummaryCard label={`EBITDA total ${horizon}m`} value={formatCurrency(result.summary.totalEbitda)} hint={`Margen ${formatPercent(result.summary.ebitdaMargin)}`} tone="primary" />
        <SummaryCard label="AGI proyectado" value={formatCurrency(result.summary.totalAGI)} hint={`${formatPercent(result.assumptions.agiMargin * 100)} de Revenue`} />
        <SummaryCard label={`Caja acumulada (OCF − DS)`} value={formatCurrency(result.summary.endingCash)} hint={result.summary.endingCash >= 0 ? 'Generación neta positiva' : 'Quema neta de caja'} tone={result.summary.endingCash >= 0 ? 'accent' : 'destructive'} />
      </div>

      {/* Sliders de supuestos */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Supuestos del modelo</h3>
          <span className="text-[10px] text-muted-foreground font-mono">Base · ajusta y se aplican los multiplicadores del escenario</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AssumptionSlider label="Revenue growth (mensual)" value={assumptions.revenueGrowth} min={-0.05} max={0.06} step={0.001} format={v => `${(v * 100).toFixed(2)}%`}
            onChange={v => setAssumptions(a => ({ ...a, revenueGrowth: v }))} />
          <AssumptionSlider label="AGI margin" value={assumptions.agiMargin} min={0.15} max={0.9} step={0.01} format={v => `${(v * 100).toFixed(0)}%`}
            onChange={v => setAssumptions(a => ({ ...a, agiMargin: v }))} />
          <AssumptionSlider label="EBITDA margin" value={assumptions.ebitdaMargin} min={0.02} max={0.5} step={0.005} format={v => `${(v * 100).toFixed(1)}%`}
            onChange={v => setAssumptions(a => ({ ...a, ebitdaMargin: v }))} />
          <AssumptionSlider label="OCF / EBITDA" value={assumptions.ocfConversion} min={0.3} max={1.4} step={0.01} format={v => `${(v * 100).toFixed(0)}%`}
            onChange={v => setAssumptions(a => ({ ...a, ocfConversion: v }))} />
          <AssumptionSlider label="Debt service growth (mensual)" value={assumptions.debtServiceGrowth} min={-0.02} max={0.03} step={0.001} format={v => `${(v * 100).toFixed(2)}%`}
            onChange={v => setAssumptions(a => ({ ...a, debtServiceGrowth: v }))} />
        </div>
      </div>

      {/* Charts: tabs */}
      <Tabs defaultValue="scenarios" className="w-full">
        <TabsList>
          <TabsTrigger value="scenarios">Escenarios (Revenue)</TabsTrigger>
          <TabsTrigger value="cascade">EBITDA · OCF · Caja</TabsTrigger>
          {transitionPlan && <TabsTrigger value="roadmap">Roadmap N{transitionPlan.from}→N{transitionPlan.to}</TabsTrigger>}
        </TabsList>

        <TabsContent value="scenarios" className="mt-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue proyectado por escenario</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number, name: string) => [formatCurrency(v), name.toUpperCase()]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="bear" name="Bear" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="base" name="Base" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="bull" name="Bull" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Base · Bull (×1.6 growth, +15% margen) · Bear (×0.4 growth, −15% margen)</p>
          </div>
        </TabsContent>

        <TabsContent value="cascade" className="mt-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">EBITDA · OCF · Caja acumulada — Escenario {SCENARIO_TUNING[scenario].label}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ebitdaCashData}>
                  <defs>
                    <linearGradient id="cash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="cash" name="Caja acumulada" stroke="hsl(var(--primary))" fill="url(#cash)" strokeWidth={2} />
                  <Line type="monotone" dataKey="ebitda" name="EBITDA mensual" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="ocf" name="OCF mensual" stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} dot={false} strokeDasharray="3 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {transitionPlan && (
          <TabsContent value="roadmap" className="mt-4">
            <RoadmapPanel plan={transitionPlan} agency={agency!} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  if (typeof v !== 'number' || !isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function SummaryCard({ label, value, hint, tone = 'default' }: { label: string; value: string; hint: string; tone?: 'default' | 'primary' | 'accent' | 'destructive' }) {
  const valueCls = tone === 'primary' ? 'text-primary' : tone === 'accent' ? 'text-accent' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  const borderCls = tone === 'primary' ? 'border-primary/30' : tone === 'accent' ? 'border-accent/30' : tone === 'destructive' ? 'border-destructive/30' : '';
  return (
    <div className={`glass-card p-4 ${borderCls}`}>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className={`text-xl font-bold font-mono mt-1 ${valueCls}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function AssumptionSlider({ label, value, min, max, step, format, onChange, unit = 'pct' }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void; unit?: 'pct' | 'raw' }) {
  // Para supuestos en decimal (0.15 = 15%) mostramos el input como porcentaje editable.
  const toDisplay = (v: number) => unit === 'pct' ? +(v * 100).toFixed(3) : +v.toFixed(4);
  const fromDisplay = (v: number) => unit === 'pct' ? v / 100 : v;
  const [text, setText] = useState<string>(String(toDisplay(value)));

  useEffect(() => { setText(String(toDisplay(value))); }, [value]);

  const commit = (raw: string) => {
    const num = parseFloat(raw.replace(',', '.'));
    if (!isFinite(num)) { setText(String(toDisplay(value))); return; }
    const next = clamp(fromDisplay(num), min, max);
    onChange(next);
    setText(String(toDisplay(next)));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={e => commit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            step={unit === 'pct' ? step * 100 : step}
            className="h-6 w-20 px-1.5 py-0 text-xs font-mono text-right"
          />
          {unit === 'pct' && <span className="text-[10px] text-muted-foreground font-mono">%</span>}
        </div>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      <div className="flex justify-between text-[9px] text-muted-foreground/60 font-mono">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function RoadmapPanel({ plan, agency }: { plan: TransitionPlan; agency: Agency }) {
  const okGates = plan.gates.filter(g => g.status === 'ok').length;
  return (
    <div className="space-y-4">
      <div className="glass-card p-4 border-primary/30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-foreground inline-flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {plan.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-primary">{plan.readiness.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">readiness · {okGates}/{plan.gates.length} gates</p>
            {plan.etaMonths !== null && (
              <p className="text-[10px] text-accent font-mono mt-0.5">
                <Calendar className="w-3 h-3 inline mr-0.5" />
                ETA ~{plan.etaMonths}m
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gates */}
        <div className="glass-card p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Gates de transición</h4>
          {plan.gates.map(g => {
            const Icon = g.status === 'ok' ? CheckCircle2 : g.status === 'critical' ? AlertTriangle : AlertTriangle;
            const tone = g.status === 'ok' ? 'text-primary' : g.status === 'critical' ? 'text-destructive' : 'text-accent';
            const fmt = (v: number) => g.unit === 'pct' ? `${v.toFixed(0)}%` : g.unit === 'usd' ? `$${v.toFixed(1)}M` : v.toFixed(2);
            return (
              <div key={g.code} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30">
                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${tone}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{g.label}</span>
                    <span className={`text-[10px] font-mono ${tone}`}>{fmt(g.current)} / {fmt(g.target)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{g.hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestones */}
        <div className="glass-card p-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Hitos del plan</h4>
          <ol className="space-y-3">
            {plan.milestones.map((m, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-primary font-bold">M{m.month}</span>
                  </div>
                  {i < plan.milestones.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-xs text-foreground font-medium leading-tight">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Owner: {m.owner}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="glass-card p-3 border-border bg-secondary/20">
        <p className="text-[11px] text-muted-foreground">
          Estado actual: <span className="text-foreground font-mono">{NIVEL_LABELS[agency.nivel]}</span> ·
          Vertical: <span className="text-foreground">{agency.vertical}</span> ·
          País: <span className="text-foreground">{agency.country}</span> ·
          Equity QG: <span className="text-foreground font-mono">{agency.equity}%</span>
        </p>
      </div>
    </div>
  );
}
