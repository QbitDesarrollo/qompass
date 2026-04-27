import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { NivelBadge, AscensionBadge, DSCRBadge } from '@/components/StatusBadges';
import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS, NIVELES, Vertical, NivelIntegracion, formatCurrency, formatPercent, getAscensionOpportunity, calcIPE, calcIPP, calcIPC, calcDSCR, isLevel1Eligible } from '@/lib/quantum-engine';
import { Search, Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import PeriodSelector from '@/components/PeriodSelector';
import { Period, currentPeriod, getAllAgencyMetrics, formatPeriod } from '@/lib/historical-data';

type SortKey =
  | 'name' | 'vertical' | 'nivel' | 'country'
  | 'equity' | 'revenue' | 'ebitda' | 'margin'
  | 'operatingCashflow' | 'debtService' | 'dscr'
  | 'ipe' | 'ipp' | 'ipc' | 'status';
type SortDir = 'asc' | 'desc';

export default function AgenciesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVertical, setFilterVertical] = useState<Vertical | 'all'>('all');
  const [filterNivel, setFilterNivel] = useState<NivelIntegracion | 0>(0);
  const [sortKey, setSortKey] = useState<SortKey>('ebitda');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [period, setPeriod] = useState<Period>(() => currentPeriod('month'));

  // Métricas financieras agregadas por agencia para el periodo seleccionado
  const periodMetrics = useMemo(() => getAllAgencyMetrics(period), [period]);

  // Agencias "vista" = base + métricas del periodo (revenue/ebitda/ocf/ds/margin/dscr)
  const viewAgencies = useMemo(() => {
    return mockAgencies.map(a => {
      const m = periodMetrics[a.id];
      if (!m || !m.available) return a;
      return {
        ...a,
        revenue: m.revenue,
        agi: m.agi,
        ebitda: m.ebitda,
        operatingCashflow: m.operatingCashflow,
        debtService: m.debtService,
        margin: m.margin,
      };
    });
  }, [periodMetrics]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Numeric/desc por defecto, texto/asc por defecto
      const textKeys: SortKey[] = ['name', 'vertical', 'country'];
      setSortDir(textKeys.includes(key) ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    const list = viewAgencies.filter(a => {
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterVertical !== 'all' && a.vertical !== filterVertical) return false;
      if (filterNivel !== 0 && a.nivel !== filterNivel) return false;
      return true;
    });

    const getValue = (a: typeof viewAgencies[number]): string | number => {
      switch (sortKey) {
        case 'name': return a.name.toLowerCase();
        case 'vertical': return a.vertical.toLowerCase();
        case 'nivel': return a.nivel;
        case 'country': return a.country.toLowerCase();
        case 'equity': return a.equity;
        case 'revenue': return a.revenue;
        case 'ebitda': return a.ebitda;
        case 'margin': return a.margin;
        case 'operatingCashflow': return a.operatingCashflow;
        case 'debtService': return a.debtService;
        case 'dscr': return calcDSCR(a);
        case 'ipe': return calcIPE(a);
        case 'ipp': return calcIPP(a);
        case 'ipc': return calcIPC(a);
        case 'status': return getAscensionOpportunity(a) ? 0 : 1; // oportunidades primero
      }
    };

    const sorted = [...list].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [viewAgencies, searchQuery, filterVertical, filterNivel, sortKey, sortDir]);

  const SortHeader = ({ label, k, align = 'left' }: { label: string; k: SortKey; align?: 'left' | 'right' }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th className={`py-3 px-4 text-xs font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
        <button
          type="button"
          onClick={() => handleSort(k)}
          className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${active ? 'text-primary' : 'text-muted-foreground'} ${align === 'right' ? 'flex-row-reverse' : ''}`}
        >
          <span>{label}</span>
          <Icon className={`w-3 h-3 ${active ? 'opacity-100' : 'opacity-40'}`} />
        </button>
      </th>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Directorio de Agencias</h1>
            <p className="text-sm text-muted-foreground">
              Sistema Hub-and-Spoke · {mockAgencies.length} Spokes activos · Periodo: <span className="font-mono text-foreground">{formatPeriod(period)}</span>
            </p>
          </div>
          <PeriodSelector period={period} onPeriodChange={setPeriod} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar agencia..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterVertical}
              onChange={e => setFilterVertical(e.target.value as Vertical | 'all')}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas las verticales</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              value={filterNivel}
              onChange={e => setFilterNivel(Number(e.target.value) as NivelIntegracion | 0)}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={0}>Todos los niveles</option>
              {NIVELES.map(n => <option key={n} value={n}>Nivel {n}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <SortHeader label="Agencia" k="name" />
                  <SortHeader label="Vertical" k="vertical" />
                  <SortHeader label="Nivel" k="nivel" />
                  <SortHeader label="País" k="country" />
                  <SortHeader label="Equity" k="equity" align="right" />
                  <SortHeader label="Revenue" k="revenue" align="right" />
                  <SortHeader label="EBITDA" k="ebitda" align="right" />
                  <SortHeader label="Margen" k="margin" align="right" />
                  <SortHeader label="Op. CF" k="operatingCashflow" align="right" />
                  <SortHeader label="Debt Svc" k="debtService" align="right" />
                  <SortHeader label="DSCR" k="dscr" />
                  <SortHeader label="IPE" k="ipe" align="right" />
                  <SortHeader label="IPP" k="ipp" align="right" />
                  <SortHeader label="IPC" k="ipc" align="right" />
                  <SortHeader label="Status" k="status" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const ascension = getAscensionOpportunity(a);
                  const ipe = calcIPE(a);
                  const ipp = calcIPP(a);
                  const ipc = calcIPC(a);
                  const dscr = calcDSCR(a);
                  const eligible = isLevel1Eligible(a);
                  return (
                    <tr key={a.id} className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${ascension ? 'bg-accent/5' : ''}`}>
                      <td className="py-3 px-4">
                        <Link to={`/agencies/${a.id}`} className="text-foreground font-medium hover:text-primary transition-colors">
                          {a.name}
                        </Link>
                        {eligible && <span className="ml-2 text-[9px] text-primary font-mono">N1-ELIGIBLE</span>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{a.vertical}</td>
                      <td className="py-3 px-4"><NivelBadge nivel={a.nivel} /></td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{a.country}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{a.equity > 0 ? `${a.equity}%` : '—'}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{formatCurrency(a.revenue)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-primary">{formatCurrency(a.ebitda)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{formatPercent(a.margin)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{formatCurrency(a.operatingCashflow)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">{formatCurrency(a.debtService)}</td>
                      <td className="py-3 px-4"><DSCRBadge value={dscr} /></td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{ipe.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{ipp.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{ipc.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        {ascension
                          ? <AscensionBadge type={ascension.type} />
                          : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/80 px-2 py-0.5 rounded-md bg-muted/30 border border-border/40">✓ Consolidada</span>}
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
