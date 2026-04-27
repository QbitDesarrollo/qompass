import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Shield, Play, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, Inbox, Clock,
  Sparkles, Target, Rocket, FileText, Binoculars, FileStack, X, Pin,
  Radar, LineChart, GitMerge, ClipboardCheck, Calculator, Bot, Mail,
  CalendarClock, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { runSentinel } from '@/lib/agents/sentinel';
import { runCapitalAllocator } from '@/lib/agents/capital-allocator';
import { runAscensionCoach } from '@/lib/agents/ascension-coach';
import { runBoardReporter } from '@/lib/agents/board-reporter';
import { runDealScout } from '@/lib/agents/deal-scout';
import { runRiskRadar } from '@/lib/agents/risk-radar';
import { runForecaster } from '@/lib/agents/forecaster';
import { runSynergyHunter } from '@/lib/agents/synergy-hunter';
import { runDDCoordinator } from '@/lib/agents/dd-coordinator';
import { runValuationAgent } from '@/lib/agents/valuation-agent';
import { runAgencyCopilot } from '@/lib/agents/agency-copilot';
import { runStakeholderComms } from '@/lib/agents/stakeholder-comms';
import { mockAgencies } from '@/lib/mock-data';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  schedule: string | null;
  cron_expression: string | null;
  next_run_at: string | null;
  enabled: boolean;
  last_run_at: string | null;
}

interface AlertRow {
  id: string;
  agent_id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  metric: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
}

interface OutputRow {
  id: string;
  agent_id: string;
  kind: string;
  title: string;
  content_md: string;
  pinned: boolean;
  created_at: string;
}

