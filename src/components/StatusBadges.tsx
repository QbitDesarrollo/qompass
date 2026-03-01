import { Badge } from '@/components/ui/badge';
import { NivelIntegracion, NIVEL_LABELS } from '@/lib/quantum-engine';

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
