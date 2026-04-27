import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Mail, Upload, RefreshCw, Sparkles, Pencil, Copy, Send, Phone, MessageCircle,
  FileUp, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Deal, DealStage, STAGE_META, StageTemplate } from '@/lib/deals/deals-data';
import { getSuggested, renderTemplate, aiDraft, SUGGESTED_TEMPLATES } from '@/lib/deals/deal-templates';

const STAGES: DealStage[] = ['sourcing','loi','dd','negotiation','closing','closed','lost'];

interface Props {
  deal: Deal;
  onSave: (stage: DealStage, tpl: StageTemplate) => void;
}

export default function DealCommunications({ deal, onSave }: Props) {
  const [stage, setStage] = useState<DealStage>(deal.stage);
  const stored = deal.templates?.[stage];
  const suggested = useMemo(() => getSuggested(stage), [stage]);

  const [subject, setSubject] = useState(stored?.subject || suggested.subject);
  const [body, setBody]       = useState(stored?.body    || suggested.body);
  const [source, setSource]   = useState<StageTemplate['source']>(stored?.source || 'suggested');
  const [aiTone, setAiTone]   = useState<'formal'|'cercano'|'directo'>('formal');
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset al cambiar etapa
  const switchStage = (s: DealStage) => {
    setStage(s);
    const st = deal.templates?.[s];
    const sug = getSuggested(s);
    setSubject(st?.subject || sug.subject);
    setBody(st?.body || sug.body);
    setSource(st?.source || 'suggested');
  };

  const renderedSubject = useMemo(() => renderTemplate(subject, deal), [subject, deal]);
  const renderedBody    = useMemo(() => renderTemplate(body,    deal), [body,    deal]);

  const save = (src: StageTemplate['source'] = source) => {
    onSave(stage, {
      subject, body, source: src,
      updatedAt: new Date().toISOString(),
    });
    setSource(src);
    toast.success('Plantilla guardada');
  };

  const useSuggested = () => {
    setSubject(suggested.subject);
    setBody(suggested.body);
    setSource('suggested');
    toast.message('Plantilla sugerida cargada');
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      // Si el archivo trae "Subject:" en la primera línea lo separamos
      const m = text.match(/^Subject:\s*(.+?)\n+([\s\S]*)$/i);
      if (m) { setSubject(m[1].trim()); setBody(m[2].trim()); }
      else   { setBody(text); }
      setSource('uploaded');
      toast.success(`Plantilla cargada: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const generateAi = () => {
    const draft = aiDraft(deal, stage, aiTone);
    setSubject(draft.subject);
    setBody(draft.body);
    setSource('ai');
    toast.success(`Borrador generado (tono ${aiTone})`);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(`Asunto: ${renderedSubject}\n\n${renderedBody}`);
    toast.success('Copiado al portapapeles');
  };

  const c = deal.company;
  const mailto = c?.email
    ? `mailto:${c.email}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(renderedBody)}`
    : '#';
  const wa = c?.whatsapp
    ? `https://wa.me/${c.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(renderedBody)}`
    : '#';

  const sourceMeta: Record<StageTemplate['source'], { label: string; cls: string }> = {
    suggested: { label: 'Sugerida',       cls: 'bg-muted text-muted-foreground border-border' },
    uploaded:  { label: 'Cargada',        cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    manual:    { label: 'Manual',         cls: 'bg-accent/15 text-accent-foreground border-accent/30' },
    ai:        { label: 'Generada con IA',cls: 'bg-primary/15 text-primary border-primary/30' },
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LEFT — Stage list */}
      <aside className="col-span-3 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-2">Etapas</div>
        {STAGES.map(s => {
          const has = !!deal.templates?.[s];
          const meta = STAGE_META[s];
          return (
            <button
              key={s}
              onClick={() => switchStage(s)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                stage === s ? 'bg-primary/10 text-primary border border-primary/30' : 'hover:bg-secondary/60 border border-transparent'
              }`}
            >
              <span>{meta.label}</span>
              {has && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
        <div className="mt-4 p-3 rounded-lg bg-secondary/40 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
          Las plantillas usan variables como <code>{'{{tradeName}}'}</code>, <code>{'{{ask}}'}</code>, <code>{'{{sellerName}}'}</code> que se rellenan con la info del deal.
        </div>
      </aside>

      {/* CENTER — Editor */}
      <div className="col-span-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Plantilla — {STAGE_META[stage].label}</div>
            <h3 className="text-base font-semibold">{suggested.label}</h3>
          </div>
          <Badge variant="outline" className={sourceMeta[source].cls}>{sourceMeta[source].label}</Badge>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={useSuggested} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Sugerida
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Cargar
          </Button>
          <input ref={fileRef} type="file" accept=".txt,.md,.html" hidden onChange={onUpload} />
          <Button size="sm" variant="outline" onClick={() => setSource('manual')} className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Manual
          </Button>
          <div className="flex items-center gap-1.5 ml-auto">
            <Select value={aiTone} onValueChange={v => setAiTone(v as any)}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="cercano">Cercano</SelectItem>
                <SelectItem value="directo">Directo</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={generateAi} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Redactar con IA
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Asunto</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Cuerpo del mensaje</Label>
          <Textarea
            rows={18}
            value={body}
            onChange={e => setBody(e.target.value)}
            className="font-mono text-xs leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Cambios solo se aplican a este deal.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => save('manual')} className="gap-1.5">
              <FileUp className="w-3.5 h-3.5" /> Reemplazar
            </Button>
            <Button size="sm" onClick={() => save()} className="gap-1.5">
              <Wand2 className="w-3.5 h-3.5" /> Guardar plantilla
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT — Preview & send */}
      <aside className="col-span-3 space-y-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Destinatario</div>
          <div className="text-sm font-medium">{c?.sellerName || '—'}</div>
          <div className="text-xs text-muted-foreground">{c?.tradeName || deal.target}</div>
          <div className="mt-3 space-y-1.5 text-xs">
            {c?.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" />{c.email}</div>}
            {c?.whatsapp && <div className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle className="w-3 h-3" />{c.whatsapp}</div>}
            {c?.contactPhone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3 h-3" />{c.contactPhone}</div>}
          </div>
        </div>

        <Tabs defaultValue="preview">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">Variables</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div className="bg-card border border-border rounded-xl p-4 text-xs">
              <div className="font-semibold mb-2">{renderedSubject}</div>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">{renderedBody}</div>
            </div>
          </TabsContent>
          <TabsContent value="raw">
            <div className="bg-card border border-border rounded-xl p-4 text-[11px] text-muted-foreground space-y-1">
              <div><code>{'{{tradeName}}'}</code> = {c?.tradeName || '—'}</div>
              <div><code>{'{{legalName}}'}</code> = {c?.legalName || '—'}</div>
              <div><code>{'{{taxId}}'}</code> = {c?.taxId || '—'}</div>
              <div><code>{'{{sellerName}}'}</code> = {c?.sellerName || '—'}</div>
              <div><code>{'{{ask}}'}</code> = ${deal.inputs.ask.toLocaleString()}</div>
              <div><code>{'{{ebitda}}'}</code> = ${deal.inputs.ebitda.toLocaleString()}</div>
              <div><code>{'{{multiple}}'}</code> = múltiplo implícito</div>
              <div><code>{'{{netPurchasePrice}}'}</code>, <code>{'{{cashNeeded}}'}</code>, <code>{'{{sellerFinancing}}'}</code>, <code>{'{{earnout}}'}</code></div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={copyAll}>
            <Copy className="w-3.5 h-3.5" /> Copiar
          </Button>
          <a href={mailto} target="_blank" rel="noreferrer">
            <Button size="sm" className="w-full gap-1.5" disabled={!c?.email}>
              <Send className="w-3.5 h-3.5" /> Enviar por email
            </Button>
          </a>
          <a href={wa} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="w-full gap-1.5" disabled={!c?.whatsapp}>
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </Button>
          </a>
        </div>
      </aside>
    </div>
  );
}