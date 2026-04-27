import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import ProjectionsView from '@/components/projections/ProjectionsView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { projectableAgencies } from '@/lib/projections/projections-engine';
import { NivelBadge } from '@/components/StatusBadges';
import { TrendingUp, ArrowRight } from 'lucide-react';

export default function ProjectionsPage() {
  const agencies = projectableAgencies();
  const [tab, setTab] = useState<string>('group');

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground inline-flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Proyecciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Forecast 12-36 meses, escenarios Base/Bull/Bear y roadmaps de transición de niveles.
            Vista consolidada del grupo y por agencia (N1, N2 y N3 elegibles).
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="group">Grupo (consolidado)</TabsTrigger>
            {agencies.map(a => (
              <TabsTrigger key={a.id} value={a.id} className="gap-2">
                {a.name} <span className="text-[10px] opacity-70">N{a.nivel}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="group" className="mt-4">
            <ProjectionsView />
          </TabsContent>

          {agencies.map(a => (
            <TabsContent key={a.id} value={a.id} className="mt-4">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <NivelBadge nivel={a.nivel} />
                  <span className="text-xs text-muted-foreground">{a.vertical} · {a.country}</span>
                </div>
                <Link to={`/agencies/${a.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Ver agencia completa <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <ProjectionsView agency={a} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
