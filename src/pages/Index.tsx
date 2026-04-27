import { useMemo } from 'react';
import { Building2, DollarSign, TrendingUp, PieChart, Crown, Wallet, Banknote, ShieldCheck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import KPICard from '@/components/KPICard';
import { PowerMapChart, VerticalDistributionChart } from '@/components/DashboardCharts';
import { NivelBadge, AscensionBadge, DSCRBadge } from '@/components/StatusBadges';
import CapitalPriorityWidget from '@/components/CapitalPriorityWidget';
import InfoTooltip from '@/components/InfoTooltip';
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
    const ebitdaMargin = totalRevenue > 0 ? (totalEbitda / totalRevenue) * 100 : 0;
    const consolidatedEbitdaMargin = totalRevenue > 0 ? (consolidatedEbitda / totalRevenue) * 100 : 0;
    const dsOverOcf = totalOCF > 0 ? (totalDS / totalOCF) * 100 : 0;
    const dscrBuckets = mockAgencies.reduce((acc, a) => {
      const st = getDSCRStatus(calcDSCR(a));
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalRevenue, totalAGI, totalEbitda, consolidatedEbitda, byNivel, totalOCF, totalDS, groupDSCR, dscrBuckets, ebitdaMargin, consolidatedEbitdaMargin, dsOverOcf };
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
            info={
              <>
                <div className="font-semibold text-foreground">Spokes activos en el modelo Hub-and-Spoke</div>
                <div className="text-muted-foreground">Distribución por nivel de integración (N1 a N4):</div>
                <ul className="list-disc pl-4 text-foreground/90">
                  <li><b>N1</b> Subsidiaria Majority (control mayoritario)</li>
                  <li><b>N2</b> Participación Minoritaria estratégica</li>
                  <li><b>N3</b> Partner Estratégico</li>
                  <li><b>N4</b> Operador Certificado</li>
                </ul>
              </>
            }
          />
          <KPICard
            title="Revenue Total"
            value={formatCurrency(stats.totalRevenue)}
            trend={{ value: '+12.5%', positive: true }}
            icon={DollarSign}
            info={
              <>
                <div className="font-semibold text-foreground">Revenue agregado del grupo</div>
                <div className="text-muted-foreground">Suma de los ingresos anuales de todas las agencias spoke (100% del top-line de cada una, sin ponderar por equity).</div>
                <div className="font-mono text-[10px]">Σ revenue<sub>i</sub></div>
              </>
            }
          />
          <KPICard
            title="AGI (Margen Bruto)"
            value={formatCurrency(stats.totalAGI)}
            subtitle={formatPercent(stats.totalAGI / stats.totalRevenue * 100)}
            icon={TrendingUp}
            info={
              <>
                <div className="font-semibold text-foreground">Adjusted Gross Income</div>
                <div className="text-muted-foreground">Margen bruto consolidado: revenue menos costos directos (media buys, producción, pass-through). Mide el negocio "real" del grupo.</div>
                <div className="font-mono text-[10px]">AGI / Revenue · {formatPercent(stats.totalAGI / stats.totalRevenue * 100)}</div>
              </>
            }
          />
          <KPICard
            title="EBITDA Total"
            value={formatCurrency(stats.totalEbitda)}
            subtitle={`${formatPercent(stats.ebitdaMargin)} del Revenue`}
            icon={PieChart}
            variant="emerald"
            info={
              <>
                <div className="font-semibold text-primary">EBITDA agregado (sin ponderar por equity)</div>
                <div className="text-muted-foreground">Suma del EBITDA de las agencias al 100%. Muestra la rentabilidad operativa total del ecosistema.</div>
                <div className="font-mono text-[10px] text-foreground">Margen EBITDA = EBITDA / Revenue = {formatPercent(stats.ebitdaMargin)}</div>
                <div className="text-[10px] text-muted-foreground">Benchmark sano en agencias: 15–25%.</div>
              </>
            }
          />
          <KPICard
            title="EBITDA Consolidado"
            value={formatCurrency(stats.consolidatedEbitda)}
            subtitle={`Ponderado por equity · ${formatPercent(stats.consolidatedEbitdaMargin)} del Revenue`}
            icon={Crown}
            variant="gold"
            info={
              <>
                <div className="font-semibold text-accent">EBITDA atribuible al grupo</div>
                <div className="text-muted-foreground">Suma del EBITDA de cada agencia ponderado por el % de equity que el grupo controla. Es el EBITDA "real" para valoración.</div>
                <div className="font-mono text-[10px] text-foreground">Σ (EBITDA<sub>i</sub> × equity<sub>i</sub> / 100)</div>
                <div className="text-[10px] text-muted-foreground">Margen consolidado: {formatPercent(stats.consolidatedEbitdaMargin)} del Revenue total.</div>
              </>
            }
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
              info={
                <>
                  <div className="font-semibold text-primary">Operating Cashflow (OCF)</div>
                  <div className="text-muted-foreground">Caja generada por la operación antes de inversiones y financiamiento. Es lo que realmente sirve para pagar deuda.</div>
                  <div className="font-mono text-[10px] text-foreground">OCF = EBITDA − Δ working capital − impuestos pagados</div>
                </>
              }
            />
            <KPICard
              title="Debt Service"
              value={formatCurrency(stats.totalDS)}
              subtitle={`${formatPercent(stats.dsOverOcf)} del Op. Cashflow`}
              icon={Banknote}
              info={
                <>
                  <div className="font-semibold text-foreground">Debt Service consolidado</div>
                  <div className="text-muted-foreground">Suma anual de pagos de deuda (capital + intereses) de todas las agencias.</div>
                  <div className="font-mono text-[10px] text-foreground">Debt Svc / OCF = {formatPercent(stats.dsOverOcf)}</div>
                  <ul className="list-disc pl-4 text-[10px] text-muted-foreground">
                    <li>&lt; 50% → holgado, hay headroom</li>
                    <li>50–66% → sano (DSCR ~1.5x)</li>
                    <li>66–80% → ajustado (DSCR ~1.25x)</li>
                    <li>&gt; 80% → riesgo (DSCR &lt; 1.25x)</li>
                  </ul>
                </>
              }
            />
            <div className={`glass-card p-5 border-accent/30 animate-float-up`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DSCR del Grupo</span>
                  <InfoTooltip>
                    <div className="font-semibold text-accent">Debt Service Coverage Ratio</div>
                    <div className="text-muted-foreground">Mide cuántas veces el cashflow operativo cubre el servicio de deuda. Es el ratio bancario universal de salud crediticia.</div>
                    <div className="font-mono text-[10px] text-foreground">DSCR = Operating Cashflow / Debt Service</div>
                    <ul className="list-disc pl-4 text-[10px] text-muted-foreground">
                      <li><b>≥ 2.00x</b> Excelente — capacidad amplia</li>
                      <li><b>1.50–2.00x</b> Bueno — objetivo estándar</li>
                      <li><b>1.25–1.50x</b> Aceptable — ajustado</li>
                      <li><b>&lt; 1.25x</b> Riesgo — no soporta más deuda</li>
                    </ul>
                    <div className="text-[10px] text-muted-foreground">Distribución actual del set debajo del valor.</div>
                  </InfoTooltip>
                </div>
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

        {/* Capital Priority — compact */}
        <CapitalPriorityWidget variant="compact" />


        {/* Top Agencies Table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground">Top Agencias por Contribución</h3>
                <InfoTooltip>
                  <div className="font-semibold text-foreground">Ranking por EBITDA Consolidado</div>
                  <div className="text-muted-foreground">Las 6 agencias que más aportan al EBITDA del grupo, ponderado por % de equity.</div>
                  <div className="font-mono text-[10px] text-foreground">Contribución = EBITDA × equity / 100</div>
                  <ul className="list-disc pl-4 text-[10px] text-muted-foreground">
                    <li><b>DSCR</b>: capacidad para cubrir deuda</li>
                    <li><b>Ascenso</b>: oportunidad de subir de nivel (IPE/IPP/IPC sobre umbral)</li>
                  </ul>
                </InfoTooltip>
              </div>
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
