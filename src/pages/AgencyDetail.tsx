import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { NivelBadge, AscensionBadge } from '@/components/StatusBadges';
import { mockAgencies } from '@/lib/mock-data';
import { calcIPE, calcIPP, calcIPC, getAscensionOpportunity, isLevel1Eligible, formatCurrency, formatPercent, NIVEL_LABELS, Agency } from '@/lib/quantum-engine';
import { ArrowLeft, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Info, FileText, Sparkles, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const INDEX_INFO: Record<string, string> = {
  IPE: 'Índice de Poder Estratégico. Mide la capacidad de Quantum Group para influir estratégicamente sobre la agencia. Fórmula: (DEC/100·5)·0.35 + CME·0.35 + IIO·0.15 + (6−IS)·0.15. Umbral 3.8 activa transición Fase 4→3.',
  IPP: 'Índice de Preparación para Participación. Evalúa madurez para una adquisición minoritaria. Fórmula: (DEC/100·5)·0.30 + CEC·0.30 + IIF·0.20 + (6−IRF)·0.20. Umbral 3.8 activa transición Fase 3→2.',
  IPC: 'Índice de Preparación para Control. Mide la viabilidad de tomar control mayoritario. Fórmula: DET·0.30 + CEI·0.30 + IIOT·0.20 + (6−IARF)·0.20. Umbral 4.0 activa transición Fase 2→1.',
  IIO: 'Integración Operativa. Grado de integración de procesos operativos diarios con el Hub. 1=Independiente · 5=Unidad interna total.',
  IIOT: 'Integración Operativa Total. Nivel de centralización de sistemas, plataformas y operaciones compartidas. 1=Sin sistemas compartidos · 5=Operación centralizada.',
  IS: 'Sustituibilidad. Qué tan reemplazable es la agencia dentro del portafolio. 1=Muy reemplazable · 5=Crítico/Irreemplazable. (Se invierte en fórmulas: 6−IS).',
  IIF: 'Integración Financiera. Madurez contable y de reporting financiero. 1=Información desordenada · 5=Audit-ready (auditable, NIIF).',
  IRF: 'Riesgo Fundador. Dependencia operativa y comercial respecto del fundador. 1=Delegación total · 5=Dependencia absoluta. (Se invierte: 6−IRF).',
  IARF: 'Autonomía Residual del Fundador. Control informal que mantiene el fundador post-integración. 1=Control real inmediato del Hub · 5=Control informal del fundador. (Se invierte: 6−IARF).',
  CME: 'Calidad de la Métrica Estratégica. Disponibilidad y confiabilidad de KPIs, dashboards y data para toma de decisiones. 1=Pobre · 5=Excelente.',
  CEC: 'Capacidad Estratégica Comercial. Fuerza del pipeline, capacidad de venta cruzada y crecimiento orgánico. 1=Limitada · 5=Sobresaliente.',
  CEI: 'Capacidad Estratégica Institucional. Madurez de governance, compliance y procesos institucionales. 1=Informal · 5=Institucional plena.',
  DET: 'Dependencia Estratégica Total. Nivel de dependencia estratégica recíproca entre la agencia y Quantum Group. 1=Baja · 5=Total.',
  DEC: 'Dependencia Económica Cruzada. Porcentaje de la facturación de la agencia que proviene de Quantum Group y/o sus clientes. Mide el lock-in económico.',
};

function InfoTip({ code }: { code: string }) {
  const text = INDEX_INFO[code];
  if (!text) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function IndexGauge({ label, code, value, baseline, threshold, description, simulating }: { label: string; code: string; value: number; baseline: number; threshold: number; description: string; simulating: boolean }) {
  const pct = Math.min((value / 5) * 100, 100);
  const basePct = Math.min((baseline / 5) * 100, 100);
  const threshPct = (threshold / 5) * 100;
  const exceeded = value > threshold;
  const delta = value - baseline;
  const showSim = simulating && Math.abs(delta) > 0.01;
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
          {label}
          <InfoTip code={code} />
        </span>
        <div className="flex items-baseline gap-2">
          {showSim && (
            <span className={`text-[10px] font-mono ${delta > 0 ? 'text-accent' : 'text-destructive'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(2)}
            </span>
          )}
          <span className={`text-lg font-bold font-mono ${exceeded ? 'text-accent' : 'text-foreground'}`}>{value.toFixed(2)}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">{description}</p>
      <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
        {/* Baseline (sólido, valor sincronizado de documentos) */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary/70"
          style={{ width: `${basePct}%` }}
        />
        {/* Simulación (difuminado/animado por encima) */}
        {showSim && (
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-accent/40 via-accent/70 to-accent animate-pulse"
            style={{ width: `${pct}%`, filter: 'blur(1px)', opacity: 0.85 }}
          />
        )}
        {/* Línea de umbral (baseline rojo) */}
        <div
          className="absolute top-0 w-0.5 h-full bg-destructive z-10"
          style={{ left: `${threshPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">0</span>
        <span className="text-[9px] text-destructive">Umbral: {threshold}</span>
        <span className="text-[9px] text-muted-foreground">5</span>
      </div>
      {showSim && (
        <p className="text-[9px] text-muted-foreground mt-1 font-mono">
          Doc: {baseline.toFixed(2)} → Sim: {value.toFixed(2)}
        </p>
      )}
    </div>
  );
}

function SliderInput({ label, code, value, baseline, onChange, description, disabled, min = 1, max = 5, step = 0.1, suffix = '' }: { label: string; code: string; value: number; baseline: number; onChange: (v: number) => void; description: string; disabled: boolean; min?: number; max?: number; step?: number; suffix?: string }) {
  const changed = Math.abs(value - baseline) > 0.01;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
          {label}
          <InfoTip code={code} />
        </span>
        <div className="flex items-baseline gap-1.5">
          {changed && (
            <span className="text-[9px] font-mono text-muted-foreground line-through">
              {baseline.toFixed(step < 1 ? 1 : 0)}{suffix}
            </span>
          )}
          <span className={`text-xs font-mono ${changed ? 'text-accent' : 'text-primary'}`}>
            {value.toFixed(step < 1 ? 1 : 0)}{suffix}
          </span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={`w-full ${disabled ? 'opacity-60' : ''} ${changed ? '[&_[role=slider]]:border-accent [&_.bg-primary]:bg-accent' : ''}`}
      />
      <p className="text-[9px] text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AgencyDetail() {
  const { id } = useParams();
  const baseAgency = mockAgencies.find(a => a.id === id);

  const [overrides, setOverrides] = useState<Partial<Agency>>({});
  const [simulating, setSimulating] = useState(false);
  
  if (!baseAgency) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-muted-foreground">Agencia no encontrada.</p>
          <Link to="/agencies" className="text-primary hover:underline text-sm">← Volver</Link>
        </div>
      </AppLayout>
    );
  }

  const agency: Agency = { ...baseAgency, ...overrides };
  const ipe = calcIPE(agency);
  const ipp = calcIPP(agency);
  const ipc = calcIPC(agency);
  const baseIpe = calcIPE(baseAgency);
  const baseIpp = calcIPP(baseAgency);
  const baseIpc = calcIPC(baseAgency);
  const ascension = getAscensionOpportunity(agency);
  const eligible = isLevel1Eligible(agency);

  const updateField = (field: keyof Agency, value: number) => {
    setOverrides(prev => ({ ...prev, [field]: value }));
  };
  const resetSim = () => setOverrides({});
  const hasChanges = Object.keys(overrides).length > 0;

  return (
    <AppLayout>
      <TooltipProvider delayDuration={150}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <Link to="/agencies" className="mt-1 p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{agency.name}</h1>
              <NivelBadge nivel={agency.nivel} />
              {ascension && <AscensionBadge type={ascension.type} />}
              {eligible && (
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                  N1-ELIGIBLE
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {agency.vertical} · {agency.country} · {NIVEL_LABELS[agency.nivel]}
            </p>
          </div>
        </div>

        {/* Mode toggle bar — sticky, imposible de no ver */}
        <div className={`sticky top-0 z-30 -mx-6 px-6 py-3 backdrop-blur-md border-b transition-colors ${simulating ? 'bg-accent/10 border-accent/40' : 'bg-background/90 border-border'}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`p-2 rounded-lg ${simulating ? 'bg-accent/20' : 'bg-secondary'}`}>
              {simulating ? <Sparkles className="w-5 h-5 text-accent" /> : <FileText className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-semibold text-foreground">
                {simulating ? 'Modo Simulación' : 'Valores sincronizados de documentos'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {simulating
                  ? 'Mueve los sliders para proyectar escenarios. Barras difuminadas = simulación.'
                  : 'Data room, financials, due diligence. Activa el modo para simular cambios.'}
              </p>
            </div>
            {simulating && hasChanges && (
              <Button variant="ghost" size="sm" onClick={resetSim} className="text-xs">
                <RotateCcw className="w-3 h-3" /> Reset
              </Button>
            )}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className={`text-xs font-mono uppercase tracking-wider ${simulating ? 'text-accent' : 'text-muted-foreground'}`}>
                {simulating ? 'ON' : 'OFF'}
              </span>
              <Switch
                checked={simulating}
                onCheckedChange={(v) => { if (!v) resetSim(); setSimulating(v); }}
                className="data-[state=checked]:bg-accent scale-125"
              />
              <span className="text-xs font-semibold text-foreground hidden sm:inline">Simulación</span>
            </label>
          </div>
        </div>

        {/* Ascension Alert */}
        {ascension && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-accent/30 bg-accent/5">
            <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-accent">Oportunidad de Ascenso Detectada ({ascension.type})</p>
              <p className="text-xs text-muted-foreground">
                Índice {ascension.index} = {ascension.value.toFixed(2)} supera el umbral por 2 periodos consecutivos. Activar Playbook de Ascenso.
              </p>
            </div>
          </div>
        )}

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Revenue', value: formatCurrency(agency.revenue) },
            { label: 'AGI', value: formatCurrency(agency.agi) },
            { label: 'EBITDA', value: formatCurrency(agency.ebitda), highlight: true },
            { label: 'Margen', value: formatPercent(agency.margin) },
            { label: 'Equity QG', value: agency.equity > 0 ? `${agency.equity}%` : 'N/A', gold: true },
          ].map(kpi => (
            <div key={kpi.label} className={`glass-card p-4 ${kpi.highlight ? 'border-primary/30' : kpi.gold ? 'border-accent/30' : ''}`}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <p className={`text-lg font-bold font-mono mt-1 ${kpi.highlight ? 'text-primary' : kpi.gold ? 'text-accent' : 'text-foreground'}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Composite Indices */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Índices Compuestos — Motor de Decisión
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <IndexGauge label="IPE (Poder Estratégico)" code="IPE" value={ipe} baseline={baseIpe} threshold={3.8} description="Fase 4→3 · Partner → Participación" simulating={simulating} />
            <IndexGauge label="IPP (Preparación Participación)" code="IPP" value={ipp} baseline={baseIpp} threshold={3.8} description="Fase 3→2 · Adquisición minoritaria" simulating={simulating} />
            <IndexGauge label="IPC (Preparación Control)" code="IPC" value={ipc} baseline={baseIpc} threshold={4.0} description="Fase 2→1 · Control mayoritario" simulating={simulating} />
          </div>
        </div>

        {/* Qualitative Sliders */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quantum Intelligence Engine — Calificación Cualitativa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operativo</h3>
              <SliderInput label="IIO (Integración Operativa)" code="IIO" value={agency.iio} baseline={baseAgency.iio} onChange={v => updateField('iio', v)} description="1=Independiente, 5=Unidad interna total" disabled={!simulating} />
              <SliderInput label="IIOT (Integración Op. Total)" code="IIOT" value={agency.iiot} baseline={baseAgency.iiot} onChange={v => updateField('iiot', v)} description="1=Sin sistemas compartidos, 5=Op. centralizada" disabled={!simulating} />
              <SliderInput label="IS (Sustituibilidad)" code="IS" value={agency.is_} baseline={baseAgency.is_} onChange={v => updateField('is_', v)} description="1=Muy reemplazable, 5=Crítico/Irreemplazable" disabled={!simulating} />
            </div>
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Financiero & Riesgo</h3>
              <SliderInput label="IIF (Integración Financiera)" code="IIF" value={agency.iif} baseline={baseAgency.iif} onChange={v => updateField('iif', v)} description="1=Información desordenada, 5=Audit-ready" disabled={!simulating} />
              <SliderInput label="IRF (Riesgo Fundador)" code="IRF" value={agency.irf} baseline={baseAgency.irf} onChange={v => updateField('irf', v)} description="1=Delegación total, 5=Dependencia absoluta" disabled={!simulating} />
              <SliderInput label="IARF (Autonomía Residual)" code="IARF" value={agency.iarf} baseline={baseAgency.iarf} onChange={v => updateField('iarf', v)} description="1=Control real inmediato, 5=Control informal" disabled={!simulating} />
            </div>
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estratégico</h3>
              <SliderInput label="CME (Calidad Métrica Estratégica)" code="CME" value={agency.cme} baseline={baseAgency.cme} onChange={v => updateField('cme', v)} description="Calidad de métricas y data disponible" disabled={!simulating} />
              <SliderInput label="CEC (Cap. Estratégica Comercial)" code="CEC" value={agency.cec} baseline={baseAgency.cec} onChange={v => updateField('cec', v)} description="Capacidad comercial y de crecimiento" disabled={!simulating} />
              <SliderInput label="CEI (Cap. Estratégica Institucional)" code="CEI" value={agency.cei} baseline={baseAgency.cei} onChange={v => updateField('cei', v)} description="Madurez institucional y governance" disabled={!simulating} />
              <SliderInput label="DET (Dependencia Estratégica Total)" code="DET" value={agency.det} baseline={baseAgency.det} onChange={v => updateField('det', v)} description="Nivel de dependencia estratégica" disabled={!simulating} />
            </div>
          </div>
        </div>

        {/* DEC */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 inline-flex items-center gap-1.5">
            DEC — Dependencia Económica Cruzada
            <InfoTip code="DEC" />
          </h3>
          <div className="flex items-center gap-4">
            <Slider
              value={[agency.dec]}
              onValueChange={([v]) => updateField('dec', v)}
              min={0}
              max={100}
              step={1}
              disabled={!simulating}
              className="flex-1"
            />
            <div className="flex items-baseline gap-2 min-w-[90px] justify-end">
              {agency.dec !== baseAgency.dec && (
                <span className="text-[10px] font-mono text-muted-foreground line-through">{baseAgency.dec}%</span>
              )}
              <span className={`text-lg font-bold font-mono ${agency.dec !== baseAgency.dec ? 'text-accent' : 'text-primary'}`}>{agency.dec}%</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">% de facturación proveniente de Quantum Group</p>
        </div>
      </div>
      </TooltipProvider>
    </AppLayout>
  );
}
