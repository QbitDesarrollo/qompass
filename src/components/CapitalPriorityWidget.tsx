import { useMemo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Target, Zap, AlertTriangle, Wrench, Search, ArrowRight, Info, FlaskConical, BookOpen } from 'lucide-react';
import { mockAgencies } from '@/lib/mock-data';
import { computeCapitalPriorities, formatCurrency, QUADRANT_META, PriorityQuadrant, CapitalPriority } from '@/lib/quantum-engine';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSimulation } from '@/lib/simulation-store';
import { getPlaybookEligibility } from '@/lib/playbooks-data';

const TONE_CLASSES: Record<'primary' | 'accent' | 'warning' | 'danger', { badge: string; dot: string; ring: string; text: string; bg: string }> = {
  primary: { badge: 'bg-primary/15 text-primary border-primary/30', dot: 'bg-primary', ring: 'ring-primary/40', text: 'text-primary', bg: 'bg-primary/10' },
  accent:  { badge: 'bg-accent/15 text-accent border-accent/30',    dot: 'bg-accent',  ring: 'ring-accent/40',  text: 'text-accent',  bg: 'bg-accent/10' },
  warning: { badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400', ring: 'ring-yellow-500/40', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  danger:  { badge: 'bg-destructive/15 text-destructive border-destructive/30', dot: 'bg-destructive', ring: 'ring-destructive/40', text: 'text-destructive', bg: 'bg-destructive/10' },
};

const QUADRANT_ICON: Record<PriorityQuadrant, typeof Zap> = {
  deploy: Zap,
  optimize: Wrench,
  investigate: Search,
  restructure: AlertTriangle,
};

/** Lógica detallada por cuadrante para los tooltips */
const QUADRANT_LOGIC: Record<PriorityQuadrant, {
  criteria: string;
  signals: string[];
  action: string;
  nextSteps: string[];
}> = {
  deploy: {
    criteria: 'EBITDA ≥ mediana del set  ·  Capacidad de deuda adicional ≥ mediana del set',
    signals: [
      'Genera utilidad probada y sostenida',
      'DSCR holgado vs. objetivo (default 1.5x) → headroom para más deuda',
      'El dólar marginal de capital rinde más aquí (mejor ROIC esperado)',
    ],
    action: 'Inyectar capital ya: M&A, expansión, equity buyout, o debt-funded growth.',
    nextSteps: [
      'Validar tesis de crecimiento y pipeline comercial',
      'Estructurar term loan o senior notes al plazo óptimo',
      'Si tiene oportunidad de ascenso (IPE/IPP/IPC), priorizar la transición de nivel',
    ],
  },
  optimize: {
    criteria: 'EBITDA ≥ mediana  ·  Capacidad de deuda adicional < mediana',
    signals: [
      'Rentable pero sin margen de deuda nueva (DSCR ya cerca del objetivo)',
      'Posible exceso de debt service actual o cashflow operativo subóptimo',
      'Conversión EBITDA → caja puede estar comprimida (working capital, capex)',
    ],
    action: 'Optimizar cashflow y/o refinanciar la deuda existente antes de nuevo capital.',
    nextSteps: [
      'Refinanciar a plazos más largos para bajar el debt service anual',
      'Liberar caja: working capital, política de cobranza, capex',
      'Reevaluar después: probablemente migra a "Inyectar Capital"',
    ],
  },
  investigate: {
    criteria: 'EBITDA < mediana  ·  Capacidad de deuda adicional ≥ mediana',
    signals: [
      'Tiene headroom financiero pero el retorno actual no lo justifica',
      'Capacidad ociosa: baja deuda y bajo cashflow operativo',
      'Puede ser early-stage, pricing débil, o tesis de inversión sin tracción',
    ],
    action: 'Investigar antes de desplegar: la capacidad sin retorno destruye valor si se apalanca mal.',
    nextSteps: [
      'Revisar pricing, mix de servicios y eficiencia operativa',
      'Validar si hay oportunidad de ascenso (IPE/IPP/IPC)',
      'Si hay tesis clara, capital pequeño con KPIs estrictos',
    ],
  },
  restructure: {
    criteria: 'EBITDA < mediana  ·  Capacidad de deuda adicional < mediana',
    signals: [
      'Bajo retorno y sin headroom financiero',
      'Riesgo de DSCR < objetivo → no soporta deuda adicional',
      'Drag sobre el EBITDA consolidado del grupo',
    ],
    action: 'Reestructurar, fusionar con otra spoke, o desinvertir.',
    nextSteps: [
      'Plan de turnaround a 6-12 meses con métricas claras',
      'Evaluar consolidación con otra agencia de la misma vertical',
      'Si no hay tesis de recuperación, exit ordenado',
    ],
  },
};

function QuadrantInfoTooltip({ q }: { q: PriorityQuadrant }) {
  const meta = QUADRANT_META[q];
  const logic = QUADRANT_LOGIC[q];
  const tone = TONE_CLASSES[meta.tone];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Información sobre cuadrante ${meta.label}`}
          className={`p-0.5 rounded-md text-muted-foreground hover:${tone.text} transition-colors`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs p-3 space-y-2 text-xs">
        <div>
          <div className={`font-semibold ${tone.text}`}>{meta.label}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Criterio</div>
          <div className="font-mono text-[10px] text-foreground">{logic.criteria}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Señales</div>
          <ul className="list-disc pl-4 space-y-0.5 text-foreground/90">
            {logic.signals.map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Acción</div>
          <div className={`${tone.text} font-medium`}>{logic.action}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Próximos pasos</div>
          <ul className="list-disc pl-4 space-y-0.5 text-foreground/90">
            {logic.nextSteps.map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
          Score = 60% EBITDA + 30% capacidad + 10% ascenso (normalizado al máximo del set).
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function ActionBadge({ tone, children }: { tone: 'primary' | 'accent' | 'warning' | 'danger'; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${TONE_CLASSES[tone].badge}`}>
      {children}
    </span>
  );
}

