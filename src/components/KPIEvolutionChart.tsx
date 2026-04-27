import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface EvolutionPoint {
  label: string;
  value: number;
}

interface Props {
  data: EvolutionPoint[];
  /** Color tone: primary | accent | muted */
  tone?: 'primary' | 'accent' | 'muted';
  /** Formato del valor en tooltip */
  formatValue?: (v: number) => string;
  height?: number;
  showAxis?: boolean;
}

const TONE_COLOR: Record<NonNullable<Props['tone']>, string> = {
  primary: 'hsl(var(--primary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted-foreground))',
};

export default function KPIEvolutionChart({
  data,
  tone = 'primary',
  formatValue = (v) => v.toFixed(2),
  height = 60,
  showAxis = false,
}: Props) {
  const color = TONE_COLOR[tone];
  const id = `grad-${tone}-${Math.random().toString(36).slice(2, 8)}`;

  if (!data.length) {
    return <div style={{ height }} className="flex items-center justify-center text-[10px] text-muted-foreground">Sin datos</div>;
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showAxis && (
            <>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => formatValue(v as number)} />
            </>
          )}
          <Tooltip
            cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1 }}
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 6,
              fontSize: 11,
              padding: '4px 8px',
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            formatter={(v: number) => [formatValue(v), '']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}