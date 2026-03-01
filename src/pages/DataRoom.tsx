import AppLayout from '@/components/AppLayout';
import { Folder, FileText, Lock } from 'lucide-react';

const dataRoomStructure = [
  {
    category: 'Legal',
    icon: Lock,
    files: ['Acta Constitutiva', 'Poder Notarial', 'Contratos de Servicios', 'NDA Framework'],
  },
  {
    category: 'Cap Table',
    icon: FileText,
    files: ['Distribución Accionaria', 'Vesting Schedule', 'SHA (Shareholders Agreement)', 'Stock Option Pool'],
  },
  {
    category: 'Financiero',
    icon: FileText,
    files: ['P&L Consolidado Q4', 'Balance General', 'Flujo de Caja', 'Auditoría Externa 2024'],
  },
  {
    category: 'Due Diligence',
    icon: Folder,
    files: ['Checklist DD Legal', 'Checklist DD Financiero', 'Checklist DD Operativo', 'Red Flags Report'],
  },
];

export default function DataRoom() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Room</h1>
          <p className="text-sm text-muted-foreground">Due Diligence permanente · Gestión documental institucional</p>
        </div>

        {/* Capital Allocation */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Capital Allocation — Prioridades de Inversión</h3>
          <div className="space-y-2">
            {[
              { priority: 1, label: 'Adquisiciones Majority (N1)', desc: 'Control >51% en agencias elegibles con EBITDA positivo y margen >10%', status: 'active' },
              { priority: 2, label: 'Participaciones Minoritarias (N2)', desc: 'Equity 15-40% en partners con IPP > 3.8', status: 'active' },
              { priority: 3, label: 'Expansión Regional', desc: 'Nuevas verticales y mercados en LATAM', status: 'planned' },
              { priority: 4, label: 'Infraestructura Hub', desc: 'Sistemas compartidos, plataformas centralizadas', status: 'planned' },
            ].map(item => (
              <div key={item.priority} className={`flex items-center gap-4 p-3 rounded-lg ${item.status === 'active' ? 'bg-primary/5 border border-primary/20' : 'bg-secondary/30 border border-transparent'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${item.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  #{item.priority}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <span className={`text-[10px] font-mono ${item.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {item.status === 'active' ? 'ACTIVO' : 'PLANEADO'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Document Structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataRoomStructure.map(section => (
            <div key={section.category} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <section.icon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{section.category}</h3>
              </div>
              <div className="space-y-1">
                {section.files.map(file => (
                  <div key={file} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer group">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
