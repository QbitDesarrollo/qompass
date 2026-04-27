import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Granularity, Period, currentPeriod, formatPeriod, isPeriodAvailable, shiftPeriod } from '@/lib/historical-data';

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
}

const GRANULARITY_LABELS: Record<Granularity, string> = {
  month: 'Mes',
  quarter: 'Trimestre',
  year: 'Año',
};

export default function PeriodSelector({ period, onPeriodChange }: Props) {
  const setGranularity = (g: Granularity) => {
    onPeriodChange(currentPeriod(g));
  };

  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const canGoPrev = isPeriodAvailable(prev);
  const canGoNext = isPeriodAvailable(next);
  const isCurrent = formatPeriod(period) === formatPeriod(currentPeriod(period.granularity));

  return (
    <div className="glass-card p-2 flex items-center gap-2 flex-wrap">
      {/* Granularity tabs */}
      <div className="flex items-center bg-secondary/40 rounded-md p-0.5">
        {(['month', 'quarter', 'year'] as Granularity[]).map(g => (
          <button
            key={g}
            type="button"
            onClick={() => setGranularity(g)}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              period.granularity === g
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {GRANULARITY_LABELS[g]}
          </button>
        ))}
      </div>

      {/* Period navigation */}
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

        <div className="px-3 py-1 min-w-[110px] text-center inline-flex items-center justify-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-mono font-semibold text-foreground">{formatPeriod(period)}</span>
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

      {!isCurrent && (
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