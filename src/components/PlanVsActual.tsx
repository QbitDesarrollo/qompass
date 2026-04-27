import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import { getPlanVsActual, attainmentPct, attainmentTone } from '@/lib/projections/plan-vs-actual';
import type { Scenario } from '@/lib/projections/projections-engine';
import { formatCurrency, formatPercent } from '@/lib/quantum-engine';

type Window = 'mtd' | 'ytd';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function toneClass(tone: 'ok' | 'warn' | 'bad'): string {
  if (tone === 'ok') return 'text-primary';
  if (tone === 'warn') return 'text-accent';
  return 'text-destructive';
}
function toneBg(tone: 'ok' | 'warn' | 'bad'): string {
  if (tone === 'ok') return 'bg-primary';
  if (tone === 'warn') return 'bg-accent';
  return 'bg-destructive';
}

function MetricBlock({ label, plan, actual }: { label: string; plan: number; actual: number }) {
  const pct = attainmentPct(actual, plan);
  const tone = attainmentTone(pct);
  const delta = actual - plan;
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="font-mono text-base font-semibold text-foreground">{formatCurrency(actual)}</div>
        <div className={`font-mono text-xs font-semibold ${toneClass(tone)}`}>{formatPercent(pct)}</div>
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground font-mono">
        Plan: {formatCurrency(plan)} · Δ {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-secondary overflow-hidden">
        <div className={`h-full ${toneBg(tone)} transition-all`} style={{ width: `${Math.min(120, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

export default function PlanVsActual() {
  const [windowMode, setWindowMode] = useState<Window>('ytd');
  const [scenario, setScenario] = useState<Scenario>('base');

  const data = useMemo(() => getPlanVsActual(windowMode, scenario), [windowMode, scenario]);

  const periodLabel = windowMode === 'mtd'
    ? `${MONTH_NAMES[data.monthIndex - 1]} ${data.year}`
    : `Ene → ${MONTH_NAMES[data.monthIndex - 1]} ${data.year}`;

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Actual vs Plan</h3>
            <InfoTooltip>
              <div className="font-semibold text-foreground">Cumplimiento contra Proyección</div>
              <div className="text-muted-foreground">
                El "Plan" se construye proyectando desde el cierre del año anterior (Dic) usando los supuestos del año previo y el escenario seleccionado. El "Actual" es la suma real del periodo elegido.
              </div>
              <ul className="list-disc pl-4 text-[10px] text-muted-foreground">
                <li><b>≥ 98%</b> en plan</li>
                <li><b>90–98%</b> ligero rezago</li>
                <li><b>&lt; 90%</b> bajo plan — atención</li>
              </ul>
            </InfoTooltip>
          </div>
          <p className="text-xs text-muted-foreground">
            Grupo · <span className="font-mono">{periodLabel}</span> · Escenario <span className="font-mono uppercase">{scenario}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
            {(['mtd','ytd'] as Window[]).map(w => (
              <button
                key={w}
                onClick={() => setWindowMode(w)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  windowMode === w ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {w === 'mtd' ? 'MTD' : 'YTD'}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
            {(['bear','base','bull'] as Scenario[]).map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors uppercase ${
                  scenario === s ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricBlock label="Revenue" plan={data.group.plan.revenue} actual={data.group.actual.revenue} />
        <MetricBlock label="AGI" plan={data.group.plan.agi} actual={data.group.actual.agi} />
        <MetricBlock label="EBITDA" plan={data.group.plan.ebitda} actual={data.group.actual.ebitda} />
        <MetricBlock label="Op. Cashflow" plan={data.group.plan.ocf} actual={data.group.actual.ocf} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agencia</th>
              <th className="text-center py-2 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nivel</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Revenue Actual</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cumpl. Rev</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">EBITDA Actual</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cumpl. EBITDA</th>
            </tr>
          </thead>
          <tbody>
            {data.byAgency
              .sort((a, b) => b.bucket.actual.revenue - a.bucket.actual.revenue)
              .map(({ agency, bucket }) => {
                const revPct = attainmentPct(bucket.actual.revenue, bucket.plan.revenue);
                const ebPct = attainmentPct(bucket.actual.ebitda, bucket.plan.ebitda);
                const revTone = attainmentTone(revPct);
                const ebTone = attainmentTone(ebPct);
                return (
                  <tr key={agency.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 px-3 text-foreground">{agency.name}</td>
                    <td className="py-2 px-2 text-center text-xs text-muted-foreground font-mono">N{agency.nivel}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-foreground">{formatCurrency(bucket.actual.revenue)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(bucket.plan.revenue)}</td>
                    <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${toneClass(revTone)}`}>{formatPercent(revPct)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-foreground">{formatCurrency(bucket.actual.ebitda)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-muted-foreground">{formatCurrency(bucket.plan.ebitda)}</td>
                    <td className={`py-2 px-3 text-right font-mono text-xs font-semibold ${toneClass(ebTone)}`}>{formatPercent(ebPct)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}