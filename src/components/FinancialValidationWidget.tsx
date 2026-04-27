import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Info, Calculator, Banknote, Percent } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  buildFinancialCascade,
  splitDebtService,
  FIN_ASSUMPTIONS,
} from '@/lib/historical-data';

interface Props {
  revenue: number;
  ebitda: number;
  operatingCashflow: number;
  debtService: number;
  formatCurrency: (n: number) => string;
  formatPercent: (n: number) => string;
}

function Row({
  label, value, formula, sign = '', emphasis = false, tone = 'default', tip,
}: {
  label: string;
  value: string;
  formula?: string;
  sign?: '+' | '−' | '=' | '';
  emphasis?: boolean;
  tone?: 'default' | 'primary' | 'accent' | 'destructive' | 'muted';
  tip?: string;
}) {
  const toneCls =
    tone === 'primary' ? 'text-primary' :
    tone === 'accent' ? 'text-accent' :
    tone === 'destructive' ? 'text-destructive' :
    tone === 'muted' ? 'text-muted-foreground' :
    'text-foreground';
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 px-2 rounded ${emphasis ? 'bg-secondary/40 border-l-2 border-primary' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-4 text-center text-xs font-mono ${sign === '−' ? 'text-destructive' : sign === '+' ? 'text-accent' : 'text-muted-foreground'}`}>
          {sign}
        </span>
        <span className={`text-xs ${emphasis ? 'font-semibold' : ''} ${toneCls}`}>{label}</span>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-primary">
                <Info className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
        {formula && (
          <span className="text-[10px] font-mono text-muted-foreground hidden md:inline truncate">{formula}</span>
        )}
      </div>
      <span className={`text-xs font-mono ${emphasis ? 'font-bold text-base' : ''} ${toneCls}`}>{value}</span>
    </div>
  );
}

export default function FinancialValidationWidget({
  revenue, ebitda, operatingCashflow, debtService, formatCurrency, formatPercent,
}: Props) {
  const [open, setOpen] = useState(true);
  const ds = splitDebtService(debtService, ebitda);
  const c = buildFinancialCascade({ revenue, ebitda, operatingCashflow, debtService });

  // El check de reconciliación EBITDA por construcción debe ser ~0.
  // Reservamos la "alerta roja" para cuando el OCF observado es absurdo
  // frente al teórico (>40% de desviación), que es la señal real de
  // que las cifras de OCF / EBITDA no son coherentes.
  const ocfDeviationPct = c.ocfTheoretical > 0
    ? Math.abs(c.ocfDelta) / c.ocfTheoretical * 100
    : 0;
  const ok = ocfDeviationPct < 25;
  const warn = ocfDeviationPct >= 25 && ocfDeviationPct < 40;
  const bad = ocfDeviationPct >= 40;

  return (
    <div className="glass-card p-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${bad ? 'bg-destructive/10' : warn ? 'bg-yellow-500/10' : 'bg-primary/10'}`}>
            <Calculator className={`w-4 h-4 ${bad ? 'text-destructive' : warn ? 'text-yellow-400' : 'text-primary'}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Validación Financiera — Cascada P&L y Debt Service
              {ok && <CheckCircle2 className="w-4 h-4 text-primary" />}
              {(warn || bad) && <AlertTriangle className={`w-4 h-4 ${bad ? 'text-destructive' : 'text-yellow-400'}`} />}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Verifica la coherencia entre EBITDA, intereses, impuestos, Net Income y Operating Cashflow.
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Columna 1: Desglose Debt Service */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-3.5 h-3.5 text-accent" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Debt Service — Capital + Intereses
              </h4>
            </div>
            <div className="space-y-1">
              <Row
                label="Pago de Intereses"
                value={formatCurrency(ds.interest)}
                sign="+"
                tone="destructive"
                tip={`Componente financiero del Debt Service. Se restará en la cascada para calcular EBT (Earnings Before Taxes). Tasa implícita asumida: ${(FIN_ASSUMPTIONS.interestRate * 100).toFixed(1)}%.`}
              />
              <Row
                label="Pago de Principal (Capital)"
                value={formatCurrency(ds.principal)}
                sign="+"
                tone="muted"
                tip="Amortización del capital de la deuda. NO afecta EBITDA ni Net Income (es movimiento de balance), pero sí consume caja y por eso entra en DSCR."
              />
              <div className="border-t border-border/40 my-1" />
              <Row
                label="Total Debt Service"
                value={formatCurrency(ds.total)}
                sign="="
                emphasis
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-md bg-secondary/30 p-2 text-center">
                <div className="text-[9px] text-muted-foreground uppercase">% Intereses</div>
                <div className="text-sm font-mono text-destructive">{(ds.interestShare * 100).toFixed(1)}%</div>
              </div>
              <div className="rounded-md bg-secondary/30 p-2 text-center">
                <div className="text-[9px] text-muted-foreground uppercase">% Capital</div>
                <div className="text-sm font-mono text-foreground">{(ds.principalShare * 100).toFixed(1)}%</div>
              </div>
              <div className="rounded-md bg-secondary/30 p-2 text-center">
                <div className="text-[9px] text-muted-foreground uppercase">Deuda implícita</div>
                <div className="text-sm font-mono text-muted-foreground">{formatCurrency(ds.impliedDebt)}</div>
              </div>
            </div>

            {/* Barra visual del split */}
            <div className="mt-2">
              <div className="h-2 w-full rounded-full overflow-hidden bg-secondary flex">
                <div className="h-full bg-destructive/70" style={{ width: `${ds.interestShare * 100}%` }} />
                <div className="h-full bg-foreground/40" style={{ width: `${ds.principalShare * 100}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                <span>Intereses (P&L)</span>
                <span>Capital (Balance)</span>
              </div>
            </div>
          </div>

          {/* Columna 2: Cascada P&L */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cascada P&L — De EBITDA a Net Income
              </h4>
            </div>
            <div className="space-y-1">
              <Row label="EBITDA" value={formatCurrency(c.ebitda)} sign="" tone="primary" emphasis
                tip="Earnings Before Interest, Taxes, Depreciation & Amortization." />
              <Row label="D&A (Depreciación + Amort.)" value={formatCurrency(c.da)} sign="−" tone="muted"
                formula={`${(FIN_ASSUMPTIONS.daRate * 100).toFixed(1)}% Revenue`}
                tip="Asumido como proxy del CAPEX recurrente. Se resta para llegar a EBIT." />
              <Row label="EBIT (Operating Income)" value={formatCurrency(c.ebit)} sign="=" />
              <Row label="Intereses" value={formatCurrency(c.interest)} sign="−" tone="destructive"
                tip="Componente de intereses extraído del Debt Service (no el DS completo)." />
              <Row label="EBT (Earnings Before Taxes)" value={formatCurrency(c.ebt)} sign="=" />
              <Row label="Impuestos" value={formatCurrency(c.taxes)} sign="−" tone="muted"
                formula={`${(FIN_ASSUMPTIONS.taxRate * 100).toFixed(0)}% × EBT`} />
              <div className="border-t border-border/40 my-1" />
              <Row label="Net Income" value={formatCurrency(c.netIncome)} sign="=" tone="accent" emphasis
                tip="Profit Neto después de intereses e impuestos. NO es lo mismo que Operating Cashflow." />
            </div>
          </div>

          {/* Reconciliación cruzada — ancho completo */}
          <div className="lg:col-span-2 mt-2 rounded-lg border border-border/50 bg-secondary/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Reconciliación cruzada
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Check 1 */}
              <div>
                <p className="text-[11px] text-foreground mb-1 font-medium">
                  ① EBITDA vs (Net Income + Impuestos + Intereses + D&A)
                </p>
                <div className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                  <div>{formatCurrency(c.netIncome)} <span className="text-accent">+</span> {formatCurrency(c.taxes)}</div>
                  <div>+ {formatCurrency(c.interest)} <span className="text-accent">+</span> {formatCurrency(c.da)}</div>
                  <div className="text-foreground mt-0.5">= {formatCurrency(c.ebitdaCheck)}</div>
                  <div className={`mt-1 ${Math.abs(c.ebitdaCheckDelta) < 1 ? 'text-primary' : 'text-yellow-400'}`}>
                    Δ vs EBITDA: {formatCurrency(c.ebitdaCheckDelta)} {Math.abs(c.ebitdaCheckDelta) < 1 && '✓'}
                  </div>
                </div>
              </div>
              {/* Check 2 */}
              <div>
                <p className="text-[11px] text-foreground mb-1 font-medium">
                  ② Operating Cashflow observado vs teórico
                </p>
                <div className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                  <div>OCF teórico = EBITDA − Impuestos = {formatCurrency(c.ocfTheoretical)}</div>
                  <div>OCF observado = {formatCurrency(c.ocfObserved)}</div>
                  <div className={`mt-1 ${ok ? 'text-primary' : warn ? 'text-yellow-400' : 'text-destructive'}`}>
                    Δ Working Capital implícito: {formatCurrency(c.ocfDelta)} ({ocfDeviationPct.toFixed(1)}%)
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {ok && '✓ Coherente — diferencia explicable por Δ WC.'}
                    {warn && '⚠ Desviación moderada — revisar working capital.'}
                    {bad && '✗ Desviación alta — OCF y EBITDA no son coherentes.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Aclaración importante:</span>{' '}
                Operating Cashflow <span className="font-mono">≠</span> Net Income.{' '}
                OCF parte de EBITDA y resta impuestos efectivos y variaciones de Working Capital,
                <span className="font-mono"> NO</span> resta intereses ni principal de deuda.
                Por eso siempre se cumple <span className="font-mono">OCF ≤ EBITDA</span> y{' '}
                <span className="font-mono">OCF &gt; Net Income</span> en operaciones normales.
                El Debt Service se cubre con OCF (de ahí el DSCR), no con EBITDA directamente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}