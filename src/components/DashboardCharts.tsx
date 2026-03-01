import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS, VERTICAL_COLORS, formatCurrency, getConsolidatedEbitda } from '@/lib/quantum-engine';

export function PowerMapChart() {
  const data = useMemo(() => {
    // 5-year projection
    const years = [2025, 2026, 2027, 2028, 2029];
    const growthRates = [1, 1.15, 1.35, 1.6, 2.0];
    const baseEbitda = getConsolidatedEbitda(mockAgencies);
    return years.map((year, i) => ({
      year: year.toString(),
      ebitda: Math.round(baseEbitda * growthRates[i]),
    }));
  }, []);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Mapa de Poder a 5 Años</h3>
      <p className="text-xs text-muted-foreground mb-4">Proyección de EBITDA bajo control institucional</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
          <XAxis dataKey="year" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={false} />
          <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
          <Tooltip
            contentStyle={{ background: 'hsl(222, 47%, 8%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'hsl(210, 40%, 96%)' }}
            formatter={(value: number) => [formatCurrency(value), 'EBITDA Consolidado']}
          />
          <Bar dataKey="ebitda" radius={[4, 4, 0, 0]} fill="hsl(160, 84%, 39%)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VerticalDistributionChart() {
  const data = useMemo(() => {
    return VERTICALS.map(v => ({
      name: v,
      value: mockAgencies.filter(a => a.vertical === v).reduce((s, a) => s + a.ebitda * (a.equity / 100), 0),
      color: VERTICAL_COLORS[v],
    })).filter(d => d.value > 0);
  }, []);

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">EBITDA por Vertical</h3>
      <p className="text-xs text-muted-foreground mb-4">Distribución del EBITDA consolidado</p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={180}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'hsl(222, 47%, 8%)', border: '1px solid hsl(222, 30%, 16%)', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [formatCurrency(value), 'EBITDA']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-muted-foreground">{d.name}</span>
              <span className="text-xs font-mono text-foreground ml-auto">{formatCurrency(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