const SEVERITY_META = {
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Crítico' },
  warning:  { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Atención' },
  info:     { icon: Info, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Info' },
} as const;

const ICON_BY_SLUG: Record<string, React.ComponentType<{ className?: string }>> = {
  sentinel: Shield,
  'capital-allocator': Target,
  'ascension-coach': Rocket,
  'board-reporter': FileText,
  'deal-scout': Binoculars,
  'risk-radar': Radar,
  forecaster: LineChart,
  'synergy-hunter': GitMerge,
  'dd-coordinator': ClipboardCheck,
  'valuation-agent': Calculator,
  'agency-copilot': Bot,
  'stakeholder-comms': Mail,
};

type RunnerResult = { alertsCreated: number; durationMs: number; outputId?: string };
const RUNNERS: Record<string, () => Promise<RunnerResult>> = {
  sentinel: runSentinel,
  'capital-allocator': runCapitalAllocator,
  'ascension-coach': runAscensionCoach,
  'board-reporter': runBoardReporter,
  'deal-scout': runDealScout,
  'risk-radar': runRiskRadar,
  forecaster: runForecaster,
  'synergy-hunter': runSynergyHunter,
  'dd-coordinator': runDDCoordinator,
  'valuation-agent': runValuationAgent,
  'stakeholder-comms': runStakeholderComms,
};

// Agentes que requieren parámetro (manejados aparte)
const PARAMETRIC_RUNNERS: Record<string, (param: string) => Promise<RunnerResult>> = {
  'agency-copilot': runAgencyCopilot,
};

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  vigilancia_diagnostico:  { label: '1. Vigilancia & Diagnóstico',     order: 1 },
  crecimiento_capital:     { label: '2. Crecimiento & Capital',         order: 2 },
  mna:                     { label: '3. M&A',                           order: 3 },
  operativos_agencia:      { label: '4. Operativos por Agencia',        order: 4 },
  forecasting_simulacion:  { label: '5. Forecasting & Simulación',      order: 5 },
  comunicacion_governance: { label: '6. Comunicación & Governance',     order: 6 },
};

export default function Agents() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [outputs, setOutputs] = useState<OutputRow[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<OutputRow | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [tab, setTab] = useState<'alerts' | 'outputs'>('alerts');
  const [copilotAgencyId, setCopilotAgencyId] = useState<string>(mockAgencies[0]?.id || '');

  async function load() {
    const [agentsRes, alertsRes, outputsRes] = await Promise.all([
      supabase.from('agents').select('*').order('created_at'),
      supabase.from('agent_alerts').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('agent_outputs').select('id,agent_id,kind,title,content_md,pinned,created_at').order('created_at', { ascending: false }).limit(50),
    ]);
    if (agentsRes.data) setAgents(agentsRes.data as AgentRow[]);
    if (alertsRes.data) setAlerts(alertsRes.data as AlertRow[]);
    if (outputsRes.data) setOutputs(outputsRes.data as OutputRow[]);
  }

  useEffect(() => { load(); }, []);

  async function handleRun(agent: AgentRow) {
    const runner = RUNNERS[agent.slug];
    const paramRunner = PARAMETRIC_RUNNERS[agent.slug];
    if (!runner && !paramRunner) {
      toast({ title: 'Próximamente', description: `${agent.name} aún no está implementado.` });
      return;
    }
    setRunning(agent.id);
    try {
      const res = paramRunner ? await paramRunner(copilotAgencyId) : await runner!();
      toast({
        title: `${agent.name} ejecutado`,
        description: res.alertsCreated > 0
          ? `${res.alertsCreated} alertas en ${(res.durationMs / 1000).toFixed(1)}s`
          : `Reporte generado en ${(res.durationMs / 1000).toFixed(1)}s`,
      });
      await load();
      // Si generó un output, ábrelo
      if (res.outputId) {
        const { data } = await supabase.from('agent_outputs').select('*').eq('id', res.outputId).single();
        if (data) {
          setSelectedOutput(data as OutputRow);
          setTab('outputs');
        }
      } else if (res.alertsCreated > 0) {
        setTab('alerts');
      }
    } catch (e) {
      toast({
        title: 'Error ejecutando agente',
        description: e instanceof Error ? e.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setRunning(null);
    }
  }

  async function updateAlert(id: string, status: 'resolved' | 'dismissed') {
    await supabase.from('agent_alerts').update({ status }).eq('id', id);
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
  }

  async function togglePin(o: OutputRow) {
    const next = !o.pinned;
    await supabase.from('agent_outputs').update({ pinned: next }).eq('id', o.id);
    setOutputs(prev => prev.map(x => (x.id === o.id ? { ...x, pinned: next } : x)));
  }

  async function deleteOutput(id: string) {
    await supabase.from('agent_outputs').delete().eq('id', id);
    setOutputs(prev => prev.filter(x => x.id !== id));
    if (selectedOutput?.id === id) setSelectedOutput(null);
  }

  const visibleAlerts = filter === 'open' ? alerts.filter(a => a.status === 'open') : alerts;
  const criticalCount = alerts.filter(a => a.status === 'open' && a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.status === 'open' && a.severity === 'warning').length;

  // Agrupar agentes por categoría
  const grouped = Object.keys(CATEGORY_META)
    .map(catKey => ({
      key: catKey,
      meta: CATEGORY_META[catKey],
      agents: agents.filter(a => a.category === catKey),
    }))
    .filter(g => g.agents.length > 0)
    .sort((a, b) => a.meta.order - b.meta.order);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Agentes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Agentes autónomos que vigilan, analizan y proponen acciones sobre el portafolio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-destructive/40 text-destructive">
              <AlertCircle className="w-3 h-3" /> {criticalCount} críticas
            </Badge>
            <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-500">
              <AlertTriangle className="w-3 h-3" /> {warningCount} warning
            </Badge>
          </div>
        </div>

        {/* Catálogo de agentes */}
        <div className="space-y-5">
          {grouped.map(group => (
            <div key={group.key}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  {group.meta.label}
                </h2>
                {group.key === 'operativos_agencia' && (
                  <Select value={copilotAgencyId} onValueChange={setCopilotAgencyId}>
                    <SelectTrigger className="h-7 text-xs w-56">
                      <SelectValue placeholder="Agencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockAgencies.map(a => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.name} <span className="text-muted-foreground ml-1">· N{a.nivel}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.agents.map(a => (
                  <AgentCard
                    key={a.id}
                    agent={a}
                    running={running === a.id}
                    onRun={() => handleRun(a)}
                    parametric={!!PARAMETRIC_RUNNERS[a.slug]}
                    paramLabel={PARAMETRIC_RUNNERS[a.slug] ? mockAgencies.find(x => x.id === copilotAgencyId)?.name : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Alertas / Outputs */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1">
              <Button size="sm" variant={tab === 'alerts' ? 'default' : 'outline'}
                onClick={() => setTab('alerts')} className="h-7 text-xs gap-1.5">
                <Inbox className="w-3.5 h-3.5" /> Alertas ({alerts.filter(a => a.status === 'open').length})
              </Button>
              <Button size="sm" variant={tab === 'outputs' ? 'default' : 'outline'}
                onClick={() => setTab('outputs')} className="h-7 text-xs gap-1.5">
                <FileStack className="w-3.5 h-3.5" /> Reports ({outputs.length})
              </Button>
            </div>
            {tab === 'alerts' && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant={filter === 'open' ? 'default' : 'outline'}
                  onClick={() => setFilter('open')} className="h-7 text-xs">Abiertas</Button>
                <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')} className="h-7 text-xs">Todas</Button>
              </div>
            )}
          </div>

          {tab === 'alerts' && visibleAlerts.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary/60" />
              No hay alertas {filter === 'open' ? 'abiertas' : ''}. Ejecuta un agente para generar nuevas.
            </Card>
          ) : tab === 'alerts' ? (
            <div className="space-y-2">
              {visibleAlerts.map(alert => {
                const meta = SEVERITY_META[alert.severity];
                const Icon = meta.icon;
                return (
                  <Card key={alert.id} className={`p-3 border ${meta.border} ${alert.status !== 'open' ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-md ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{alert.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${meta.color} ${meta.border}`}>
                            {meta.label}
                          </Badge>
                          {alert.status !== 'open' && (
                            <Badge variant="secondary" className="text-[10px]">{alert.status}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.body}</p>
                        <div className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                        </div>
                      </div>
                      {alert.status === 'open' && (
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                            onClick={() => updateAlert(alert.id, 'resolved')}>
                            Resolver
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground"
                            onClick={() => updateAlert(alert.id, 'dismissed')}>
                            Descartar
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : outputs.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              <FileStack className="w-8 h-8 mx-auto mb-2 text-primary/60" />
              Aún no hay reports. Ejecuta Capital Allocator, Ascension Coach, Board Reporter o Deal Scout.
            </Card>
          ) : (
            <div className="space-y-2">
              {outputs.map(o => {
                const agent = agents.find(a => a.id === o.agent_id);
                const Icon = (agent && ICON_BY_SLUG[agent.slug]) || FileStack;
                return (
                  <Card key={o.id} className="p-3 border-border hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedOutput(o)}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{o.title}</span>
                          {o.pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          <Badge variant="secondary" className="text-[10px]">{agent?.name || 'Agente'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {o.content_md.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2).join(' ')}
                        </p>
                        <div className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: es })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                          onClick={() => togglePin(o)}>
                          {o.pinned ? 'Unpin' : 'Pin'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground"
                          onClick={() => deleteOutput(o.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Output viewer modal */}
        <Dialog open={!!selectedOutput} onOpenChange={(o) => !o && setSelectedOutput(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{selectedOutput?.title}</DialogTitle>
            </DialogHeader>
            {selectedOutput && (
              <div className="prose prose-sm prose-invert max-w-none [&_table]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm">
                <ReactMarkdown>{selectedOutput.content_md}</ReactMarkdown>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function AgentCard({ agent, running, onRun, parametric, paramLabel }: {
  agent: AgentRow; running: boolean; onRun: () => void;
  parametric?: boolean; paramLabel?: string;
}) {
  const Icon = ICON_BY_SLUG[agent.slug] || Sparkles;
  return (
    <Card className="p-4 border-border hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{agent.name}</div>
          {parametric && paramLabel ? (
            <div className="text-[10px] uppercase tracking-wider text-primary/80">→ {paramLabel}</div>
          ) : (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{agent.category.replace(/_/g, ' ')}</div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] text-muted-foreground">
          {agent.last_run_at
            ? `Última corrida: ${formatDistanceToNow(new Date(agent.last_run_at), { addSuffix: true, locale: es })}`
            : 'Nunca ejecutado'}
        </div>
        <Button size="sm" onClick={onRun} disabled={running} className="h-7 text-xs gap-1.5">
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          {running ? 'Corriendo' : 'Ejecutar'}
        </Button>
      </div>
    </Card>
  );
}