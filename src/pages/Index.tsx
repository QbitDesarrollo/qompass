import { useMemo } from 'react';
import { Building2, DollarSign, TrendingUp, PieChart, Crown, Wallet, Banknote, ShieldCheck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import KPICard from '@/components/KPICard';
import { PowerMapChart, VerticalDistributionChart } from '@/components/DashboardCharts';
import { NivelBadge, AscensionBadge, DSCRBadge } from '@/components/StatusBadges';
import { mockAgencies } from '@/lib/mock-data';
import { formatCurrency, formatPercent, getConsolidatedEbitda, getAscensionOpportunity, calcIPE, calcIPP, calcIPC, calcDSCR, getDSCRStatus, NIVELES } from '@/lib/quantum-engine';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const stats = useMemo(() => {
    const totalRevenue = mockAgencies.reduce((s, a) => s + a.revenue, 0);
    const totalAGI = mockAgencies.reduce((s, a) => s + a.agi, 0);
    const totalEbitda = mockAgencies.reduce((s, a) => s + a.ebitda, 0);
    const consolidatedEbitda = getConsolidatedEbitda(mockAgencies);
    const byNivel = NIVELES.map(n => ({ nivel: n, count: mockAgencies.filter(a => a.nivel === n).length }));
    const totalOCF = mockAgencies.reduce((s, a) => s + a.operatingCashflow, 0);
    const totalDS = mockAgencies.reduce((s, a) => s + a.debtService, 0);
    const groupDSCR = totalDS > 0 ? totalOCF / totalDS : Infinity;
    const dscrBuckets = mockAgencies.reduce((acc, a) => {
      const st = getDSCRStatus(calcDSCR(a));
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalRevenue, totalAGI, totalEbitda, consolidatedEbitda, byNivel, totalOCF, totalDS, groupDSCR, dscrBuckets };
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

        {/* Cash & Debt KPIs */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Cash & Debt — Salud Financiera</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Operating Cashflow"
              value={formatCurrency(stats.totalOCF)}
              subtitle="Flujo operativo anual consolidado"
              icon={Wallet}
              variant="emerald"
            />
            <KPICard
              title="Debt Service"
              value={formatCurrency(stats.totalDS)}
              subtitle="Obligaciones de deuda anuales"
              icon={Banknote}
            />
            <div className={`glass-card p-5 border-accent/30 animate-float-up`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DSCR del Grupo</span>
                <div className="p-2 rounded-lg bg-accent/10">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold font-mono tracking-tight text-accent">{stats.groupDSCR.toFixed(2)}x</p>
                <DSCRBadge value={stats.groupDSCR} showValue={false} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-muted-foreground">
                <span>Operating CF / Debt Service</span>
                <span className="ml-auto font-mono">
                  ✓{stats.dscrBuckets.excelente || 0} · ✓{stats.dscrBuckets.bueno || 0} · ⚠{stats.dscrBuckets.aceptable || 0} · ✗{stats.dscrBuckets.riesgo || 0}
                </span>
              </div>
            </div>
          </div>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <DSCRBadge value={calcDSCR(a)} />
                          {ascension && <AscensionBadge type={ascension.type} />}
                        </div>
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
