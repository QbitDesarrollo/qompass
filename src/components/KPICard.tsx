import { LucideIcon, Info } from 'lucide-react';
import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DeltaBadge from './DeltaBadge';
import type { DualDelta } from '@/lib/historical-data';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: 'default' | 'emerald' | 'gold';
  info?: ReactNode;
  delta?: DualDelta;
  /** Para métricas donde "menos es mejor" (ej: Debt Service / OCF) */
  invertDeltaColor?: boolean;
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'default', info, delta, invertDeltaColor }: KPICardProps) {
  const borderClass = variant === 'emerald' 
    ? 'border-primary/30 glow-emerald' 
    : variant === 'gold' 
    ? 'border-accent/30 glow-gold' 
    : 'border-border';

  return (
    <div className={`glass-card p-5 ${borderClass} animate-float-up`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          {info && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={`Información sobre ${title}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-xs p-3 text-xs space-y-1.5">
                  {info}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`p-2 rounded-lg ${variant === 'emerald' ? 'bg-primary/10' : variant === 'gold' ? 'bg-accent/10' : 'bg-secondary'}`}>
          <Icon className={`w-4 h-4 ${variant === 'emerald' ? 'text-primary' : variant === 'gold' ? 'text-accent' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${variant === 'emerald' ? 'text-primary' : variant === 'gold' ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </p>
      <div className="mt-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          {trend && !delta && (
            <span className={`text-xs font-medium ${trend.positive ? 'text-primary' : 'text-destructive'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        {delta && <DeltaBadge delta={delta} invertColor={invertDeltaColor} />}
      </div>
    </div>
  );
}
