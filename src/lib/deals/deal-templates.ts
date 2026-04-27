import { Deal, DealStage, computeDeal, fmtCurrency } from './deals-data';

export interface SuggestedTemplate {
  stage: DealStage;
  label: string;
  subject: string;
  body: string;
  description: string;
}

// Plantillas sugeridas por etapa (con placeholders {{var}})
export const SUGGESTED_TEMPLATES: SuggestedTemplate[] = [
  {
    stage: 'sourcing',
    label: 'Primer acercamiento',
    description: 'Romper el hielo y solicitar conversación inicial.',
    subject: 'Conversación exploratoria — {{tradeName}}',
    body:
`Estimado/a {{sellerName}},

Mi nombre es [Tu nombre] y represento a Quantum Group, un holding que integra agencias en LATAM bajo un modelo de creación de valor compartido.

Hemos estado siguiendo el trabajo de {{tradeName}} en {{vertical}} y nos gustaría explorar una posible conversación estratégica. No se trata de una propuesta cerrada, sino de entender si existe alineación para una integración o sociedad.

¿Tendrías 30 minutos esta semana para una llamada confidencial?

Quedo atento.
Saludos cordiales.`,
  },
  {
    stage: 'loi',
    label: 'Envío de LOI / Carta de Intención',
    description: 'Formaliza términos no vinculantes después del primer interés.',
    subject: 'Carta de Intención — {{tradeName}}',
    body:
`Estimado/a {{sellerName}},

Tras nuestras conversaciones sobre {{tradeName}} ({{taxId}}), adjuntamos nuestra Carta de Intención (LOI) no vinculante con los siguientes términos preliminares:

• Empresa target: {{legalName}}
• Vertical: {{vertical}}
• Valoración propuesta (Ask): {{ask}}
• EBITDA referencia: {{ebitda}}
• Múltiplo implícito: {{multiple}}x
• % de equity a adquirir: {{pctEquity}}
• Estructura preliminar: combinación de cash al cierre, financiamiento del vendedor y earnout

Próximos pasos: firmar NDA recíproca, abrir Data Room y arrancar Due Diligence en un plazo de 30–45 días.

Quedamos atentos a tus comentarios.
Saludos.`,
  },
  {
    stage: 'dd',
    label: 'Apertura de Due Diligence',
    description: 'Solicita información y comparte checklist.',
    subject: 'Due Diligence — Solicitud de información {{tradeName}}',
    body:
`Estimado/a {{sellerName}},

Iniciamos formalmente la fase de Due Diligence sobre {{legalName}} (RUC/RFC: {{taxId}}).

Compartiremos en las próximas horas el acceso a nuestro Data Room virtual, donde encontrarás el checklist estructurado en cuatro categorías: Legal, Financiero, Operaciones y Comercial.

Solicitamos especial prioridad en:
• Estados financieros últimos 3 años (auditados o revisados)
• Conciliaciones bancarias y deuda vigente
• Contratos con clientes Top-10 y proveedores clave
• Estructura societaria y poderes vigentes
• Organigrama y contratos laborales del equipo gerencial

Tiempo estimado de DD: 30 días hábiles. Cualquier información sensible será tratada bajo el NDA firmado.

Quedamos a tu disposición.
Saludos.`,
  },
  {
    stage: 'negotiation',
    label: 'Propuesta de términos finales',
    description: 'Comparte estructura definitiva del deal.',
    subject: 'Propuesta de términos finales — {{tradeName}}',
    body:
`Estimado/a {{sellerName}},

Concluido el Due Diligence sobre {{tradeName}}, presentamos los términos finales de la operación:

• Precio neto de compra: {{netPurchasePrice}}
• Cash al cierre: {{cashNeeded}}
• Financiamiento del vendedor: {{sellerFinancing}}
• Earnout sujeto a desempeño: {{earnout}}
• % de equity adquirido: {{pctEquity}}

Ajustes derivados del DD y supuestos detallados se incluyen en el anexo. Estamos abiertos a discutir mecanismos de protección mutua (escrow, reps & warranties, no-compete).

Proponemos una sesión esta semana para cerrar puntos abiertos.
Saludos.`,
  },
  {
    stage: 'closing',
    label: 'Coordinación de cierre',
    description: 'Logística de firma y transferencia.',
    subject: 'Cierre de operación — {{tradeName}}',
    body:
`Estimado/a {{sellerName}},

Estamos en la recta final. Para coordinar el cierre de la operación sobre {{legalName}}, confirmamos:

• Fecha tentativa de firma: [completar]
• Notaría / lugar: [completar]
• Documentos a firmar: SPA, contrato de earnout, pagaré por seller financing, no-compete
• Transferencia de fondos: cuenta de destino confirmada por correo separado
• Anuncio público: coordinar comunicado conjunto post-firma

Por favor confirma disponibilidad y datos del representante legal que firmará.
Saludos.`,
  },
  {
    stage: 'closed',
    label: 'Bienvenida post-cierre',
    description: 'Onboarding al holding tras la firma.',
    subject: '¡Bienvenidos a Quantum Group! — {{tradeName}}',
    body:
`Estimado/a {{sellerName}} y equipo,

Es un honor darles la bienvenida a Quantum Group. La integración de {{tradeName}} marca un paso importante en nuestra estrategia regional.

Próximos pasos del plan de integración (primeros 100 días):
• Día 1–15: kick-off ejecutivo, comunicación interna, integración financiera
• Día 16–60: alineación operativa, cross-sell con agencias hermanas
• Día 61–100: revisión de KPIs y ajuste del plan de earnout

Tu interlocutor principal será [completar]. Estamos a tu disposición para lo que necesites.

Bienvenidos a bordo.`,
  },
  {
    stage: 'lost',
    label: 'Cierre de conversación',
    description: 'Mantener la puerta abierta tras un no.',
    subject: 'Agradecimiento — {{tradeName}}',
    body:
`Estimado/a {{sellerName}},

Agradecemos profundamente el tiempo y la apertura para conversar sobre {{tradeName}}. Aunque en este momento no logramos converger en términos, valoramos mucho lo conversado.

Quedamos disponibles para retomar la conversación en el futuro si las condiciones cambian.

Mucho éxito en lo que viene.
Saludos.`,
  },
];

