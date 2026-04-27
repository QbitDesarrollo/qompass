import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { DualDelta } from '@/lib/historical-data';

interface Props {
  delta: DualDelta;
  /** Si true, una baja es buena (ej: Debt Service / OCF). Default false. */
  invertColor?: boolean;
  className?: string;
}

function formatPct(p: number): string {
  const abs = Math.abs(p);
  if (abs >= 100) return `${p.toFixed(0)}%`;
  return `${p.toFixed(1)}%`;
}

function toneFor(pct: number, invert: boolean): string {
  if (Math.abs(pct) < 0.05) return 'text-muted-foreground';
  const positive = pct > 0;
  const good = invert ? !positive : positive;
  return good ? 'text-primary' : 'text-destructive';
}

function Row({ label, pct, available, invert }: { label: string; pct: number; available: boolean; invert: boolean }) {
  if (!available) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground/50">
        <span className="uppercase tracking-wider">{label}</span>
        <span>—</span>
      </span>
    );
  }
  const Icon = Math.abs(pct) < 0.05 ? Minus : pct > 0 ? ArrowUp : ArrowDown;
  const tone = toneFor(pct, invert);
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${tone}`}>
      <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
      <Icon className="w-2.5 h-2.5" />
      {formatPct(pct)}
    </span>
  );
}

export default function DeltaBadge({ delta, invertColor = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <Row label="Δ" pct={delta.vsPrev.pct} available={delta.vsPrev.available} invert={invertColor} />
      <Row label="YoY" pct={delta.vsYoY.pct} available={delta.vsYoY.available} invert={invertColor} />
    </div>
  );
}