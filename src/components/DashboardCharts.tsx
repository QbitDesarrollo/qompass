import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS, VERTICAL_COLORS, formatCurrency, getConsolidatedEbitda } from '@/lib/quantum-engine';
import InfoTooltip from '@/components/InfoTooltip';
import { Period, getPeriodSeries, getSnapshot, formatPeriod } from '@/lib/historical-data';

interface PowerMapProps { period?: Period }

export function PowerMapChart({ period }: PowerMapProps = {}) {
  const { data, title, subtitle, info } = useMemo(() => {
    if (period) {
      // Histórico: últimos 8 periodos terminando en el actual
      const series = getPeriodSeries(period, 8);
      return {
        data: series.map(s => ({
          year: formatPeriod(s.period),
          ebitda: Math.round(s.consolidatedEbitda),
        })),
        title: 'EBITDA Consolidado · Histórico',
        subtitle: `Últimos 8 ${period.granularity === 'month' ? 'meses' : period.granularity === 'quarter' ? 'trimestres' : 'años'}`,
        info: 'historic' as const,
      };
    }
    // Fallback: proyección a 5 años (modo original)
    const years = [2025, 2026, 2027, 2028, 2029];
    const growthRates = [1, 1.15, 1.35, 1.6, 2.0];
    const baseEbitda = getConsolidatedEbitda(mockAgencies);
    return {
      data: years.map((year, i) => ({
        year: year.toString(),
        ebitda: Math.round(baseEbitda * growthRates[i]),
      })),
      title: 'Mapa de Poder a 5 Años',
      subtitle: 'Proyección de EBITDA bajo control institucional',
      info: 'projection' as const,
    };
  }, [period]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <InfoTooltip>
          {info === 'historic' ? (
            <>
              <div className="font-semibold text-foreground">EBITDA Consolidado Histórico</div>
              <div className="text-muted-foreground">Serie agregada de los últimos 8 periodos según la granularidad seleccionada.</div>
              <div className="font-mono text-[10px] text-foreground">Σ (EBITDA × equity / 100) por periodo</div>
              <div className="text-[10px] text-muted-foreground">Cambia la granularidad (mes/trimestre/año) en el selector superior.</div>
            </>
          ) : (
            <>
              <div className="font-semibold text-foreground">Proyección de EBITDA Consolidado</div>
              <div className="text-muted-foreground">EBITDA bajo control institucional proyectado bajo curva de adquisición y ascenso de niveles.</div>
              <div className="font-mono text-[10px] text-foreground">Base × factor de crecimiento por año</div>
            </>
          )}
        </InfoTooltip>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
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

interface VerticalProps { period?: Period }

export function VerticalDistributionChart({ period }: VerticalProps = {}) {
  const data = useMemo(() => {
    if (period) {
      const snap = getSnapshot(period);
      return VERTICALS.map(v => ({
        name: v,
        value: snap.byVertical[v] || 0,
        color: VERTICAL_COLORS[v],
      }));
    }
    return VERTICALS.map(v => ({
      name: v,
      value: mockAgencies.filter(a => a.vertical === v).reduce((s, a) => s + a.ebitda * (a.equity / 100), 0),
      color: VERTICAL_COLORS[v],
    }));
  }, [period]);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="text-sm font-semibold text-foreground">EBITDA por Vertical</h3>
        <InfoTooltip>
          <div className="font-semibold text-foreground">Distribución del EBITDA Consolidado</div>
          <div className="text-muted-foreground">Cuánto aporta cada vertical al EBITDA del grupo, ponderado por equity.</div>
          <div className="font-mono text-[10px] text-foreground">Σ (EBITDA<sub>i</sub> × equity<sub>i</sub>) por vertical</div>
          <ul className="list-disc pl-4 text-[10px] text-muted-foreground">
            <li>Concentración alta → riesgo de dependencia</li>
            <li>Distribución pareja → resiliencia y diversificación</li>
          </ul>
        </InfoTooltip>
      </div>
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
