// Documentos requeridos por sección, derivados del documento QG-DR-02.
// En modo demo: estado simulado por agencia (presente / faltante / desactualizado).

export type DocStatus = 'present' | 'missing' | 'stale';

export interface RequiredDoc {
  name: string;
  hint?: string;
}

export const SECTION_DOCS: Record<number, RequiredDoc[]> = {
  1: [
    { name: 'Acta constitutiva' },
    { name: 'Reformas estatutarias' },
    { name: 'Libro de accionistas' },
    { name: 'Actas de Junta (últimos 24 meses)' },
    { name: 'Organigrama formal' },
    { name: 'Manuales operativos' },
    { name: 'Políticas internas' },
  ],
  2: [
    { name: 'Cap table actualizado' },
    { name: 'Participación exacta del holding' },
    { name: 'Pactos de accionistas (SHA)' },
    { name: 'ESOP / Stock Option Pool', hint: 'Si existe' },
    { name: 'Derechos de arrastre / acompañamiento (Drag & Tag along)' },
  ],
  3: [
    { name: 'Balance General (3–5 años)' },
    { name: 'Estado de Resultados (3–5 años)' },
    { name: 'Flujo de Caja (3–5 años)' },
    { name: 'EBITDA normalizado' },
    { name: 'Ajustes no recurrentes documentados' },
    { name: 'Detalle de gastos intercompany' },
  ],
  4: [
    { name: 'Facturación mensual histórica' },
    { name: 'Top 20 clientes' },
    { name: 'Concentración por cliente (%)' },
    { name: 'Duración promedio de contratos' },
    { name: 'Tasa de retención' },
    { name: 'Tasa de churn' },
  ],
  5: [
    { name: 'Margen bruto histórico' },
    { name: 'Margen EBITDA histórico' },
    { name: 'Evolución trimestral' },
    { name: 'Sinergias capturadas post-integración' },
  ],
  6: [
    { name: 'Procesos documentados (mapa)' },
    { name: 'KPIs operativos' },
    { name: 'Capacidad instalada' },
    { name: 'Utilización de recursos' },
    { name: 'Documento de dependencia del fundador' },
  ],
  7: [
    { name: 'Equipo directivo (CVs)' },
    { name: 'Contratos clave del equipo directivo' },
    { name: 'Permanencia promedio' },
    { name: 'Plan de sucesión' },
    { name: 'Esquema de incentivos' },
  ],
  8: [
    { name: 'Pipeline actual' },
    { name: 'Valor ponderado del pipeline' },
    { name: 'Tasa de cierre histórica' },
    { name: 'Estrategia de adquisición de clientes' },
    { name: 'Dependencia del holding en generación de negocios' },
  ],
  9: [
    { name: 'Contratos relevantes con clientes' },
    { name: 'Contratos con proveedores críticos' },
    { name: 'Litigios activos' },
    { name: 'Cumplimiento tributario' },
    { name: 'Propiedad intelectual' },
  ],
  10: [
    { name: 'CRM' },
    { name: 'ERP' },
    { name: 'Software propio' },
    { name: 'Bases de datos' },
    { name: 'Política de seguridad informática' },
    { name: 'Marcas registradas' },
  ],
  11: [
    { name: 'Concentración de ingresos' },
    { name: 'Riesgo fundador (con plan de mitigación)' },
    { name: 'Riesgos regulatorios' },
    { name: 'Riesgos laborales' },
    { name: 'Dependencia de proveedores' },
  ],
  12: [
    { name: 'Proyección Base' },
    { name: 'Proyección Conservadora' },
    { name: 'Proyección Agresiva' },
    { name: 'Capex requerido' },
    { name: 'Necesidad de capital' },
    { name: 'Estrategia de expansión' },
  ],
};

// Hash determinista (agency + section + doc) para simular estado consistente.
function seededRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// Demo: agencias N1 con mayor cobertura, N2 con cobertura intermedia.
export function mockDocStatus(
  agencyId: string,
  nivel: 1 | 2,
  sectionId: number,
  docName: string,
): DocStatus {
  const r = seededRand(`${agencyId}-${sectionId}-${docName}`);
  const presentThreshold = nivel === 1 ? 0.82 : 0.62;
  const staleThreshold = nivel === 1 ? 0.92 : 0.78;
  if (r < presentThreshold) return 'present';
  if (r < staleThreshold)   return 'stale';
  return 'missing';
}

export function mockLastSync(agencyId: string): Date {
  const r = seededRand(`sync-${agencyId}`);
  // Entre hace 1 hora y hace 36 horas
  const hoursAgo = 1 + r * 35;
  return new Date(Date.now() - hoursAgo * 3600_000);
}

export function mockDriveFolderUrl(agencyId: string, sectionId: number): string {
  // Placeholder. Cuando se conecte Drive real, reemplazar por URL real.
  return `https://drive.google.com/drive/folders/demo-${agencyId}-s${sectionId}`;
}

export function summarizeSection(
  agencyId: string,
  nivel: 1 | 2,
  sectionId: number,
): { present: number; stale: number; missing: number; total: number; pct: number } {
  const docs = SECTION_DOCS[sectionId] ?? [];
  let present = 0, stale = 0, missing = 0;
  for (const d of docs) {
    const s = mockDocStatus(agencyId, nivel, sectionId, d.name);
    if (s === 'present') present++;
    else if (s === 'stale') stale++;
    else missing++;
  }
  const total = docs.length || 1;
  const pct = Math.round(((present + stale * 0.5) / total) * 100);
  return { present, stale, missing, total, pct };
}
