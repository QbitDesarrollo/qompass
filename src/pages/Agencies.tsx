import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { NivelBadge, AscensionBadge } from '@/components/StatusBadges';
import { mockAgencies } from '@/lib/mock-data';
import { VERTICALS, NIVELES, Vertical, NivelIntegracion, formatCurrency, formatPercent, getAscensionOpportunity, calcIPE, calcIPP, calcIPC, isLevel1Eligible } from '@/lib/quantum-engine';
import { Search, Filter } from 'lucide-react';

export default function AgenciesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVertical, setFilterVertical] = useState<Vertical | 'all'>('all');
  const [filterNivel, setFilterNivel] = useState<NivelIntegracion | 0>(0);

  const filtered = useMemo(() => {
    return mockAgencies.filter(a => {
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterVertical !== 'all' && a.vertical !== filterVertical) return false;
      if (filterNivel !== 0 && a.nivel !== filterNivel) return false;
      return true;
    });
  }, [searchQuery, filterVertical, filterNivel]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Directorio de Agencias</h1>
          <p className="text-sm text-muted-foreground">Sistema Hub-and-Spoke · {mockAgencies.length} Spokes activos</p>
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
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Agencia</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Vertical</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Nivel</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">País</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Equity</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">EBITDA</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Margen</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">IPE</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">IPP</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">IPC</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const ascension = getAscensionOpportunity(a);
                  const ipe = calcIPE(a);
                  const ipp = calcIPP(a);
                  const ipc = calcIPC(a);
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
                      <td className="py-3 px-4 text-right font-mono text-xs">{ipe.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{ipp.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-xs">{ipc.toFixed(2)}</td>
                      <td className="py-3 px-4">
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
