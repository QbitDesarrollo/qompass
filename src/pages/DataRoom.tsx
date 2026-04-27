import AppLayout from '@/components/AppLayout';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, FileBarChart2, UserSquare2, TrendingUp, Cog,
  Target, Scale, Cpu, AlertTriangle, Map,
  CheckCircle2, FileText, ShieldCheck, Quote, ChevronRight, Sparkles,
  CloudOff, FolderOpen, ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { mockAgencies } from '@/lib/mock-data';
import { Agency, NIVEL_LABELS, formatCurrency } from '@/lib/quantum-engine';
import { NivelBadge, VerticalBadge } from '@/components/StatusBadges';
import DataRoomFolderDialog from '@/components/DataRoomFolderDialog';
import { summarizeSection, mockLastSync } from '@/lib/data-room-data';

// 12 secciones del documento QG-DR-02
const SECTIONS = [
  { id: 1,  icon: Building2,     title: 'Información Corporativa',   summary: 'Acta constitutiva, reformas, libro de accionistas, actas de Junta, organigrama, manuales operativos, políticas internas.', principle: 'Debe reflejar profesionalización.' },
  { id: 2,  icon: Users,         title: 'Estructura Accionaria',     summary: 'Cap table actualizado, participación del holding, pactos de accionistas, ESOP, derechos de arrastre/acompañamiento.', principle: 'Debe estar limpio y sin conflictos.' },
  { id: 3,  icon: FileBarChart2, title: 'Estados Financieros',       summary: 'Últimos 3–5 años: balance, P&L, flujo de caja, EBITDA normalizado, ajustes no recurrentes. Separar gastos intercompany.', principle: 'Trazabilidad total con auditoría externa.' },
  { id: 4,  icon: TrendingUp,    title: 'Ingresos y Clientes',       summary: 'Facturación mensual histórica, top 20 clientes, concentración, duración de contratos, retención y churn.', principle: 'Debe evidenciar estabilidad.' },
  { id: 5,  icon: Sparkles,      title: 'EBITDA y Márgenes',         summary: 'Margen bruto, margen EBITDA, evolución trimestral, impacto de sinergias capturadas post-integración.', principle: 'Mostrar mejora post integración.' },
  { id: 6,  icon: Cog,           title: 'Operaciones',               summary: 'Procesos documentados, KPIs operativos, capacidad instalada, utilización de recursos, dependencia del fundador.', principle: 'Debe demostrar escalabilidad.' },
  { id: 7,  icon: UserSquare2,   title: 'Talento Clave',             summary: 'Equipo directivo, contratos clave, permanencia promedio, plan de sucesión, esquema de incentivos.', principle: 'Reducir riesgo persona-dependiente.' },
  { id: 8,  icon: Target,        title: 'Comercial y Pipeline',      summary: 'Pipeline actual, valor ponderado, tasa de cierre histórica, estrategia de adquisición, dependencia del holding.', principle: 'Debe mostrar crecimiento sostenible.' },
  { id: 9,  icon: Scale,         title: 'Legal y Contratos',         summary: 'Contratos con clientes, proveedores críticos, litigios activos, cumplimiento tributario, propiedad intelectual.', principle: 'Cero sorpresas en due diligence.' },
  { id: 10, icon: Cpu,           title: 'Tecnología e Intangibles',  summary: 'CRM, ERP, software propio, bases de datos, seguridad informática, marcas registradas.', principle: 'Debe demostrar institucionalización tecnológica.' },
  { id: 11, icon: AlertTriangle, title: 'Riesgos y Contingencias',   summary: 'Concentración de ingresos, riesgo fundador, regulatorios, laborales, dependencia de proveedores.', principle: 'Cada riesgo con plan de mitigación.' },
  { id: 12, icon: Map,           title: 'Plan Estratégico 3–5 años', summary: 'Proyecciones base / conservadora / agresiva, capex requerido, necesidad de capital, estrategia de expansión.', principle: 'Debe estar alineado al plan del holding.' },
] as const;

type SectionDef = typeof SECTIONS[number];

const QUALITY_CHECKLIST = [
  'Verificar consistencia de cifras',
  'Revisar contratos vigentes',
  'Validar EBITDA normalizado',
  'Confirmar ausencia de litigios ocultos',
  'Asegurar confidencialidad firmada',
];

function calcReadiness(a: Agency): { pct: number; flags: { ok: boolean; label: string }[] } {
  const flags = [
    { ok: a.margin >= 10,                       label: 'Margen EBITDA ≥ 10%' },
    { ok: a.revenue >= 1_000_000,               label: 'Revenue > $1M' },
    { ok: a.iif >= 3.5,                         label: 'Integración financiera ≥ 3.5' },
    { ok: a.iio >= 3.5,                         label: 'Integración operativa ≥ 3.5' },
    { ok: a.irf <= 3,                           label: 'Riesgo fundador controlado' },
    { ok: a.cme >= 3.5,                         label: 'Calidad de métricas ≥ 3.5' },
    { ok: a.operatingCashflow > a.debtService,  label: 'Flujo cubre servicio de deuda' },
  ];
  const pct = Math.round(flags.filter(f => f.ok).length / flags.length * 100);
  return { pct, flags };
}

