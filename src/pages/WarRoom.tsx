import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS, Vertical, NivelIntegracion, formatCurrency, getConsolidatedEbitda, Agency } from '@/lib/quantum-engine';
import { Swords, ArrowRight, TrendingUp, Shield, Zap, DollarSign, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Slider } from '@/components/ui/slider';

export default function WarRoom() {
  const [selectedVertical, setSelectedVertical] = useState<Vertical>('Creative & Strategy');
  const [simulateTransition, setSimulateTransition] = useState<'3→2' | '2→1' | null>(null);
  const [exitMultiple, setExitMultiple] = useState(6);
  const [standaloneMultiple, setStandaloneMultiple] = useState(4);
  const [customEquity, setCustomEquity] = useState<number | null>(null);

  const currentConsolidated = useMemo(() => getConsolidatedEbitda(mockAgencies), []);

  const simulation = useMemo(() => {
    if (!simulateTransition) return null;

    const verticalAgencies = mockAgencies.filter(a => a.vertical === selectedVertical);
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
  }, [selectedVertical, simulateTransition, exitMultiple, standaloneMultiple, customEquity, currentConsolidated]);

  const comparisonData = useMemo(() => {
    if (!simulation) return [];
    return [
      { name: 'EBITDA Actual', actual: currentConsolidated, projected: 0 },
      { name: 'EBITDA Proyectado', actual: 0, projected: simulation.projectedConsolidated },
    ];
  }, [simulation, currentConsolidated]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Swords className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">War Room</h1>
            <p className="text-sm text-muted-foreground">Simulación de Escenarios de Escalamiento</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vertical</h3>
            <div className="grid grid-cols-1 gap-2">
              {VERTICALS.map(v => {
                const count = mockAgencies.filter(a => a.vertical === v).length;
                return (
                  <button
                    key={v}
                    onClick={() => { setSelectedVertical(v); setSimulateTransition(null); }}
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
                const agencies = mockAgencies.filter(a => a.vertical === selectedVertical && (t === '3→2' ? a.nivel === 3 : a.nivel === 2));
                return (
                  <button
                    key={t}
                    onClick={() => setSimulateTransition(simulateTransition === t ? null : t)}
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
                <span className="text-xs text-muted-foreground">Múltiplo de Salida</span>
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
            </div>
          </div>

          {/* Current Status */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Agencias en {selectedVertical}
            </h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {mockAgencies.filter(a => a.vertical === selectedVertical).map(a => (
                <div key={a.id} className={`flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 text-xs ${
                  simulation?.targetAgencies.some(t => t.id === a.id) ? 'ring-1 ring-accent/50' : ''
                }`}>
                  <div>
                    <span className="text-foreground font-medium">{a.name}</span>
                    <span className="text-muted-foreground ml-2">N{a.nivel}</span>
                  </div>
                  <span className="font-mono text-primary">{formatCurrency(a.ebitda)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {simulation && (
          <div className="space-y-4 animate-float-up">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Resultados de Simulación — {selectedVertical} {simulateTransition}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nuevo Equity</span>
                <p className="text-2xl font-bold font-mono text-accent mt-1">{simulation.newEquity}%</p>
                <p className="text-[10px] text-muted-foreground">Aplicado a {simulation.targetAgencies.length} agencia(s)</p>
              </div>
              <div className="glass-card p-4 border-primary/30">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">EBITDA Incremental</span>
                <p className="text-2xl font-bold font-mono text-primary mt-1">+{formatCurrency(simulation.incrementalEbitda)}</p>
                <p className="text-[10px] text-muted-foreground">Adicional bajo control</p>
              </div>
              <div className="glass-card p-4 border-primary/30 glow-emerald">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">EBITDA Consolidado Proy.</span>
                <p className="text-2xl font-bold font-mono text-primary mt-1">{formatCurrency(simulation.projectedConsolidated)}</p>
                <p className="text-[10px] text-muted-foreground">vs. actual {formatCurrency(currentConsolidated)}</p>
              </div>
              <div className="glass-card p-4 border-accent/30 glow-gold">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ganancia de Valor ({exitMultiple}x)</span>
                <p className="text-2xl font-bold font-mono text-accent mt-1">+{formatCurrency(simulation.valueGain)}</p>
                <p className="text-[10px] text-muted-foreground">Exit Value: {formatCurrency(simulation.projectedValuation)}</p>
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
      </div>
    </AppLayout>
  );
}