/** Tooltip explicando cómo se calculó el score de prioridad de capital (header). */
function ScoreFormulaTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Cómo se calcula el score"
          className="p-0.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-sm p-3 space-y-2 text-xs">
        <div>
          <div className="font-semibold text-foreground">Score de Prioridad de Capital</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Ranking 0–100 que prioriza dónde desplegar el próximo dólar de capital del grupo.
          </div>
        </div>
        <div className="rounded-md bg-secondary/40 border border-border/40 p-2 font-mono text-[10px] text-foreground leading-relaxed">
          Score =<br />
          &nbsp;&nbsp;0.60 × <span className="text-primary">EBITDA Score</span><br />
          + 0.30 × <span className="text-accent">Capacity Score</span><br />
          + 0.10 × <span className="text-yellow-400">Ascension Score</span>
        </div>
        <div className="space-y-1.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">EBITDA Score (60%)</div>
            <div className="text-foreground/90">EBITDA de la agencia ÷ máximo EBITDA del set × 100. Premia rentabilidad probada.</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Capacity Score (30%)</div>
            <div className="text-foreground/90">Deuda adicional soportable ÷ máxima del set × 100. Calculada con DSCR objetivo 1.5x, plazo 6 años, tasa 10%.</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ascension Score (10%)</div>
            <div className="text-foreground/90">100 si la agencia califica para subir de nivel (IPE/IPP/IPC sobre umbral); 0 en caso contrario.</div>
          </div>
        </div>
        <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
          Los cuadrantes (Deploy / Optimize / Investigate / Restructure) se asignan por mediana de EBITDA y capacidad — son independientes del score.
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Tooltip por agencia con el desglose individual del score. */
function ScoreBreakdownTooltip({ p }: { p: CapitalPriority }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Desglose del score de ${p.agency.name}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs p-3 space-y-2 text-xs">
        <div className="font-semibold text-foreground">{p.agency.name} — Score {p.score.toFixed(1)}</div>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-primary">EBITDA Score</span>
            <span className="text-foreground">{p.ebitdaScore.toFixed(1)} × 0.60 = {(p.ebitdaScore * 0.6).toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-accent">Capacity Score</span>
            <span className="text-foreground">{p.capacityScore.toFixed(1)} × 0.30 = {(p.capacityScore * 0.3).toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-400">Ascension</span>
            <span className="text-foreground">{p.ascensionScore.toFixed(0)} × 0.10 = {(p.ascensionScore * 0.1).toFixed(1)}</span>
          </div>
          <div className="border-t border-border/40 pt-1 flex justify-between font-bold">
            <span className="text-foreground">Total</span>
            <span className="text-foreground">{p.score.toFixed(1)} / 100</span>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
          Cuadrante: <span className="text-foreground font-medium">{QUADRANT_META[p.quadrant].label}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Wrapper que renderiza <button> si hay onSelect, o <Link> si no. Evita warnings de ref. */
function AgencyAction({
  agencyId,
  onSelect,
  className,
  children,
}: {
  agencyId: string;
  onSelect?: (id: string) => void;
  className?: string;
  children: ReactNode;
}) {
  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(agencyId)} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link to={`/agencies/${agencyId}`} className={className}>
      {children}
    </Link>
  );
}

/* ============================================================
   Matrix 2x2: Capacidad (X) vs EBITDA (Y)
============================================================ */
function PriorityMatrix({ priorities, onSelect, selectedId, simulatedIds }: { priorities: CapitalPriority[]; onSelect?: (id: string) => void; selectedId?: string | null; simulatedIds: Set<string> }) {
  /**
   * Cuadrante simétrico clásico (50/50). La clasificación se hace
   * por mediana en quantum-engine, pero aquí re-mapeamos cada punto
   * a coordenadas RELATIVAS a su propio cuadrante: dentro de su
   * mitad horizontal y vertical, el punto se ubica según su rank
   * (mejor → más al borde). Así el punto SIEMPRE cae sobre el
   * cuadrante que coincide con su badge.
   */
  const byQuadrant = priorities.reduce((acc, p) => {
    (acc[p.quadrant] ||= []).push(p);
    return acc;
  }, {} as Record<PriorityQuadrant, CapitalPriority[]>);

  // Posición normalizada (0..1) dentro del cuadrante para cada agencia.
  // Más EBITDA → más arriba dentro de su mitad. Más capacidad → más a la derecha.
  const positions = new Map<string, { qx: number; qy: number }>();
  (Object.keys(byQuadrant) as PriorityQuadrant[]).forEach(q => {
    const list = byQuadrant[q];
    const ebs = list.map(p => p.ebitda);
    const caps = list.map(p => p.additionalDebt);
    const minE = Math.min(...ebs), maxE = Math.max(...ebs);
    const minC = Math.min(...caps), maxC = Math.max(...caps);
    list.forEach(p => {
      const qx = caps.length > 1 && maxC > minC ? (p.additionalDebt - minC) / (maxC - minC) : 0.5;
      const qy = ebs.length > 1 && maxE > minE ? (p.ebitda - minE) / (maxE - minE) : 0.5;
      positions.set(p.agency.id, { qx, qy });
    });
  });

  const cells: { q: PriorityQuadrant; title: string; subtitle: string; pos: 'top' | 'bottom'; side: 'left' | 'right' }[] = [
    { q: 'optimize',    title: 'Optimizar / Refinanciar', subtitle: 'Alto EBITDA · Baja capacidad',  pos: 'top' as const, side: 'left' as const },
    { q: 'deploy',      title: 'Inyectar Capital',         subtitle: 'Alto EBITDA · Alta capacidad', pos: 'top' as const, side: 'right' as const },
    { q: 'restructure', title: 'Reestructurar',            subtitle: 'Bajo EBITDA · Baja capacidad', pos: 'bottom' as const, side: 'left' as const },
    { q: 'investigate', title: 'Capacidad Ociosa',         subtitle: 'Bajo EBITDA · Alta capacidad', pos: 'bottom' as const, side: 'right' as const },
  ];

  return (
    <TooltipProvider delayDuration={150}>
    <div className="relative">
      {/* Header label */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        <span>Matriz EBITDA × Capacidad de deuda adicional</span>
        <span className="text-muted-foreground/70">Tamaño punto = score</span>
      </div>
      <div className="flex gap-2">
        {/* Y axis label (vertical) */}
        <div className="flex items-center justify-center [writing-mode:vertical-rl] rotate-180 text-[10px] uppercase tracking-wider text-muted-foreground py-2 shrink-0">
          <span>EBITDA bajo&nbsp;&nbsp;←&nbsp;&nbsp;<span className="text-foreground">EBITDA</span>&nbsp;&nbsp;→&nbsp;&nbsp;alto</span>
        </div>
        <div className="flex-1">
          <div className="relative aspect-[2/1] w-full rounded-lg border-2 border-border bg-secondary/20 overflow-hidden">
        {/* Quadrant tints */}
        {cells.map(c => {
          const tone = TONE_CLASSES[QUADRANT_META[c.q].tone];
          const style: React.CSSProperties = {
            left: c.side === 'left' ? 0 : '50%',
            width: '50%',
            top: c.pos === 'top' ? 0 : '50%',
            height: '50%',
          };
          return (
            <div key={c.q} className={`absolute ${tone.bg} border border-border/30`} style={style}>
              <div className="p-2 flex items-start justify-between gap-1">
                <div>
                  <div className={`text-[10px] font-semibold ${tone.text} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                    {c.title}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{c.subtitle}</div>
                  <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                    {(byQuadrant[c.q]?.length || 0)} agencias
                  </div>
                </div>
                <QuadrantInfoTooltip q={c.q} />
              </div>
            </div>
          );
        })}
        {/* Axis lines centrales — cuadrante simétrico */}
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-border" />
        <div className="absolute inset-y-0 left-1/2 border-l-2 border-border" />

        {/* Points */}
        {priorities.map(p => {
          // Mapear coordenada local del cuadrante (0..1) al rango global
          // del cuadrante correspondiente (50% del lienzo). Padding del 12%
          // dentro de cada cuadrante para evitar puntos pegados al borde.
          const pos = positions.get(p.agency.id) ?? { qx: 0.5, qy: 0.5 };
          const PAD = 0.18; // margen interno del cuadrante
          const local = (v: number) => PAD + v * (1 - 2 * PAD);
          // X: deploy/investigate están en la mitad derecha (50–100%);
          //    optimize/restructure en la izquierda (0–50%).
          const isRight = p.quadrant === 'deploy' || p.quadrant === 'investigate';
          const isTop = p.quadrant === 'deploy' || p.quadrant === 'optimize';
          const x = (isRight ? 50 : 0) + local(pos.qx) * 50;
          const y = (isTop ? 50 : 0) + local(pos.qy) * 50;
          const tone = TONE_CLASSES[p.action.tone];
          const size = 8 + (p.score / 100) * 14; // 8-22px
          const isSelected = selectedId === p.agency.id;
          const simulated = simulatedIds.has(p.agency.id);
          return (
            <div
              key={p.agency.id}
              className="absolute group"
              style={{ left: `calc(${x}% - ${size / 2}px)`, bottom: `calc(${y}% - ${size / 2}px)`, width: size, height: size }}
            >
              <AgencyAction agencyId={p.agency.id} onSelect={onSelect} className="block w-full h-full">
                <span
                  className={`block w-full h-full rounded-full ${tone.dot} ring-2 ${isSelected ? 'ring-foreground' : simulated ? 'ring-accent' : 'ring-background'} shadow-lg hover:ring-4 transition-all cursor-pointer ${simulated ? 'animate-pulse' : ''}`}
                  title={`${p.agency.name} — Score ${p.score.toFixed(0)}`}
                />
              </AgencyAction>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-popover border border-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap shadow-xl">
                  <div className="font-semibold text-foreground inline-flex items-center gap-1.5">
                    {p.agency.name}
                    {simulated && <span className="text-accent font-mono">[SIM]</span>}
                  </div>
                  <div className="text-muted-foreground font-mono">EBITDA {formatCurrency(p.ebitda)} · Cap +{formatCurrency(p.additionalDebt)}</div>
                </div>
              </div>
            </div>
          );
        })}
          </div>
          {/* X axis label */}
          <div className="text-center text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
            Capacidad baja&nbsp;&nbsp;←&nbsp;&nbsp;<span className="text-foreground">Capacidad de deuda adicional</span>&nbsp;&nbsp;→&nbsp;&nbsp;alta
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

/* ============================================================
   Ranked list of priorities
============================================================ */
function PriorityList({ priorities, limit, onSelect, selectedId, simulatedIds }: { priorities: CapitalPriority[]; limit?: number; onSelect?: (id: string) => void; selectedId?: string | null; simulatedIds: Set<string> }) {
  const rows = limit ? priorities.slice(0, limit) : priorities;
  return (
    <div className="space-y-1.5">
      {rows.map((p, i) => {
        const tone = TONE_CLASSES[p.action.tone];
        const Icon = QUADRANT_ICON[p.quadrant];
        const isSelected = selectedId === p.agency.id;
        const simulated = simulatedIds.has(p.agency.id);
        return (
          <AgencyAction
            key={p.agency.id}
            agencyId={p.agency.id}
            onSelect={onSelect}
            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
              isSelected
                ? 'bg-primary/10 border border-primary/40'
                : simulated
                ? 'bg-accent/5 border border-accent/30 hover:bg-accent/10'
                : 'bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border'
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-muted/40 text-[10px] font-mono text-muted-foreground">
              {i + 1}
            </div>
            <div className={`flex items-center justify-center w-7 h-7 rounded-md ${tone.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${tone.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{p.agency.name}</span>
                <ActionBadge tone={p.action.tone}>{p.action.label}</ActionBadge>
                {simulated && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                    <FlaskConical className="w-2.5 h-2.5" /> Simulado
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                EBITDA {formatCurrency(p.ebitda)} · Cap. adicional +{formatCurrency(p.additionalDebt)} · {p.agency.vertical}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-base font-bold font-mono ${tone.text}`}>{p.score.toFixed(0)}</div>
              <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground uppercase tracking-wider">
                score
                <ScoreBreakdownTooltip p={p} />
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </AgencyAction>
        );
      })}
    </div>
  );
}

/* ============================================================
   Public component
============================================================ */
interface Props {
  variant?: 'compact' | 'full';
  agencies?: typeof mockAgencies;
  targetDSCR?: number;
  amortYears?: number;
  annualRate?: number; // 0..1
  /** Si se provee, los items disparan este callback (selección local) en lugar de navegar a /agencies/:id */
  onSelectAgency?: (id: string) => void;
  /** ID actualmente seleccionado, para resaltarlo */
  selectedAgencyId?: string | null;
}

export default function CapitalPriorityWidget({
  variant = 'full',
  agencies = mockAgencies,
  targetDSCR = 1.5,
  amortYears = 6,
  annualRate = 0.10,
  onSelectAgency,
  selectedAgencyId = null,
}: Props) {
  const { simulatedIds } = useSimulation();
  const simulatedSet = useMemo(() => new Set(simulatedIds), [simulatedIds]);
  const priorities = useMemo(
    () => computeCapitalPriorities(agencies, { targetDSCR, amortYears, annualRate }),
    [agencies, targetDSCR, amortYears, annualRate],
  );

  if (variant === 'compact') {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-accent/10">
              <Target className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Prioridad de Capital</h3>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                Top 3 · 60% EBITDA + 30% capacidad + 10% ascenso
                <ScoreFormulaTooltip />
              </p>
            </div>
          </div>
          <Link to="/war-room" className="text-xs text-primary hover:underline">Ver matriz →</Link>
        </div>
        <PriorityList priorities={priorities} limit={3} onSelect={onSelectAgency} selectedId={selectedAgencyId} simulatedIds={simulatedSet} />
      </div>
    );
  }

  // full
  const counts = priorities.reduce((acc, p) => {
    acc[p.quadrant] = (acc[p.quadrant] || 0) + 1;
    return acc;
  }, {} as Record<PriorityQuadrant, number>);

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-md bg-accent/10">
            <Target className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Prioridad de Despliegue de Capital</h3>
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1 flex-wrap">
              Score = 60% EBITDA · 30% capacidad de deuda adicional · 10% momentum de ascenso · DSCR objetivo {targetDSCR.toFixed(2)}x
              <ScoreFormulaTooltip />
              {onSelectAgency ? <span>· Click para seleccionar agencia</span> : null}
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-mono">
          {(['deploy', 'optimize', 'investigate', 'restructure'] as PriorityQuadrant[]).map(q => {
            const tone = TONE_CLASSES[QUADRANT_META[q].tone];
            return (
              <span key={q} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${tone.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                {QUADRANT_META[q].short} · {counts[q] || 0}
              </span>
            );
          })}
        </div>
      </div>

      <PriorityMatrix priorities={priorities} onSelect={onSelectAgency} selectedId={selectedAgencyId} simulatedIds={simulatedSet} />

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ranking accionable</h4>
        <PriorityList priorities={priorities} onSelect={onSelectAgency} selectedId={selectedAgencyId} simulatedIds={simulatedSet} />
      </div>
    </div>
  );
}