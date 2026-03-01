import { useMemo } from 'react';
import { Building2, DollarSign, TrendingUp, PieChart, Crown } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import KPICard from '@/components/KPICard';
import { PowerMapChart, VerticalDistributionChart } from '@/components/DashboardCharts';
import { NivelBadge, AscensionBadge } from '@/components/StatusBadges';
import { mockAgencies } from '@/lib/mock-data';
import { formatCurrency, formatPercent, getConsolidatedEbitda, getAscensionOpportunity, calcIPE, calcIPP, calcIPC, NIVELES } from '@/lib/quantum-engine';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const stats = useMemo(() => {
    const totalRevenue = mockAgencies.reduce((s, a) => s + a.revenue, 0);
    const totalAGI = mockAgencies.reduce((s, a) => s + a.agi, 0);
    const totalEbitda = mockAgencies.reduce((s, a) => s + a.ebitda, 0);
    const consolidatedEbitda = getConsolidatedEbitda(mockAgencies);
    const byNivel = NIVELES.map(n => ({ nivel: n, count: mockAgencies.filter(a => a.nivel === n).length }));
    return { totalRevenue, totalAGI, totalEbitda, consolidatedEbitda, byNivel };
  }, []);

  const topAgencies = useMemo(() => {
    return [...mockAgencies]
      .sort((a, b) => (b.ebitda * b.equity / 100) - (a.ebitda * a.equity / 100))
      .slice(0, 6);
  }, []);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visión consolidada de Quantum Group</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Agencias"
            value={mockAgencies.length.toString()}
            subtitle={stats.byNivel.map(b => `N${b.nivel}:${b.count}`).join(' · ')}
            icon={Building2}
          />
          <KPICard
            title="Revenue Total"
            value={formatCurrency(stats.totalRevenue)}
            trend={{ value: '+12.5%', positive: true }}
            icon={DollarSign}
          />
          <KPICard
            title="AGI (Margen Bruto)"
            value={formatCurrency(stats.totalAGI)}
            subtitle={formatPercent(stats.totalAGI / stats.totalRevenue * 100)}
            icon={TrendingUp}
          />
          <KPICard
            title="EBITDA Total"
            value={formatCurrency(stats.totalEbitda)}
            icon={PieChart}
            variant="emerald"
          />
          <KPICard
            title="EBITDA Consolidado"
            value={formatCurrency(stats.consolidatedEbitda)}
            subtitle="Ponderado por equity"
            icon={Crown}
            variant="gold"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PowerMapChart />
          <VerticalDistributionChart />
        </div>

        {/* Top Agencies Table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top Agencias por Contribución</h3>
              <p className="text-xs text-muted-foreground">Ranked por EBITDA consolidado</p>
            </div>
            <Link to="/agencies" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Agencia</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Vertical</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Nivel</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Equity</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">EBITDA</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Contrib.</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {topAgencies.map(a => {
                  const ascension = getAscensionOpportunity(a);
                  return (
                    <tr key={a.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${ascension ? 'bg-accent/5' : ''}`}>
                      <td className="py-2.5 px-3">
                        <Link to={`/agencies/${a.id}`} className="text-foreground font-medium hover:text-primary transition-colors">{a.name}</Link>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{a.vertical}</td>
                      <td className="py-2.5 px-3"><NivelBadge nivel={a.nivel} /></td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs">{a.equity > 0 ? `${a.equity}%` : '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-primary">{formatCurrency(a.ebitda)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-accent">{formatCurrency(a.ebitda * a.equity / 100)}</td>
                      <td className="py-2.5 px-3">
                        {ascension && <AscensionBadge type={ascension.type} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
