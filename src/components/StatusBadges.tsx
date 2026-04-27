import { Badge } from '@/components/ui/badge';
import { NivelIntegracion, NIVEL_LABELS, DSCRStatus, getDSCRStatus } from '@/lib/quantum-engine';

export function NivelBadge({ nivel }: { nivel: NivelIntegracion }) {
  const styles: Record<NivelIntegracion, string> = {
    1: 'bg-primary/15 text-primary border-primary/30',
    2: 'bg-accent/15 text-accent border-accent/30',
    3: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    4: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge variant="outline" className={`${styles[nivel]} text-[10px] font-mono`}>
      N{nivel} · {NIVEL_LABELS[nivel].split(' ')[0]}
    </Badge>
  );
}

export function VerticalBadge({ vertical }: { vertical: string }) {
  return (
    <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground border-border text-[10px]">
      {vertical}
    </Badge>
  );
}

export function AscensionBadge({ type }: { type: string }) {
  return (
    <Badge className="bg-accent/20 text-accent border border-accent/30 text-[10px] animate-pulse-subtle">
      ⚡ Ascenso {type}
    </Badge>
  );
}

const DSCR_STYLES: Record<DSCRStatus, { cls: string; dot: string; label: string }> = {
  excelente: { cls: 'bg-primary/15 text-primary border-primary/30', dot: 'bg-primary', label: 'Excelente' },
  bueno:     { cls: 'bg-accent/15 text-accent border-accent/30',    dot: 'bg-accent',  label: 'Bueno' },
  aceptable: { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400', label: 'Aceptable' },
  riesgo:    { cls: 'bg-destructive/15 text-destructive border-destructive/30', dot: 'bg-destructive', label: 'Riesgo' },
};

export function DSCRBadge({ value, showValue = true }: { value: number; showValue?: boolean }) {
  const status = getDSCRStatus(value);
  const s = DSCR_STYLES[status];
  const display = isFinite(value) ? `${value.toFixed(2)}x` : '∞';
  return (
    <Badge variant="outline" className={`${s.cls} text-[10px] font-mono inline-flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {showValue ? `DSCR ${display} · ${s.label}` : s.label}
    </Badge>
  );
}
