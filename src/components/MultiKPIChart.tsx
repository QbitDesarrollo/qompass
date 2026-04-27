import { useMemo } from 'react';
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export interface MultiKPIPoint {
  label: string;
  revenue: number;
  agi: number;
  ebitda: number;
  ocf: number;
  margin: number; // %
}

interface Props {
  data: MultiKPIPoint[];
  formatCurrency: (v: number) => string;
  formatPercent: (v: number) => string;
  height?: number;
}

const COLORS = {
  revenue: 'hsl(var(--muted-foreground))',
  agi: 'hsl(var(--primary))',
  ebitda: 'hsl(var(--accent))',
  ocf: 'hsl(190 85% 55%)', // cyan para distinguir cashflow
  margin: 'hsl(48 95% 55%)', // amarillo cálido para destacar
};

export default function MultiKPIChart({ data, formatCurrency, formatPercent, height = 280 }: Props) {
  const isEmpty = !data.length || data.every(d => d.revenue === 0 && d.agi === 0 && d.ebitda === 0);

  const tickFmtCurrency = useMemo(() => (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  }, []);

  if (isEmpty) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-muted-foreground">
        Sin datos para los periodos seleccionados
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.revenue} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLORS.revenue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="agiGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.agi} stopOpacity={0.30} />
              <stop offset="100%" stopColor={COLORS.agi} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ebitdaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.ebitda} stopOpacity={0.40} />
              <stop offset="100%" stopColor={COLORS.ebitda} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ocfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.ocf} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COLORS.ocf} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          {/* Eje izquierdo: montos $ */}
          <YAxis
            yAxisId="amount"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={tickFmtCurrency}
          />
          {/* Eje derecho: % margen */}
          <YAxis
            yAxisId="pct"
            orientation="right"
            tick={{ fontSize: 10, fill: 'hsl(48 95% 55%)' }}
            axisLine={false}
            tickLine={false}
            width={42}
            tickFormatter={(v) => `${(v as number).toFixed(0)}%`}
            domain={[0, 'auto']}
          />

          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 11,
              padding: '8px 10px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ padding: '1px 0' }}
            formatter={(value: number, name: string) => {
              if (name === 'Margen') return [formatPercent(value), name];
              return [formatCurrency(value), name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
          />

          <Area
            yAxisId="amount"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={COLORS.revenue}
            strokeWidth={1.75}
            fill="url(#revGrad)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            yAxisId="amount"
            type="monotone"
            dataKey="agi"
            name="AGI"
            stroke={COLORS.agi}
            strokeWidth={1.75}
            fill="url(#agiGrad)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            yAxisId="amount"
            type="monotone"
            dataKey="ebitda"
            name="EBITDA"
            stroke={COLORS.ebitda}
            strokeWidth={2}
            fill="url(#ebitdaGrad)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            yAxisId="amount"
            type="monotone"
            dataKey="ocf"
            name="Op. Cashflow"
            stroke={COLORS.ocf}
            strokeWidth={1.75}
            fill="url(#ocfGrad)"
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="margin"
            name="Margen"
            stroke={COLORS.margin}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 2.5, fill: COLORS.margin, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}