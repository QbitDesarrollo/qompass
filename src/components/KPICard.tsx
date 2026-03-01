import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: 'default' | 'emerald' | 'gold';
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: KPICardProps) {
  const borderClass = variant === 'emerald' 
    ? 'border-primary/30 glow-emerald' 
    : variant === 'gold' 
    ? 'border-accent/30 glow-gold' 
    : 'border-border';

  return (
    <div className={`glass-card p-5 ${borderClass} animate-float-up`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${variant === 'emerald' ? 'bg-primary/10' : variant === 'gold' ? 'bg-accent/10' : 'bg-secondary'}`}>
          <Icon className={`w-4 h-4 ${variant === 'emerald' ? 'text-primary' : variant === 'gold' ? 'text-accent' : 'text-muted-foreground'}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${variant === 'emerald' ? 'text-primary' : variant === 'gold' ? 'text-accent' : 'text-foreground'}`}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? 'text-primary' : 'text-destructive'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
