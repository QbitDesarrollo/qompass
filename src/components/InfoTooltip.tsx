import { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InfoTooltipProps {
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  size?: number; // px
}

export default function InfoTooltip({ children, side = 'top', align = 'start', className = '', size = 12 }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Más información"
            className={`text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center ${className}`}
          >
            <Info style={{ width: size, height: size }} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-xs p-3 text-xs space-y-1.5">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}