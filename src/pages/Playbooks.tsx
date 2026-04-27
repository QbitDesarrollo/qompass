import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { mockAgencies } from '@/lib/mock-data';
import {
  computeCapitalPriorities,
  formatCurrency,
  calcDSCR,
  getAscensionOpportunity,
  NIVEL_LABELS,
} from '@/lib/quantum-engine';
import {
  PLAYBOOKS,
  Playbook,
  PlaybookPillar,
  getPlaybookEligibility,
  recommendPlaybooks,
} from '@/lib/playbooks-data';
import { BookOpen, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Layers, Zap, Target, Info } from 'lucide-react';

const PILLAR_TONE: Record<string, string> = {
  'Equity':       'bg-primary/15 text-primary border-primary/30',
  'Deuda':        'bg-accent/15 text-accent border-accent/30',
  'Subvenciones': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'No Monetario': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Bootstrap':    'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
};

function PillarBadge({ p }: { p: PlaybookPillar | string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border ${PILLAR_TONE[p] ?? 'bg-secondary/40 text-muted-foreground border-border'}`}>
      {p}
    </span>
  );
}

function PlaybookCard({ pb, recommended, active, onClick }: { pb: Playbook; recommended?: boolean; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left glass-card p-4 transition-all hover:border-primary/40 ${
        active ? 'border-primary/60 ring-1 ring-primary/40' : ''
      } ${recommended ? 'bg-primary/[0.03]' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono flex items-center justify-center shrink-0">
            {pb.number}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{pb.shortTitle}</h4>
            <p className="text-[10px] text-muted-foreground truncate">{pb.thesis}</p>
          </div>
        </div>
        {recommended && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 shrink-0">
            <Sparkles className="w-2.5 h-2.5" /> Recomendado
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {pb.pillarsMix.map(pl => <PillarBadge key={pl} p={pl} />)}
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">{pb.phase}</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">{pb.tactics.length} tácticas</span>
      </div>
    </button>
  );
}

function PlaybookDetail({ pb }: { pb: Playbook }) {
  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Combinación #{pb.number}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">{pb.phase}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">{pb.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{pb.thesis}</p>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Target className="w-3 h-3" /> Mejor para
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {pb.bestFor.map(b => (
            <span key={b} className="text-[11px] px-2 py-1 rounded-md bg-secondary/40 border border-border text-foreground">{b}</span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Tácticas que componen el playbook
        </h3>
        <div className="space-y-1.5">
          {pb.tactics.map(t => (
            <div key={t.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg bg-secondary/30 border border-border/40">
              <span className="col-span-1 text-[10px] font-mono text-muted-foreground">#{t.id}</span>
              <span className="col-span-4 text-sm font-medium text-foreground truncate">{t.name}</span>
              <span className="col-span-2"><PillarBadge p={t.pillar} /></span>
              <span className="col-span-2 text-[10px] font-mono text-accent">{t.contribution}</span>
              <span className="col-span-3 text-[11px] text-muted-foreground truncate" title={t.description}>{t.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Ingeniería de la operación
          </h3>
          <ol className="space-y-1.5 list-decimal pl-5 text-sm text-foreground/90">
            {pb.steps.map(s => <li key={s}>{s}</li>)}
          </ol>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Riesgos clave
          </h3>
          <ul className="space-y-1.5 list-disc pl-5 text-sm text-foreground/90">
            {pb.risks.map(r => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Playbooks() {
  const params = useParams<{ agencyId?: string }>();
  const agency = useMemo(
    () => params.agencyId ? mockAgencies.find(a => a.id === params.agencyId) : undefined,
    [params.agencyId],
  );

  const priority = useMemo(() => {
    if (!agency) return null;
    const all = computeCapitalPriorities(mockAgencies);
    return all.find(p => p.agency.id === agency.id) ?? null;
  }, [agency]);

  const eligibility = priority ? getPlaybookEligibility(priority, agency) : null;
  const recommended = priority ? recommendPlaybooks(priority, agency).slice(0, 4) : [];
  const recommendedIds = new Set(recommended.map(r => r.id));

  const [selectedId, setSelectedId] = useState<string>(recommended[0]?.id ?? PLAYBOOKS[0].id);
  const selected = PLAYBOOKS.find(pb => pb.id === selectedId) ?? PLAYBOOKS[0];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Playbooks</h1>
              <p className="text-sm text-muted-foreground">
                15 combinaciones estratégicas Zero Cash Down · Scalable Financing
              </p>
            </div>
          </div>
          {agency && (
            <Link to="/war-room" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              ← Volver al War Room
            </Link>
          )}
        </div>

        {agency && priority && eligibility && (
          <div className={`glass-card p-5 ${eligibility.eligible ? 'border-primary/40 bg-primary/[0.03]' : 'border-yellow-500/30 bg-yellow-500/[0.03]'}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ejecutando para</span>
                  {eligibility.eligible ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                      <CheckCircle2 className="w-3 h-3" /> Elegible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                      <AlertTriangle className="w-3 h-3" /> Revisar criterios
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-foreground">{agency.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {agency.vertical} · {NIVEL_LABELS[agency.nivel]} · Equity {agency.equity}%
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <Metric label="Score" value={priority.score.toFixed(0)} ok={eligibility.score} hint="≥ 70" />
                <Metric label="Cuadrante" value={priority.action.label} ok={eligibility.quadrant} hint="Inyectar Capital" />
                <Metric label="Ascenso" value={getAscensionOpportunity(agency)?.type ?? '—'} ok={eligibility.ascension} hint="Consolidado" />
                <Metric label="DSCR" value={`${calcDSCR(agency).toFixed(2)}x`} ok={eligibility.dscr} hint="≥ 2.0x" />
              </div>
            </div>
            {!eligibility.eligible && (
              <div className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Falta cumplir: {eligibility.reasons.join(' · ')}. Igual puedes explorar los playbooks abajo.
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2 max-h-[80vh] overflow-y-auto pr-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {agency ? 'Playbooks (recomendados primero)' : 'Las 15 combinaciones'}
            </h3>
            {(agency ? recommendPlaybooks(priority!, agency) : PLAYBOOKS).map(pb => (
              <PlaybookCard
                key={pb.id}
                pb={pb}
                recommended={recommendedIds.has(pb.id)}
                active={selectedId === pb.id}
                onClick={() => setSelectedId(pb.id)}
              />
            ))}
          </div>
          <div className="lg:col-span-2">
            <PlaybookDetail pb={selected} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Metric({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint: string }) {
  return (
    <div className={`px-3 py-2 rounded-md border ${ok ? 'border-primary/30 bg-primary/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>{label}</span>
        {ok ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <AlertTriangle className="w-3 h-3 text-yellow-400" />}
      </div>
      <div className={`text-sm font-bold font-mono ${ok ? 'text-foreground' : 'text-yellow-400'}`}>{value}</div>
      <div className="text-[9px] text-muted-foreground">{hint}</div>
    </div>
  );
}