function readinessTone(pct: number) {
  if (pct >= 85) return { label: 'Listo para DD',   cls: 'bg-primary/15 text-primary border-primary/30' };
  if (pct >= 65) return { label: 'Casi listo',      cls: 'bg-accent/15 text-accent border-accent/30' };
  if (pct >= 40) return { label: 'En preparación',  cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
  return            { label: 'Requiere trabajo', cls: 'bg-destructive/15 text-destructive border-destructive/30' };
}

export default function DataRoom() {
  const eligible = useMemo(
    () => mockAgencies.filter(a => a.nivel === 1 || a.nivel === 2),
    [],
  );
  const [selectedId, setSelectedId] = useState<string>(eligible[0]?.id ?? '');
  const selected = eligible.find(a => a.id === selectedId) ?? eligible[0];
  const readiness = selected ? calcReadiness(selected) : null;
  const tone = readiness ? readinessTone(readiness.pct) : null;
  const [openSection, setOpenSection] = useState<SectionDef | null>(null);

  const lastSync = selected ? mockLastSync(selected.id) : null;
  const lastSyncLabel = lastSync ? (() => {
    const h = Math.max(1, Math.floor((Date.now() - lastSync.getTime()) / 3_600_000));
    return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
  })() : '—';

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-secondary/50 text-[10px] font-mono">QG-DR-02</Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">Aplica a N1 + N2</Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Data Room Específico — Subsidiaria</h1>
          <p className="text-sm text-muted-foreground max-w-3xl mt-1">
            Due diligence independiente por vertical, soporte para carve-out o venta parcial, y sustento de
            valoración por múltiplo alto. La subsidiaria debe poder sostenerse como empresa autónoma ante un comprador externo.
          </p>
        </div>

        {/* Selector de agencia (N1 / N2) */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Agencia bajo análisis</h3>
              <p className="text-[11px] text-muted-foreground">Solo subsidiarias de control mayoritario (N1) y participación significativa (N2).</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{eligible.length} elegibles</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {eligible.map(a => {
              const active = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all ${
                    active
                      ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
                      : 'bg-secondary/30 border-border hover:border-primary/30'
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{a.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <NivelBadge nivel={a.nivel} />
                    <VerticalBadge vertical={a.vertical} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Readiness panel */}
        {selected && readiness && tone && (
          <div className="glass-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{selected.name}</h3>
                  <Badge variant="outline" className={`${tone.cls} text-[10px]`}>{tone.label}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30 inline-flex items-center gap-1">
                    <CloudOff className="w-2.5 h-2.5" /> Drive: demo
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {NIVEL_LABELS[selected.nivel]} · {selected.vertical} · Revenue {formatCurrency(selected.revenue)} · EBITDA {formatCurrency(selected.ebitda)}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  Última sincronización con Drive (simulada): <span className="font-mono">{lastSyncLabel}</span>
                </p>
              </div>
              <div className="min-w-[220px]">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Data Room readiness</span>
                  <span className="font-mono text-foreground">{readiness.pct}%</span>
                </div>
                <Progress value={readiness.pct} className="h-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {readiness.flags.map(f => (
                <div key={f.label} className="flex items-center gap-2 text-[12px]">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${f.ok ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  <span className={f.ok ? 'text-foreground' : 'text-muted-foreground line-through'}>{f.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
              <Link
                to={`/agencies/${selected.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Ver ficha completa de la agencia <ChevronRight className="w-3 h-3" />
              </Link>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                <FolderOpen className="w-3 h-3 mr-1.5" />
                Conectar carpeta raíz de Drive
              </Button>
            </div>
          </div>
        )}

        {/* 12 secciones */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Estructura del Data Room — 12 secciones</h2>
            <span className="text-[10px] font-mono text-muted-foreground">QG-DR-02 §2</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Cada sección apunta a una subcarpeta de Google Drive. Haz clic para ver los documentos requeridos y su estado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECTIONS.map(s => {
              const sum = selected
                ? summarizeSection(selected.id, (selected.nivel === 1 || selected.nivel === 2) ? selected.nivel : 1, s.id)
                : { present: 0, stale: 0, missing: 0, total: 0, pct: 0 };
              const tone =
                sum.pct >= 85 ? 'text-primary'
                : sum.pct >= 60 ? 'text-accent'
                : sum.pct >= 30 ? 'text-yellow-400'
                : 'text-destructive';
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOpenSection(s)}
                  className="glass-card p-4 text-left hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <s.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">§{s.id.toString().padStart(2, '0')}</span>
                        <h4 className="text-sm font-semibold text-foreground truncate">{s.title}</h4>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{s.summary}</p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">{sum.present + sum.stale}/{sum.total} docs</span>
                            <span className={`font-mono ${tone}`}>{sum.pct}%</span>
                          </div>
                          <Progress value={sum.pct} className="h-1.5" />
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                      </div>

                      {sum.missing > 0 && (
                        <p className="text-[10px] text-destructive mt-1.5">
                          {sum.missing} documento{sum.missing > 1 ? 's' : ''} faltante{sum.missing > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quality checklist + Principio final */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Checklist de calidad antes de compartir</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Validar antes de abrir el Data Room a terceros (compradores, auditores, fondos).
            </p>
            <div className="space-y-1.5">
              {QUALITY_CHECKLIST.map(item => (
                <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">Principio final</h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              Una subsidiaria <span className="text-primary font-semibold">N1</span> o
              <span className="text-primary font-semibold"> N2</span> debe poder venderse individualmente
              <span className="italic"> sin depender de narrativa</span>.
            </p>
            <p className="text-[12px] text-muted-foreground mt-3 italic border-l-2 border-accent/40 pl-3">
              Si el Data Room no sostiene el múltiplo con datos, el múltiplo no existe.
            </p>
          </div>
        </div>
      </div>

      <DataRoomFolderDialog
        open={!!openSection}
        onOpenChange={(o) => { if (!o) setOpenSection(null); }}
        section={openSection}
        agency={selected ?? null}
      />
    </AppLayout>
  );
}