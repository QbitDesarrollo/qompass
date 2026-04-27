import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sliders } from 'lucide-react';
import { Granularity, Period, currentPeriod, formatPeriod, isPeriodAvailable, shiftPeriod } from '@/lib/historical-data';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  month: 'Mes',
  quarter: 'Trimestre',
  year: 'Año',
  last12: 'Últ. 12m',
  last24: 'Últ. 24m',
  custom: 'Personalizado',
};

const PRESETS: Granularity[] = ['month', 'quarter', 'year', 'last12', 'last24', 'custom'];

function ymToDate(ym: string): Date {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}
function dateToYm(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PeriodSelector({ period, onPeriodChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  const setGranularity = (g: Granularity) => {
    onPeriodChange(currentPeriod(g));
    if (g === 'custom') setCustomOpen(true);
  };

  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const canGoPrev = isPeriodAvailable(prev);
  const canGoNext = isPeriodAvailable(next);
  const isCurrent = formatPeriod(period) === formatPeriod(currentPeriod(period.granularity));
  const isCustom = period.granularity === 'custom';

  const fromDate = isCustom && period.customFrom ? ymToDate(period.customFrom) : undefined;
  const toDate = isCustom && period.customTo ? ymToDate(period.customTo) : undefined;

  const updateCustom = (from?: Date, to?: Date) => {
    if (!from || !to) return;
    // Asegurar from <= to
    const [a, b] = from <= to ? [from, to] : [to, from];
    onPeriodChange({
      granularity: 'custom',
      year: b.getFullYear(),
      index: b.getMonth() + 1,
      customFrom: dateToYm(a),
      customTo: dateToYm(b),
    });
  };

  return (
    <div className="glass-card p-2 flex items-center gap-2 flex-wrap">
      {/* Granularity tabs */}
      <div className="flex items-center bg-secondary/40 rounded-md p-0.5 flex-wrap">
        {PRESETS.map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGranularity(g)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
              period.granularity === g
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {GRANULARITY_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Custom range datepickers */}
      {isCustom && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-secondary/40 text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono">
                {fromDate ? fromDate.toLocaleDateString('es', { month: 'short', year: 'numeric' }) : 'Desde'}
                {' → '}
                {toDate ? toDate.toLocaleDateString('es', { month: 'short', year: 'numeric' }) : 'Hasta'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1">Desde</div>
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => updateCustom(d, toDate)}
                  defaultMonth={fromDate}
                  className={cn('p-3 pointer-events-auto')}
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1">Hasta</div>
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => updateCustom(fromDate, d)}
                  defaultMonth={toDate}
                  className={cn('p-3 pointer-events-auto')}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Period navigation (oculto para custom) */}
      {!isCustom && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPeriodChange(prev)}
            disabled={!canGoPrev}
            aria-label="Periodo anterior"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1 min-w-[140px] text-center inline-flex items-center justify-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-semibold text-foreground">{formatPeriod(period)}</span>
          </div>

          <button
            type="button"
            onClick={() => onPeriodChange(next)}
            disabled={!canGoNext}
            aria-label="Periodo siguiente"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isCurrent && !isCustom && (
        <button
          type="button"
          onClick={() => onPeriodChange(currentPeriod(period.granularity))}
          className="text-[10px] text-primary hover:underline px-2 py-1"
        >
          Volver a actual
        </button>
      )}
    </div>
  );
}