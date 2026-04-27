import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, AlertCircle, Clock, ExternalLink, RefreshCw,
  FolderOpen, FileText, CloudOff,
} from 'lucide-react';
import { useState } from 'react';
import {
  SECTION_DOCS, mockDocStatus, mockLastSync, mockDriveFolderUrl,
  summarizeSection, type DocStatus,
} from '@/lib/data-room-data';
import { Agency } from '@/lib/quantum-engine';
import { toast } from 'sonner';

interface Section {
  id: number;
  title: string;
  summary: string;
  principle: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section | null;
  agency: Agency | null;
}

const STATUS_META: Record<DocStatus, { icon: React.ComponentType<{ className?: string }>; label: string; cls: string; iconCls: string }> = {
  present: { icon: CheckCircle2, label: 'Cargado',       cls: 'bg-primary/10 text-primary border-primary/30',         iconCls: 'text-primary' },
  stale:   { icon: Clock,        label: 'Desactualizado', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', iconCls: 'text-yellow-400' },
  missing: { icon: AlertCircle,  label: 'Faltante',       cls: 'bg-destructive/10 text-destructive border-destructive/30', iconCls: 'text-destructive' },
};

function formatRelative(date: Date): string {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export default function DataRoomFolderDialog({ open, onOpenChange, section, agency }: Props) {
  const [syncing, setSyncing] = useState(false);

  if (!section || !agency) return null;
  const nivel = (agency.nivel === 1 || agency.nivel === 2) ? agency.nivel : 1;
  const docs = SECTION_DOCS[section.id] ?? [];
  const summary = summarizeSection(agency.id, nivel, section.id);
  const lastSync = mockLastSync(agency.id);
  const driveUrl = mockDriveFolderUrl(agency.id, section.id);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.info('Sincronización en demo', {
        description: 'Conecta Google Drive para sincronizar archivos reales.',
      });
    }, 900);
  };

  const Icon = section.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] font-mono bg-secondary/50">§{section.id.toString().padStart(2, '0')}</Badge>
                <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  <CloudOff className="w-2.5 h-2.5 mr-1" /> Demo · Drive no conectado
                </Badge>
              </div>
              <DialogTitle className="text-lg">{section.title}</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {agency.name} · {section.summary}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen + sync */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">Cobertura</span>
              <span className="font-mono text-sm text-foreground">{summary.pct}%</span>
            </div>
            <Progress value={summary.pct} className="h-2 mb-3" />
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="w-3 h-3" /> {summary.present} cargados</span>
              <span className="flex items-center gap-1 text-yellow-400"><Clock className="w-3 h-3" /> {summary.stale} viejos</span>
              <span className="flex items-center gap-1 text-destructive"><AlertCircle className="w-3 h-3" /> {summary.missing} faltantes</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Carpeta de Google Drive (demo)</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mb-2">
                Última sincronización: <span className="font-mono">{formatRelative(lastSync)}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`w-3 h-3 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <a href={driveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1.5" /> Abrir
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Listado de documentos requeridos */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-foreground">Documentos requeridos</h4>
            <span className="text-[10px] font-mono text-muted-foreground">{docs.length} ítems</span>
          </div>
          <div className="space-y-1.5">
            {docs.map(doc => {
              const status = mockDocStatus(agency.id, nivel, section.id, doc.name);
              const meta = STATUS_META[status];
              const StatusIcon = meta.icon;
              return (
                <div
                  key={doc.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{doc.name}</p>
                    {doc.hint && <p className="text-[10px] text-muted-foreground">{doc.hint}</p>}
                  </div>
                  <Badge variant="outline" className={`${meta.cls} text-[10px] inline-flex items-center gap-1 shrink-0`}>
                    <StatusIcon className={`w-3 h-3 ${meta.iconCls}`} />
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Principio */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[11px] text-accent italic">{section.principle}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
