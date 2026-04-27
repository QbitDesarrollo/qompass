import { useEffect, useState } from 'react';
import { Shield, Play, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, Inbox, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { runSentinel } from '@/lib/agents/sentinel';
import { toast } from '@/hooks/use-toast';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

const SEVERITY_META = {
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', label: 'Crítico' },
  warning:  { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Atención' },
  info:     { icon: Info, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', label: 'Info' },
} as const;

export default function Agents() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  async function load() {
    const [agentsRes, alertsRes] = await Promise.all([
      supabase.from('agents').select('*').order('created_at'),
      supabase.from('agent_alerts').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (agentsRes.data) setAgents(agentsRes.data as AgentRow[]);
    if (alertsRes.data) setAlerts(alertsRes.data as AlertRow[]);
  }

  useEffect(() => { load(); }, []);

  async function handleRun(agent: AgentRow) {
    if (agent.slug !== 'sentinel') {
      toast({ title: 'Próximamente', description: `${agent.name} aún no está implementado.` });
      return;
    }
    setRunning(agent.id);
    try {
      const res = await runSentinel();
      toast({
        title: `${agent.name} ejecutado`,
        description: `${res.alertsCreated} alertas en ${res.durationMs}ms`,
      });
      await load();
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

  const visibleAlerts = filter === 'open' ? alerts.filter(a => a.status === 'open') : alerts;
  const criticalCount = alerts.filter(a => a.status === 'open' && a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.status === 'open' && a.severity === 'warning').length;

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
        <div>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Catálogo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map(a => (
              <AgentCard
                key={a.id}
                agent={a}
                running={running === a.id}
                onRun={() => handleRun(a)}
              />
            ))}
            {/* Próximos agentes (placeholders del roadmap) */}
            {ROADMAP_AGENTS.map(a => (
              <Card key={a.slug} className="p-4 border-dashed border-border bg-secondary/20 opacity-70">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                    <span className="text-base">{a.emoji}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{a.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.category}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{a.description}</p>
                <Badge variant="outline" className="text-[10px]">Próximamente</Badge>
              </Card>
            ))}
          </div>
        </div>

        {/* Inbox de alertas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5" /> Inbox de alertas
            </h2>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={filter === 'open' ? 'default' : 'outline'}
                onClick={() => setFilter('open')}
                className="h-7 text-xs"
              >
                Abiertas
              </Button>
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className="h-7 text-xs"
              >
                Todas
              </Button>
            </div>
          </div>

          {visibleAlerts.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-primary/60" />
              No hay alertas {filter === 'open' ? 'abiertas' : ''}. Ejecuta un agente para generar nuevas.
            </Card>
          ) : (
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
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function AgentCard({ agent, running, onRun }: { agent: AgentRow; running: boolean; onRun: () => void }) {
  return (
    <Card className="p-4 border-border hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{agent.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{agent.category}</div>
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

const ROADMAP_AGENTS = [
  { slug: 'capital-allocator', name: 'Capital Allocator', emoji: '🎯', category: 'crecimiento',
    description: 'Propone semanalmente a qué agencia inyectar el próximo dólar de capital y por qué.' },
  { slug: 'ascension-coach', name: 'Ascension Coach', emoji: '🚀', category: 'crecimiento',
    description: 'Genera roadmap específico para cada agencia lista para subir de nivel (N4→N3, N3→N2, N2→N1).' },
  { slug: 'deal-scout', name: 'Deal Scout', emoji: '🔭', category: 'm&a',
    description: 'Escanea el mercado buscando targets de M&A que cumplan la tesis del grupo.' },
  { slug: 'board-reporter', name: 'Board Reporter', emoji: '📑', category: 'governance',
    description: 'Genera el board pack mensual con highlights, lowlights, KPIs y decisiones requeridas.' },
  { slug: 'forecaster', name: 'Forecaster', emoji: '🔮', category: 'planning',
    description: 'Reentrena proyecciones cada mes con actuales y marca dónde el plan ya no es creíble.' },
];