export function getSuggested(stage: DealStage): SuggestedTemplate {
  return SUGGESTED_TEMPLATES.find(t => t.stage === stage) || SUGGESTED_TEMPLATES[0];
}

// Sustitución de variables con la data del deal
export function renderTemplate(text: string, deal: Deal): string {
  const out = computeDeal(deal.inputs);
  const c = deal.company;
  const map: Record<string, string> = {
    tradeName:      c?.tradeName || deal.target || '—',
    legalName:      c?.legalName || deal.target || '—',
    taxId:          c?.taxId || '—',
    sellerName:     c?.sellerName || '[nombre del vendedor]',
    contactPhone:   c?.contactPhone || '—',
    whatsapp:       c?.whatsapp || '—',
    email:          c?.email || '—',
    address:        c?.address || '—',
    target:         deal.target || '—',
    vertical:       deal.vertical,
    country:        deal.country,
    ask:            fmtCurrency(deal.inputs.ask),
    ebitda:         fmtCurrency(deal.inputs.ebitda),
    sales:          fmtCurrency(deal.inputs.sales),
    multiple:       out.multipleImplied.toFixed(1),
    pctEquity:      `${(deal.inputs.pctEquityAcquired * 100).toFixed(0)}%`,
    netPurchasePrice: fmtCurrency(out.netPurchasePrice),
    cashNeeded:     fmtCurrency(out.preClosingCashNeed),
    sellerFinancing: fmtCurrency(out.sellerFinancing),
    earnout:        fmtCurrency(out.earnoutAmount),
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? `{{${k}}}`);
}

// "AI" demo: enriquece la plantilla sugerida con tono personalizado.
// Cuando se active Lovable Cloud, esto puede llamar al AI Gateway.
export function aiDraft(deal: Deal, stage: DealStage, tone: 'formal'|'cercano'|'directo' = 'formal'): { subject: string; body: string } {
  const base = getSuggested(stage);
  const opener =
    tone === 'cercano' ? `Hola ${deal.company?.sellerName || '[vendedor]'},\n\nEspero que estés muy bien. `
    : tone === 'directo' ? `${deal.company?.sellerName || '[vendedor]'},\n\n`
    : `Estimado/a ${deal.company?.sellerName || '[vendedor]'},\n\n`;
  const closer =
    tone === 'cercano' ? `\n\nUn abrazo,\n[Tu nombre]`
    : tone === 'directo' ? `\n\nGracias.\n[Tu nombre]`
    : `\n\nQuedo atento a tu respuesta.\nSaludos cordiales,\n[Tu nombre]`;

  // Reemplaza el saludo y el cierre originales
  const trimmed = base.body
    .replace(/^Estimado\/a [^\n]*\n+/i, '')
    .replace(/(Saludos[^\n]*|Un abrazo[^\n]*|Gracias[^\n]*)\.?$/i, '')
    .trim();

  return {
    subject: renderTemplate(base.subject, deal),
    body: renderTemplate(opener + trimmed + closer, deal),
  };
}