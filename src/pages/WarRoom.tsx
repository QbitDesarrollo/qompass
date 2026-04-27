import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS, Vertical, NivelIntegracion, formatCurrency, getConsolidatedEbitda, Agency, calcDSCR, calcLeverageCapacity, getDSCRStatus } from '@/lib/quantum-engine';
import { DSCRBadge } from '@/components/StatusBadges';
import CapitalPriorityWidget from '@/components/CapitalPriorityWidget';
import { Swords, ArrowRight, TrendingUp, Shield, Zap, DollarSign, Sparkles, Banknote, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Slider } from '@/components/ui/slider';
import PeriodSelector from '@/components/PeriodSelector';
import { Period, currentPeriod, getAllAgencyMetrics, formatPeriod } from '@/lib/historical-data';

export default function WarRoom() {
  const [selectedVertical, setSelectedVertical] = useState<Vertical>('Creative & Strategy');
  const [simulateTransition, setSimulateTransition] = useState<'3→2' | '2→1' | null>(null);
  const [exitMultiple, setExitMultiple] = useState(6);
  const [standaloneMultiple, setStandaloneMultiple] = useState(4);
  const [customEquity, setCustomEquity] = useState<number | null>(null);
  const [targetDSCR, setTargetDSCR] = useState(1.5);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [amortYears, setAmortYears] = useState(6);
  const [annualRate, setAnnualRate] = useState(10); // % anual
  const [period, setPeriod] = useState<Period>(() => currentPeriod('month'));

  // Vista de agencias con métricas financieras del periodo seleccionado.
  // Mantiene atributos estructurales (equity, vertical, nivel, irf) y reemplaza
  // los flujos del periodo (revenue, agi, ebitda, ocf, debtService, margin).
  const periodAgencies = useMemo<Agency[]>(() => {
    const metrics = getAllAgencyMetrics(period);
    return mockAgencies.map(a => {
      const m = metrics[a.id];
      if (!m || !m.available) return a;
      return {
        ...a,
        revenue: m.revenue,
        agi: m.agi,
        ebitda: m.ebitda,
        operatingCashflow: m.operatingCashflow,
        debtService: m.debtService,
        margin: m.margin,
      };
    });
  }, [period]);

  const currentConsolidated = useMemo(() => getConsolidatedEbitda(periodAgencies), [periodAgencies]);

  const simulation = useMemo(() => {
    if (!simulateTransition) return null;

    const verticalAgencies = periodAgencies.filter(a => a.vertical === selectedVertical);
    const targetAgencies = simulateTransition === '3→2'
      ? verticalAgencies.filter(a => a.nivel === 3)
      : verticalAgencies.filter(a => a.nivel === 2);

    if (targetAgencies.length === 0) return null;

    const defaultEquity = simulateTransition === '3→2' ? 20 : 51;
    const newEquity = customEquity ?? defaultEquity;
    const avgCurrentEquity = targetAgencies.reduce((s, a) => s + a.equity, 0) / targetAgencies.length;
    const equityAcquired = Math.max(0, newEquity - avgCurrentEquity);
    const oldContribution = targetAgencies.reduce((s, a) => s + a.ebitda * (a.equity / 100), 0);
    const newContribution = targetAgencies.reduce((s, a) => s + a.ebitda * (newEquity / 100), 0);
    const incrementalEbitda = newContribution - oldContribution;
    const projectedConsolidated = currentConsolidated + incrementalEbitda;

    const currentValuation = currentConsolidated * exitMultiple;
    const projectedValuation = projectedConsolidated * exitMultiple;

    // Acquisition economics
    const acquisitionCost = incrementalEbitda * standaloneMultiple; // pay at standalone multiple
    const valueAtGroupMultiple = incrementalEbitda * exitMultiple;  // worth at group multiple
    const arbitrage = valueAtGroupMultiple - acquisitionCost;       // multiple arbitrage

    const avgIRFBefore = targetAgencies.reduce((s, a) => s + a.irf, 0) / targetAgencies.length;
    const irfReduction = simulateTransition === '2→1' ? avgIRFBefore * 0.4 : avgIRFBefore * 0.2;

    return {
      targetAgencies,
      newEquity,
      defaultEquity,
      avgCurrentEquity,
      equityAcquired,
      oldContribution,
      newContribution,
      incrementalEbitda,
      projectedConsolidated,
      currentValuation,
      projectedValuation,
      valueGain: projectedValuation - currentValuation,
      acquisitionCost,
      valueAtGroupMultiple,
      arbitrage,
      irfReduction,
      avgIRFBefore,
      avgIRFAfter: avgIRFBefore - irfReduction,
    };
  }, [selectedVertical, simulateTransition, exitMultiple, standaloneMultiple, customEquity, currentConsolidated, periodAgencies]);

  const comparisonData = useMemo(() => {
    if (!simulation) return [];
    return [
      { name: 'EBITDA Actual', actual: currentConsolidated, projected: 0 },
      { name: 'EBITDA Proyectado', actual: 0, projected: simulation.projectedConsolidated },
    ];
  }, [simulation, currentConsolidated]);

  const leverage = useMemo(() => {
    const list = periodAgencies.filter(a => a.vertical === selectedVertical);
    const rows = list.map(a => ({
      agency: a,
      ...calcLeverageCapacity(a, targetDSCR, amortYears, annualRate / 100),
    }));
    const totalAdditionalDebt = rows.reduce((s, r) => s + r.additionalDebt, 0);
    const totalAdditionalDebtService = rows.reduce((s, r) => s + r.additionalDebtService, 0);
    const totalOCF = list.reduce((s, a) => s + a.operatingCashflow, 0);
    const totalDS = list.reduce((s, a) => s + a.debtService, 0);
    const verticalDSCR = totalDS > 0 ? totalOCF / totalDS : Infinity;
    return { rows, totalAdditionalDebt, totalAdditionalDebtService, verticalDSCR, totalOCF, totalDS };
  }, [selectedVertical, targetDSCR, amortYears, annualRate, periodAgencies]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <Swords className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">War Room</h1>
              <p className="text-sm text-muted-foreground">
                Simulación de Escenarios de Escalamiento · Periodo: <span className="font-mono text-foreground">{formatPeriod(period)}</span>
              </p>
            </div>
          </div>
          <PeriodSelector period={period} onPeriodChange={setPeriod} />
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vertical</h3>
            <div className="grid grid-cols-1 gap-2">
              {VERTICALS.map(v => {
                const count = periodAgencies.filter(a => a.vertical === v).length;
                return (
                  <button
                    key={v}
                    onClick={() => { setSelectedVertical(v); setSimulateTransition(null); setSelectedAgencyId(null); }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedVertical === v
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                    }`}
                  >
                    <span>{v}</span>
                    <span className="font-mono text-xs">{count} agencias</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Escenario de Escalamiento</h3>
            <div className="space-y-2">
              {(['3→2', '2→1'] as const).map(t => {
                const agencies = periodAgencies.filter(a => a.vertical === selectedVertical && (t === '3→2' ? a.nivel === 3 : a.nivel === 2));
                return (
                  <button
                    key={t}
                    onClick={() => { setSimulateTransition(simulateTransition === t ? null : t); setCustomEquity(null); }}
                    disabled={agencies.length === 0}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all ${
                      simulateTransition === t
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : agencies.length === 0
                        ? 'bg-secondary/30 text-muted-foreground/50 border border-transparent cursor-not-allowed'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>N{t.charAt(0)} → N{t.charAt(2)}</span>
                    </div>
                    <span className="font-mono text-xs">{agencies.length} targets</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Múltiplo del Grupo (Exit)</span>
                <span className="text-sm font-bold font-mono text-accent">{exitMultiple}x</span>
              </div>
              <Slider
                value={[exitMultiple]}
                onValueChange={([v]) => setExitMultiple(v)}
                min={4}
                max={8}
                step={0.5}
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>4x</span><span>8x</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">Múltiplo Standalone (Agencia)</span>
                <span className="text-sm font-bold font-mono text-primary">{standaloneMultiple}x</span>
              </div>
              <Slider
                value={[standaloneMultiple]}
                onValueChange={([v]) => setStandaloneMultiple(v)}
                min={1}
                max={7}
                step={0.25}
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>1x</span><span>7x</span>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Agencias en {selectedVertical}
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 px-3 pb-1 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <span className="col-span-4">Agencia</span>
                <span className="col-span-1 text-center">Niv</span>
                <span className="col-span-2 text-right">Revenue</span>
                <span className="col-span-2 text-right">EBITDA</span>
                <span className="col-span-3 text-right">Op. Cashflow</span>
              </div>
              {periodAgencies.filter(a => a.vertical === selectedVertical).map(a => {
                const isSelected = selectedAgencyId === a.id;
                const isTarget = simulation?.targetAgencies.some(t => t.id === a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAgencyId(isSelected ? null : a.id)}
                    className={`w-full grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-primary/15 ring-1 ring-primary/50'
                        : isTarget
                        ? 'bg-secondary/30 ring-1 ring-accent/50 hover:bg-secondary/50'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <span className={`col-span-4 font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{a.name}</span>
                    <span className="col-span-1 text-center text-muted-foreground">N{a.nivel}</span>
                    <span className="col-span-2 text-right font-mono text-foreground">{formatCurrency(a.revenue)}</span>
                    <span className="col-span-2 text-right font-mono text-primary">{formatCurrency(a.ebitda)}</span>
                    <span className="col-span-3 text-right font-mono text-accent">{formatCurrency(a.operatingCashflow)}</span>
                  </button>
                );
              })}
              {(() => {
                const list = periodAgencies.filter(a => a.vertical === selectedVertical);
                const totalRev = list.reduce((s, a) => s + a.revenue, 0);
                const totalEbitda = list.reduce((s, a) => s + a.ebitda, 0);
                const totalOCF = list.reduce((s, a) => s + a.operatingCashflow, 0);
                return (
                  <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs font-semibold">
                    <span className="col-span-5 text-muted-foreground uppercase tracking-wider text-[10px]">Total ({list.length})</span>
                    <span className="col-span-2 text-right font-mono text-foreground">{formatCurrency(totalRev)}</span>
                    <span className="col-span-2 text-right font-mono text-primary">{formatCurrency(totalEbitda)}</span>
                    <span className="col-span-3 text-right font-mono text-accent">{formatCurrency(totalOCF)}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Capital Priority — full matrix + ranking */}
        <CapitalPriorityWidget
          variant="full"
          agencies={periodAgencies}
          targetDSCR={targetDSCR}
          amortYears={amortYears}
          annualRate={annualRate / 100}
          selectedAgencyId={selectedAgencyId}
          onSelectAgency={(id) => {
            const a = periodAgencies.find(x => x.id === id);
            if (a && a.vertical !== selectedVertical) setSelectedVertical(a.vertical);
            setSelectedAgencyId(id);
          }}
        />

        {/* Results */}
        {simulation && (
          <div className="space-y-4 animate-float-up">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Resultados de Simulación — {selectedVertical} {simulateTransition}
            </h2>

            {/* Equity editor */}
            <div className="glass-card p-5 border-accent/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-foreground">Nuevo Equity a Adquirir</h3>
                </div>
                <button
                  onClick={() => setCustomEquity(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Restablecer ({simulation.defaultEquity}%)
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Equity Actual Promedio</p>
                  <p className="text-xl font-mono text-muted-foreground mt-1">{simulation.avgCurrentEquity.toFixed(1)}%</p>
                </div>
                <div className="md:col-span-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Nuevo Equity Objetivo</span>
                    <span className="text-2xl font-bold font-mono text-accent">{simulation.newEquity}%</span>
                  </div>
                  <Slider
                    value={[simulation.newEquity]}
                    onValueChange={([v]) => setCustomEquity(v)}
                    min={Math.ceil(simulation.avgCurrentEquity)}
                    max={100}
                    step={1}
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                    <span>{Math.ceil(simulation.avgCurrentEquity)}%</span><span>100%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Equity Adquirido</p>
                  <p className="text-xl font-mono text-accent mt-1">+{simulation.equityAcquired.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">en {simulation.targetAgencies.length} agencia(s)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 border-primary/30">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">EBITDA Incremental</span>
                <p className="text-2xl font-bold font-mono text-primary mt-1">+{formatCurrency(simulation.incrementalEbitda)}</p>
                <p className="text-[10px] text-muted-foreground">Adicional bajo control</p>
              </div>
              <div className="glass-card p-4 border-destructive/30">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Costo de Adquisición</span>
                <p className="text-2xl font-bold font-mono text-destructive mt-1">{formatCurrency(simulation.acquisitionCost)}</p>
                <p className="text-[10px] text-muted-foreground">{standaloneMultiple}x EBITDA standalone</p>
              </div>
              <div className="glass-card p-4 border-accent/30 glow-gold">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Arbitraje de Múltiplo</span>
                <p className="text-2xl font-bold font-mono text-accent mt-1">+{formatCurrency(simulation.arbitrage)}</p>
                <p className="text-[10px] text-muted-foreground">({exitMultiple}x − {standaloneMultiple}x) × ΔEBITDA</p>
              </div>
              <div className="glass-card p-4 border-primary/30 glow-emerald">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nueva Valorización Grupo</span>
                <p className="text-2xl font-bold font-mono text-primary mt-1">{formatCurrency(simulation.projectedValuation)}</p>
                <p className="text-[10px] text-muted-foreground">vs. {formatCurrency(simulation.currentValuation)} (+{formatCurrency(simulation.valueGain)})</p>
              </div>
            </div>

            {/* Before vs After chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Valoración Comparativa</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Valor Actual del Grupo</p>
                      <div className="h-8 bg-primary/20 rounded-lg flex items-center px-3 relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full bg-primary/40 rounded-lg" style={{ width: `${(simulation.currentValuation / simulation.projectedValuation) * 100}%` }} />
                        <span className="relative text-sm font-bold font-mono text-primary">{formatCurrency(simulation.currentValuation)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Valor Proyectado con Escalamiento</p>
                      <div className="h-8 bg-accent/20 rounded-lg flex items-center px-3 relative overflow-hidden">
                        <div className="absolute left-0 top-0 h-full bg-accent/40 rounded-lg" style={{ width: '100%' }} />
                        <span className="relative text-sm font-bold font-mono text-accent">{formatCurrency(simulation.projectedValuation)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Incremento patrimonial inmediato</p>
                    <p className="text-xl font-bold font-mono text-accent">+{formatCurrency(simulation.valueGain)}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Análisis de Sinergias</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Índice de Riesgo Fundador (IRF)</span>
                      <span className="text-xs font-mono text-primary">
                        {simulation.avgIRFBefore.toFixed(1)} → {simulation.avgIRFAfter.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-destructive/60 rounded-full" style={{ width: `${(simulation.avgIRFBefore / 5) * 100}%` }} />
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(simulation.avgIRFAfter / 5) * 100}%` }} />
                      </div>
                    </div>
                    <p className="text-[10px] text-primary mt-1">↓ Reducción de {(simulation.irfReduction).toFixed(1)} puntos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Poder Estructural</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Este movimiento {simulateTransition === '2→1' ? 'consolida control mayoritario' : 'establece participación minoritaria'} en la vertical {selectedVertical}, 
                      reduciendo la dependencia del fundador y fortaleciendo la posición institucional del holding en la región.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!simulation && (
          <div className="glass-card p-6 border-dashed border-accent/30 text-center">
            <Sparkles className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">Selecciona un Escenario de Escalamiento</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activa <span className="font-mono text-accent">N3→N2</span> o <span className="font-mono text-accent">N2→N1</span> para ver los KPIs de decisión:
              EBITDA Incremental · Costo de Adquisición · Arbitraje de Múltiplo · Nueva Valorización · Reducción de IRF · Poder Estructural.
            </p>
          </div>
        )}

        {/* Capacidad de Apalancamiento — siempre visible para la vertical */}
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              Capacidad de Apalancamiento {selectedAgencyId ? `— ${leverage.rows.find(r => r.agency.id === selectedAgencyId)?.agency.name}` : `— ${selectedVertical}`}
            </h2>
            <div className="glass-card p-3 grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[320px]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">DSCR Objetivo</span>
                  <span className="text-xs font-bold font-mono text-accent">{targetDSCR.toFixed(2)}x</span>
                </div>
                <Slider value={[targetDSCR]} onValueChange={([v]) => setTargetDSCR(v)} min={1.25} max={2} step={0.05} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Plazo</span>
                  <span className="text-xs font-bold font-mono text-primary">{amortYears} años</span>
                </div>
                <Slider value={[amortYears]} onValueChange={([v]) => setAmortYears(v)} min={1} max={15} step={1} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasa Anual</span>
                  <span className="text-xs font-bold font-mono text-primary">{annualRate.toFixed(2)}%</span>
                </div>
                <Slider value={[annualRate]} onValueChange={([v]) => setAnnualRate(v)} min={0} max={25} step={0.25} />
              </div>
            </div>
          </div>

          {!selectedAgencyId && (
            <div className="glass-card p-6 border-dashed border-primary/30 text-center">
              <Banknote className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Selecciona una agencia</p>
              <p className="text-xs text-muted-foreground mt-1">
                Haz click en una agencia del listado <span className="text-primary">"Agencias en {selectedVertical}"</span> para ver su capacidad de apalancamiento individual.
              </p>
            </div>
          )}

          {selectedAgencyId && (() => {
            const r = leverage.rows.find(row => row.agency.id === selectedAgencyId);
            if (!r) return null;
            const exhausted = r.additionalDebtService <= 0;
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="glass-card p-4">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Op. Cashflow <span className="text-muted-foreground/70">/ año</span></span>
                    <p className="text-lg font-bold font-mono mt-1 text-foreground">{formatCurrency(r.agency.operatingCashflow)}</p>
                    <p className="text-[10px] text-muted-foreground">flujo operativo anual</p>
                  </div>
                  <div className="glass-card p-4">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Debt Service Actual <span className="text-muted-foreground/70">/ año</span></span>
                    <p className="text-lg font-bold font-mono mt-1 text-muted-foreground">{formatCurrency(r.agency.debtService)}</p>
                    <div className="mt-1"><DSCRBadge value={r.currentDSCR} /></div>
                  </div>
                  <div className="glass-card p-4 border-accent/30">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Debt Svc Máx <span className="text-muted-foreground/70">/ año</span></span>
                    <p className="text-lg font-bold font-mono mt-1 text-accent">{formatCurrency(r.maxDebtService)}</p>
                    <p className="text-[10px] text-muted-foreground">pago anual máx · DSCR ≥ {targetDSCR.toFixed(2)}x</p>
                  </div>
                  <div className={`glass-card p-4 ${exhausted ? 'border-destructive/40' : 'border-primary/30 glow-emerald'}`}>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Capacidad Adicional <span className="text-muted-foreground/70">(principal)</span></span>
                    <p className={`text-2xl font-bold font-mono mt-1 ${exhausted ? 'text-destructive' : 'text-primary'}`}>
                      {exhausted ? '— sin capacidad' : `+${formatCurrency(r.additionalDebt)}`}
                    </p>
                    {!exhausted && (
                      <p className="text-[10px] text-muted-foreground">
                        Δ servicio anual: {formatCurrency(r.maxDebtService)} − {formatCurrency(r.agency.debtService)} = <span className="text-foreground">+{formatCurrency(r.additionalDebtService)}/año</span>
                        <br />⇒ PV @ {amortYears}a · {annualRate.toFixed(2)}% = <span className="text-primary">{formatCurrency(r.additionalDebt)}</span>
                        <br />Intereses 1er año ≈ <span className="text-accent">{formatCurrency(r.annualInterestEst)}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="glass-card px-4 py-3 text-[11px] text-muted-foreground">
                  <span className="text-foreground font-semibold">¿Por qué la capacidad supera al Debt Svc Máx?</span>{' '}
                  Las 3 primeras tarjetas son <span className="text-foreground">flujos anuales</span> (lo que pagas cada año). La <span className="text-primary">Capacidad Adicional</span> es el <span className="text-foreground">principal de deuda nueva</span> (stock) que ese flujo extra puede sostener: <span className="font-mono">(Debt Svc Máx − Debt Service Actual) × 6x</span>, donde 6x ≈ deuda corporativa amortizable a ~6 años.
                  <br /><br />
                  <span className="text-foreground font-semibold">Vehículo financiero:</span>{' '}
                  Plazo <span className="font-mono text-primary">{amortYears} años</span> · tasa <span className="font-mono text-primary">{annualRate.toFixed(2)}%</span> anual.
                  Capacidad = Valor Presente de la anualidad
                  <span className="font-mono"> PV = pago × (1 − (1 + i)<sup>−n</sup>) / i</span>.
                  Ajusta los sliders para reflejar revolventes (corto plazo, tasas mensuales variables), bullets (1–3 años), term loans (5–7 años) o senior notes (10+ años).
                </div>

                {/* Tabla de amortización mensual */}
                {!exhausted && r.additionalDebt > 0 && (() => {
                  const principal = r.additionalDebt;
                  const n = Math.max(1, amortYears * 12);
                  const i = (annualRate / 100) / 12;
                  const payment = i > 0
                    ? principal * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
                    : principal / n;
                  // Construir cronograma mensual completo y agregar por año
                  let balance = principal;
                  let totalInterest = 0;
                  let totalPrincipal = 0;
                  const yearly: { year: number; interest: number; principal: number; payment: number; endBalance: number }[] = [];
                  for (let y = 1; y <= amortYears; y++) {
                    let yInt = 0, yPrin = 0, yPay = 0;
                    for (let m = 1; m <= 12; m++) {
                      const interest = balance * i;
                      const principalPay = payment - interest;
                      balance = Math.max(0, balance - principalPay);
                      yInt += interest;
                      yPrin += principalPay;
                      yPay += payment;
                    }
                    totalInterest += yInt;
                    totalPrincipal += yPrin;
                    yearly.push({ year: y, interest: yInt, principal: yPrin, payment: yPay, endBalance: balance });
                  }
                  return (
                    <div className="glass-card p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Cronograma de Pago — Capacidad Adicional</p>
                          <p className="text-[11px] text-muted-foreground/80">
                            Principal <span className="font-mono text-primary">{formatCurrency(principal)}</span> ·
                            Cuota mensual <span className="font-mono text-accent">{formatCurrency(payment)}</span> ·
                            Cuota anual <span className="font-mono text-accent">{formatCurrency(payment * 12)}</span>
                          </p>
                        </div>
                        <div className="text-right text-[11px]">
                          <p className="text-muted-foreground">Total intereses: <span className="font-mono text-foreground">{formatCurrency(totalInterest)}</span></p>
                          <p className="text-muted-foreground">Total pagado: <span className="font-mono text-foreground">{formatCurrency(totalPrincipal + totalInterest)}</span></p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] font-mono">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border/40">
                              <th className="text-left py-2 px-2 font-normal">Año</th>
                              <th className="text-right py-2 px-2 font-normal">Cuota Mensual</th>
                              <th className="text-right py-2 px-2 font-normal">Capital (mes)</th>
                              <th className="text-right py-2 px-2 font-normal">Interés (mes)</th>
                              <th className="text-right py-2 px-2 font-normal">Capital (año)</th>
                              <th className="text-right py-2 px-2 font-normal">Interés (año)</th>
                              <th className="text-right py-2 px-2 font-normal">Saldo Fin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yearly.map((y) => {
                              const monthlyPrin = y.principal / 12;
                              const monthlyInt = y.interest / 12;
                              return (
                                <tr key={y.year} className="border-b border-border/20 hover:bg-muted/20">
                                  <td className="py-1.5 px-2 text-foreground">{y.year}</td>
                                  <td className="py-1.5 px-2 text-right text-accent">{formatCurrency(payment)}</td>
                                  <td className="py-1.5 px-2 text-right text-primary">{formatCurrency(monthlyPrin)}</td>
                                  <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(monthlyInt)}</td>
                                  <td className="py-1.5 px-2 text-right text-primary">{formatCurrency(y.principal)}</td>
                                  <td className="py-1.5 px-2 text-right text-muted-foreground">{formatCurrency(y.interest)}</td>
                                  <td className="py-1.5 px-2 text-right text-foreground">{formatCurrency(y.endBalance)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border/40">
                              <td className="py-2 px-2 text-foreground font-semibold" colSpan={4}>Totales</td>
                              <td className="py-2 px-2 text-right text-primary font-semibold">{formatCurrency(totalPrincipal)}</td>
                              <td className="py-2 px-2 text-right text-accent font-semibold">{formatCurrency(totalInterest)}</td>
                              <td className="py-2 px-2 text-right text-foreground font-semibold">{formatCurrency(totalPrincipal + totalInterest)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 mt-3">
                        Cuota fija mensual calculada con <span className="font-mono">PMT = P · i / (1 − (1 + i)<sup>−n</sup>)</span>, donde <span className="font-mono">i</span> = tasa mensual y <span className="font-mono">n</span> = {n} meses. La proporción capital/interés varía mes a mes (sistema francés): los primeros años pagan más interés y los últimos más capital.
                      </p>
                    </div>
                  );
                })()}

                {/* Acquisition coverage widget */}
                {simulation && (() => {
                  const cost = simulation.acquisitionCost;
                  const capacity = r.additionalDebt;
                  const covered = capacity >= cost && cost > 0;
                  const coverageRatio = cost > 0 ? (capacity / cost) * 100 : 0;
                  const shortfall = cost - capacity;
                  return (
                    <div className={`glass-card p-5 ${covered ? 'border-primary/40 glow-emerald' : 'border-destructive/40'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${covered ? 'bg-primary/15' : 'bg-destructive/15'}`}>
                          {covered
                            ? <CheckCircle2 className="w-5 h-5 text-primary" />
                            : <AlertTriangle className="w-5 h-5 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-[180px]">
                          <p className={`text-sm font-semibold ${covered ? 'text-primary' : 'text-destructive'}`}>
                            {covered
                              ? 'Cobertura Total — Adquisición Financiable con Deuda'
                              : 'Cobertura Insuficiente — Requiere Equity Adicional'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Costo de Adquisición ({simulateTransition}) = <span className="font-mono text-destructive">{formatCurrency(cost)}</span>
                            {' · '}Capacidad de Deuda de {r.agency.name} = <span className="font-mono text-primary">{formatCurrency(capacity)}</span>
                          </p>
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Cobertura</span>
                              <span className="font-mono">{coverageRatio.toFixed(0)}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${covered ? 'bg-primary' : 'bg-destructive'}`}
                                style={{ width: `${Math.min(coverageRatio, 100)}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-[11px] mt-2">
                            {covered ? (
                              <span className="text-primary">
                                ✓ Sobrante de deuda: <span className="font-mono">{formatCurrency(capacity - cost)}</span> · DSCR objetivo {targetDSCR.toFixed(2)}x preservado.
                              </span>
                            ) : (
                              <span className="text-destructive">
                                ⚠ Faltante: <span className="font-mono">{formatCurrency(shortfall)}</span> debe cubrirse con equity o renegociar DSCR objetivo.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      </div>
    </AppLayout>
  );
}
