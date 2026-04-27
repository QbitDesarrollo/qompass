import { useMemo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Target, Zap, AlertTriangle, Wrench, Search, ArrowRight } from 'lucide-react';
import { mockAgencies } from '@/lib/mock-data';
import { computeCapitalPriorities, formatCurrency, QUADRANT_META, PriorityQuadrant, CapitalPriority } from '@/lib/quantum-engine';

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

function ActionBadge({ tone, children }: { tone: 'primary' | 'accent' | 'warning' | 'danger'; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${TONE_CLASSES[tone].badge}`}>
      {children}
    </span>
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
function PriorityMatrix({ priorities, onSelect, selectedId }: { priorities: CapitalPriority[]; onSelect?: (id: string) => void; selectedId?: string | null }) {
  const maxEbitda = Math.max(1, ...priorities.map(p => p.ebitda));
  const maxCap = Math.max(1, ...priorities.map(p => p.additionalDebt));

  const cells: { q: PriorityQuadrant; title: string; subtitle: string; pos: string }[] = [
    { q: 'optimize',    title: 'Optimizar / Refinanciar', subtitle: 'Alto EBITDA · Baja capacidad',  pos: 'top-0 left-0' },
    { q: 'deploy',      title: 'Inyectar Capital',         subtitle: 'Alto EBITDA · Alta capacidad', pos: 'top-0 right-0' },
    { q: 'restructure', title: 'Reestructurar',            subtitle: 'Bajo EBITDA · Baja capacidad', pos: 'bottom-0 left-0' },
    { q: 'investigate', title: 'Capacidad Ociosa',         subtitle: 'Bajo EBITDA · Alta capacidad', pos: 'bottom-0 right-0' },
  ];

  return (
    <div className="relative">
      {/* Axis labels */}
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        <span>← EBITDA bajo · <span className="text-foreground">EBITDA</span> · alto →</span>
        <span className="text-muted-foreground/70">Eje X: Capacidad de deuda adicional</span>
      </div>
      <div className="relative aspect-[2/1] w-full rounded-lg border border-border bg-secondary/20 overflow-hidden">
        {/* Quadrant tints */}
        {cells.map(c => {
          const tone = TONE_CLASSES[QUADRANT_META[c.q].tone];
          return (
            <div key={c.q} className={`absolute w-1/2 h-1/2 ${c.pos} ${tone.bg} border border-border/40`}>
              <div className="p-2">
                <div className={`text-[10px] font-semibold ${tone.text}`}>{c.title}</div>
                <div className="text-[9px] text-muted-foreground">{c.subtitle}</div>
              </div>
            </div>
          );
        })}
        {/* Axis lines */}
        <div className="absolute inset-x-0 top-1/2 border-t border-border/60" />
        <div className="absolute inset-y-0 left-1/2 border-l border-border/60" />

        {/* Points */}
        {priorities.map(p => {
          const x = (p.additionalDebt / maxCap) * 100;
          const y = (Math.max(0, p.ebitda) / maxEbitda) * 100;
          const tone = TONE_CLASSES[p.action.tone];
          const size = 8 + (p.score / 100) * 14; // 8-22px
          const isSelected = selectedId === p.agency.id;
          return (
            <div
              key={p.agency.id}
              className="absolute group"
              style={{ left: `calc(${x}% - ${size / 2}px)`, bottom: `calc(${y}% - ${size / 2}px)`, width: size, height: size }}
            >
              <AgencyAction agencyId={p.agency.id} onSelect={onSelect} className="block w-full h-full">
                <span
                  className={`block w-full h-full rounded-full ${tone.dot} ring-2 ${isSelected ? 'ring-foreground' : 'ring-background'} shadow-lg hover:ring-4 transition-all cursor-pointer`}
                  title={`${p.agency.name} — Score ${p.score.toFixed(0)}`}
                />
              </AgencyAction>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-popover border border-border rounded-md px-2 py-1 text-[10px] whitespace-nowrap shadow-xl">
                  <div className="font-semibold text-foreground">{p.agency.name}</div>
                  <div className="text-muted-foreground font-mono">EBITDA {formatCurrency(p.ebitda)} · Cap +{formatCurrency(p.additionalDebt)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Ranked list of priorities
============================================================ */
function PriorityList({ priorities, limit, onSelect, selectedId }: { priorities: CapitalPriority[]; limit?: number; onSelect?: (id: string) => void; selectedId?: string | null }) {
  const rows = limit ? priorities.slice(0, limit) : priorities;
  return (
    <div className="space-y-1.5">
      {rows.map((p, i) => {
        const tone = TONE_CLASSES[p.action.tone];
        const Icon = QUADRANT_ICON[p.quadrant];
        const isSelected = selectedId === p.agency.id;
        return (
          <AgencyAction
            key={p.agency.id}
            agencyId={p.agency.id}
            onSelect={onSelect}
            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
              isSelected
                ? 'bg-primary/10 border border-primary/40'
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
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                EBITDA {formatCurrency(p.ebitda)} · Cap. adicional +{formatCurrency(p.additionalDebt)} · {p.agency.vertical}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-base font-bold font-mono ${tone.text}`}>{p.score.toFixed(0)}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">score</div>
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
              <p className="text-[10px] text-muted-foreground">Top 3 · 60% EBITDA + 30% capacidad + 10% ascenso</p>
            </div>
          </div>
          <Link to="/war-room" className="text-xs text-primary hover:underline">Ver matriz →</Link>
        </div>
        <PriorityList priorities={priorities} limit={3} onSelect={onSelectAgency} selectedId={selectedAgencyId} />
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
            <p className="text-[10px] text-muted-foreground">
              Score = 60% EBITDA · 30% capacidad de deuda adicional · 10% momentum de ascenso · DSCR objetivo {targetDSCR.toFixed(2)}x
              {onSelectAgency ? ' · Click para seleccionar agencia' : ''}
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

      <PriorityMatrix priorities={priorities} onSelect={onSelectAgency} selectedId={selectedAgencyId} />

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ranking accionable</h4>
        <PriorityList priorities={priorities} onSelect={onSelectAgency} selectedId={selectedAgencyId} />
      </div>
    </div>
  );
}