import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Briefcase, ArrowRight, TrendingUp, ShieldCheck, AlertTriangle,
  Target, MapPin, Calendar,
} from 'lucide-react';
import { useDeals } from '@/lib/deals/deals-store';
import {
  computeDeal, ddProgress, fmtCurrency, STAGE_META, DealStage,
  emptyInputs, emptyCompany,
} from '@/lib/deals/deals-data';

const STAGES: DealStage[] = ['sourcing','loi','dd','negotiation','closing','closed','lost'];
const VERTICALS = ['Creative & Strategy','Media & Performance','Trade & BTL','Data / Tech / AI','Contact & Sales'];

function NewDealDialog() {
  const { createDeal } = useDeals();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', target: '', vertical: VERTICALS[0], country: 'México',
    stage: 'sourcing' as DealStage, thesis: '',
    ask: '', ebitda: '', sales: '',
    tradeName: '', legalName: '', taxId: '',
    sellerName: '', contactPhone: '', whatsapp: '', email: '', address: '',
  });

  const submit = () => {
    createDeal({
      name: form.name || 'Nuevo Deal',
      target: form.target || form.tradeName,
      vertical: form.vertical,
      country: form.country,
      stage: form.stage,
      thesis: form.thesis,
      company: {
        ...emptyCompany(),
        tradeName: form.tradeName,
        legalName: form.legalName,
        taxId: form.taxId,
        sellerName: form.sellerName,
        contactPhone: form.contactPhone,
        whatsapp: form.whatsapp,
        email: form.email,
        address: form.address,
      },
      inputs: {
        ...emptyInputs(),
        ask: Number(form.ask) || 0,
        ebitda: Number(form.ebitda) || 0,
        sales: Number(form.sales) || 0,
        industryMultiple: 5,
        integratorEquityPct: 0.3,
      },
    });
    setOpen(false);
    setForm({ name:'', target:'', vertical:VERTICALS[0], country:'México', stage:'sourcing', thesis:'',
      ask:'', ebitda:'', sales:'',
      tradeName:'', legalName:'', taxId:'', sellerName:'', contactPhone:'', whatsapp:'', email:'', address:'' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo Deal</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear nuevo Deal</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Proyecto */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Proyecto</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Codename</Label>
                <Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Project Halo" />
              </div>
              <div>
                <Label>Vertical</Label>
                <Select value={form.vertical} onValueChange={v=>setForm({...form, vertical:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VERTICALS.map(v=> <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa</Label>
                <Select value={form.stage} onValueChange={v=>setForm({...form, stage:v as DealStage})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s=> <SelectItem key={s} value={s}>{STAGE_META[s].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Información de la empresa</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre comercial</Label>
                <Input value={form.tradeName} onChange={e=>setForm({...form, tradeName:e.target.value})} placeholder="Halo Marketing" />
              </div>
              <div>
                <Label>Razón social</Label>
                <Input value={form.legalName} onChange={e=>setForm({...form, legalName:e.target.value})} placeholder="Halo Performance S.A.C." />
              </div>
              <div>
                <Label>RUC / RFC / NIT</Label>
                <Input value={form.taxId} onChange={e=>setForm({...form, taxId:e.target.value})} />
              </div>
              <div>
                <Label>País</Label>
                <Input value={form.country} onChange={e=>setForm({...form, country:e.target.value})} />
              </div>
              <div>
                <Label>Nombre del vendedor</Label>
                <Input value={form.sellerName} onChange={e=>setForm({...form, sellerName:e.target.value})} />
              </div>
              <div>
                <Label>Número de contacto</Label>
                <Input value={form.contactPhone} onChange={e=>setForm({...form, contactPhone:e.target.value})} placeholder="+51 999 999 999" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e=>setForm({...form, whatsapp:e.target.value})} placeholder="+51 999 999 999" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={e=>setForm({...form, address:e.target.value})} />
              </div>
            </div>
          </div>

          {/* Financiero */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Datos financieros</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Ask ($)</Label>
                <Input type="number" value={form.ask} onChange={e=>setForm({...form, ask:e.target.value})} />
              </div>
              <div>
                <Label>EBITDA ($)</Label>
                <Input type="number" value={form.ebitda} onChange={e=>setForm({...form, ebitda:e.target.value})} />
              </div>
              <div>
                <Label>Revenue ($)</Label>
                <Input type="number" value={form.sales} onChange={e=>setForm({...form, sales:e.target.value})} />
              </div>
            </div>
          </div>

          <div>
            <Label>Tesis de inversión</Label>
            <Textarea rows={3} value={form.thesis} onChange={e=>setForm({...form, thesis:e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Crear Deal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Deals() {
  const { deals } = useDeals();
  const [filter, setFilter] = useState<DealStage | 'all'>('all');

  const filtered = useMemo(
    () => filter === 'all' ? deals : deals.filter(d => d.stage === filter),
    [deals, filter]
  );

  const stats = useMemo(() => {
    const totalAsk = deals.reduce((s,d) => s + d.inputs.ask, 0);
    const inDD = deals.filter(d => d.stage === 'dd').length;
    const closing = deals.filter(d => d.stage === 'closing' || d.stage === 'negotiation').length;
    return { totalAsk, inDD, closing, count: deals.length };
  }, [deals]);

  return (
    <AppLayout>
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Briefcase className="w-3.5 h-3.5" /> M&A Pipeline
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Canvas de oportunidades de adquisición. Cada deal incluye análisis EPIC y due diligence estructurado.
            </p>
          </div>
          <NewDealDialog />
        </header>

        {/* Stat band */}
        <section className="grid grid-cols-4 gap-4">
          <Stat label="Deals activos" value={stats.count.toString()} />
          <Stat label="En Due Diligence" value={stats.inDD.toString()} accent />
          <Stat label="En cierre" value={stats.closing.toString()} />
          <Stat label="Capital total en pipeline (Ask)" value={fmtCurrency(stats.totalAsk)} />
        </section>

        {/* Stage filter */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={filter==='all'} onClick={()=>setFilter('all')}>Todos ({deals.length})</FilterChip>
          {STAGES.map(s => {
            const count = deals.filter(d => d.stage === s).length;
            if (count === 0 && s !== 'sourcing') return null;
            return (
              <FilterChip key={s} active={filter===s} onClick={()=>setFilter(s)}>
                {STAGE_META[s].label} ({count})
              </FilterChip>
            );
          })}
        </div>

        {/* Canvas grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(d => {
            const out = computeDeal(d.inputs);
            const dd  = ddProgress(d.ddStatus);
            const stage = STAGE_META[d.stage];
            const askVsFmv = d.inputs.ebitda > 0 ? out.multipleImplied - d.inputs.industryMultiple : 0;
            return (
              <Link
                key={d.id}
                to={`/deals/${d.id}`}
                className="group bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.name}</div>
                    <h3 className="text-lg font-semibold leading-tight">{d.target || '—'}</h3>
                  </div>
                  <Badge variant="outline" className={stage.tone}>{stage.label}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" />{d.vertical}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{d.country}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{d.createdAt}</span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{d.thesis || '—'}</p>

                {/* Valuation strip */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-secondary/40 border border-border/40">
                  <Mini label="Ask"      value={fmtCurrency(d.inputs.ask)} />
                  <Mini label="EBITDA"   value={fmtCurrency(d.inputs.ebitda)} />
                  <Mini
                    label="Múltiplo"
                    value={d.inputs.ebitda > 0 ? `${out.multipleImplied.toFixed(1)}x` : '—'}
                    tone={askVsFmv > 1 ? 'warn' : askVsFmv < -0.5 ? 'good' : 'neutral'}
                  />
                </div>

                {/* DD progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="w-3 h-3" /> Due Diligence
                    </span>
                    <span className="font-medium">{dd.complete}/{dd.total}</span>
                  </div>
                  <Progress value={dd.pct} className="h-1.5" />
                  {dd.redflag > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-destructive">
                      <AlertTriangle className="w-3 h-3" /> {dd.redflag} red flag{dd.redflag>1?'s':''}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir deal <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
              No hay deals en esta etapa.
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-xl border ${accent ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: ()=>void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
      }`}
    >{children}</button>
  );
}

function Mini({ label, value, tone='neutral' }: { label: string; value: string; tone?: 'good'|'warn'|'neutral' }) {
  const cls = tone === 'warn' ? 'text-yellow-300' : tone === 'good' ? 'text-green-400' : '';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
