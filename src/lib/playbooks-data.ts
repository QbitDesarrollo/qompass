import type { Agency, CapitalPriority } from './quantum-engine';
import { calcDSCR, getAscensionOpportunity } from './quantum-engine';

export type PlaybookPillar = 'Equity' | 'Deuda' | 'Subvenciones' | 'No Monetario' | 'Bootstrap';
export type PlaybookPhase = 'Pre-Cierre' | 'Híbrida' | 'Post-Cierre';

export interface PlaybookTactic {
  id: number | string;
  name: string;
  pillar: PlaybookPillar | string;
  contribution: string; // e.g. "60% del down payment"
  description: string;
}

export interface Playbook {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  thesis: string;
  bestFor: string[];      // perfiles donde encaja (vertical, situación)
  tactics: PlaybookTactic[];
  steps: string[];        // ingeniería de la operación
  risks: string[];
  pillarsMix: PlaybookPillar[];
  phase: PlaybookPhase;
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-01-lbo-corrientes',
    number: 1,
    title: 'LBO Clásico de Activos Corrientes',
    shortTitle: 'LBO Activos Corrientes',
    thesis: 'Liquidez inmediata desde activos circulantes (AR + inventario) para fondear el cierre 100%.',
    bestFor: ['Operaciones con base sólida de clientes', 'Inventario relevante', 'Manufactura / distribución'],
    tactics: [
      { id: 119, name: 'LBO',                       pillar: 'Deuda',     contribution: 'Estructura',          description: 'Leveraged Buyout como vehículo principal de adquisición.' },
      { id: 209, name: 'AR Recourse Loan',           pillar: 'Deuda',     contribution: '60% del down payment', description: 'Préstamo con recurso sobre cuentas por cobrar.' },
      { id: 167, name: 'Inventory Finance',          pillar: 'Deuda',     contribution: '40% del down payment', description: 'Financiamiento de materia prima y producto terminado.' },
    ],
    steps: [
      'Auditar AR (envejecimiento, concentración) e inventario (rotación, valor).',
      'Asegurar línea AR-Recourse al 60% del down payment con un alt-lender.',
      'Estructurar inventory finance al 40% restante.',
      'Cerrar LBO con 100% del cash de cierre cubierto por activos corrientes.',
    ],
    risks: ['Concentración de cuentas por cobrar', 'Inventario obsoleto descuenta el LTV'],
    pillarsMix: ['Deuda'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-02-media-blitz',
    number: 2,
    title: 'Media & Marketing Blitz',
    shortTitle: 'Media Blitz Pre-Cierre',
    thesis: 'Explotar la base de datos del vendedor con una campaña pre-cierre que financia la propia adquisición.',
    bestFor: ['Agencias con CRM activo', 'Negocios con base de clientes monetizable', 'Performance / Media'],
    tactics: [
      { id: 61,  name: 'Defer Close 4DCM',           pillar: 'Bootstrap', contribution: 'Ventana de gestión',   description: 'Diferir cierre 4 días para ejecutar Cash Machine.' },
      { id: 12,  name: 'Rev Share Pre-Sale Tests',   pillar: 'Bootstrap', contribution: '70% del down payment', description: 'Revenue share 50/50 sobre margen bruto de la campaña.' },
      { id: 157, name: 'Media Revenue Share',        pillar: 'Bootstrap', contribution: '30% del down payment', description: 'Acuerdo de participación en ingresos publicitarios futuros.' },
    ],
    steps: [
      'Negociar ventana pre-cierre de 4 días con el vendedor.',
      'Construir oferta agresiva sobre la lista de clientes existente.',
      'Ejecutar 4DCM y reportar en tiempo real al vendedor.',
      'Liquidar 70% del DP con caja generada y fijar 30% sobre ingresos futuros.',
    ],
    risks: ['Calidad/limpieza de la base de datos', 'Burnout de la lista si la oferta es débil'],
    pillarsMix: ['Bootstrap'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-03-carveout',
    number: 3,
    title: 'Carveout de Activos No Esenciales',
    shortTitle: 'Carveout No-Core',
    thesis: 'Capitalizar activos infravalorados o no-core para fondear el precio de compra.',
    bestFor: ['Negocios con real estate', 'Maquinaria ociosa', 'Activos no operativos en balance'],
    tactics: [
      { id: 107, name: 'Real Estate Split-Off',      pillar: 'No Monetario', contribution: '50% del precio',  description: 'Segregar y vender real estate no crítico.' },
      { id: 155, name: 'Seller Trash to Cash',       pillar: 'Bootstrap',    contribution: '20% del precio',  description: 'Liquidar maquinaria obsoleta o chatarra.' },
      { id: 15,  name: 'FMV + Fee Consign Non-Ess.', pillar: 'No Monetario', contribution: '30% del precio',  description: 'Consignar activos no esenciales para liquidación post-cierre.' },
    ],
    steps: [
      'Auditoría exhaustiva del balance: identificar activos no operativos.',
      'Tasar y segregar inmuebles vía Split-Off.',
      'Subastar/consignar el resto y aplicar el flujo al precio.',
    ],
    risks: ['Tiempo de liquidación', 'Resistencia del vendedor a la segregación'],
    pillarsMix: ['No Monetario', 'Bootstrap'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-04-service-pivot',
    number: 4,
    title: 'High-Margin Service Pivot',
    shortTitle: 'Sweat Equity + Consulting',
    thesis: 'Capital intelectual y ejecución como moneda de cambio. Cero efectivo.',
    bestFor: ['Operadores con know-how comprobado', 'Vendedor que valora reestructuración', 'Servicios profesionales'],
    tactics: [
      { id: 2,  name: 'Instant Earn-In',             pillar: 'Equity',       contribution: '20% equity inicial', description: 'Equity inmediato por firma y compromiso de turnaround.' },
      { id: 9,  name: 'Sweat Equity',                pillar: 'Equity',       contribution: '40% equity adicional', description: 'Implementación de sistemas y procesos a cambio de acciones.' },
      { id: 23, name: 'Seller Consulting Offset',    pillar: 'No Monetario', contribution: '40% del precio',     description: 'Compensar precio con consultoría a otras entidades del vendedor.' },
    ],
    steps: [
      'Negociar Earn-In inmediato como ancla de la estructura.',
      'Definir hitos operativos para Sweat Equity (KPIs, plazos).',
      'Cerrar offset de consultoría con scope claro y honorarios documentados.',
    ],
    risks: ['Dependencia del operador', 'Falta de claridad en hitos de Sweat Equity'],
    pillarsMix: ['Equity', 'No Monetario'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-05-sub-to',
    number: 5,
    title: 'Reestructuración de Pasivos "Sub-To"',
    shortTitle: 'Subject-To + Wrap',
    thesis: 'Apalancar la deuda preexistente del vendedor evitando fricción crediticia.',
    bestFor: ['Targets con deuda bancaria asumible', 'Vendedor con deudas personales atadas al negocio'],
    tactics: [
      { id: 53, name: 'Take Ownership Subject-To',   pillar: 'Deuda', contribution: '50% del deal', description: 'Tomar control asumiendo deuda bancaria existente.' },
      { id: 57, name: 'Assume Seller Personal Debt', pillar: 'Deuda', contribution: '20% del deal', description: 'Asumir deudas personales del vendedor.' },
      { id: 30, name: 'Seller Loan + Wrap',          pillar: 'Deuda', contribution: '30% del deal', description: 'Wrap note del vendedor para evitar due-on-sale.' },
    ],
    steps: [
      'Auditoría legal de cláusulas de aceleración y due-on-sale.',
      'Negociar formalización del Sub-To con consentimiento o silencio del banco.',
      'Estructurar wrap note con servicing centralizado.',
    ],
    risks: ['Cláusulas due-on-sale', 'Calidad crediticia del vendedor'],
    pillarsMix: ['Deuda'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-06-consign-inventory',
    number: 6,
    title: 'Consignación de Inventario',
    shortTitle: 'Inventory Consignment',
    thesis: 'Transferir el riesgo de inventario para minimizar capital de trabajo atrapado.',
    bestFor: ['E-commerce', 'Retail', 'Distribución con stock alto'],
    tactics: [
      { id: 58,  name: 'Seller Inventory Consignment', pillar: 'No Monetario', contribution: '60% del valor',    description: 'Vendedor mantiene titularidad del stock.' },
      { id: 172, name: 'Supplier Consignment',         pillar: 'Bootstrap',    contribution: '30% del flujo',    description: 'Nuevos proveedores en consignación.' },
      { id: 196, name: 'Sell Overstock at Discount',   pillar: 'Bootstrap',    contribution: '10% del pago',     description: 'Liquidar stock de baja rotación con descuento agresivo.' },
    ],
    steps: [
      'Mapear inventario por rotación y margen.',
      'Estructurar consignment agreement con vendedor.',
      'Renegociar términos con top-3 proveedores.',
    ],
    risks: ['Disputas sobre titularidad del stock', 'Margen comprimido en overstock'],
    pillarsMix: ['No Monetario', 'Bootstrap'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-07-supplier-alliance',
    number: 7,
    title: 'Triple Alianza de Proveedores',
    shortTitle: 'Supplier Triple Play',
    thesis: 'La cadena de suministro financia el cambio de control.',
    bestFor: ['Negocios con proveedor estratégico dominante', 'Sectores con switching incentives'],
    tactics: [
      { id: 169, name: 'Supplier Invests',           pillar: 'Equity',    contribution: '50% del cierre',     description: 'Proveedor estratégico invierte a cambio de exclusividad.' },
      { id: 171, name: 'Supplier Terms',             pillar: 'Bootstrap', contribution: '30% en flujo',       description: 'Términos extendidos a 120 días.' },
      { id: 193, name: 'Switch-Incentive',           pillar: 'Bootstrap', contribution: '20% del cierre',     description: 'Bono de un competidor por cambiar contrato.' },
    ],
    steps: [
      'Identificar proveedor con mayor incentivo a asegurar volumen.',
      'Estructurar inversión + acuerdo de exclusividad.',
      'Subastar contrato secundario para capturar switch-incentive.',
    ],
    risks: ['Concentración estratégica en un proveedor', 'Calidad de cumplimiento'],
    pillarsMix: ['Equity', 'Bootstrap'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-08-re-slb',
    number: 8,
    title: 'Real Estate Sale-Leaseback (RE-SLB)',
    shortTitle: 'RE Sale-Leaseback',
    thesis: 'Monetizar el patrimonio inmobiliario para fondear la unidad operativa.',
    bestFor: ['Targets con inmuebles operativos propios', 'Negocios con real estate excedente'],
    tactics: [
      { id: 148, name: 'RE Sale-Leaseback',          pillar: 'No Monetario', contribution: '85% del cash',  description: 'Venta simultánea + leaseback del inmueble principal.' },
      { id: 182, name: 'Real Estate Refinance',      pillar: 'Deuda',        contribution: '10% del cash',  description: 'Refinanciar inmuebles secundarios.' },
      { id: 137, name: 'Sublease-Back to Seller',    pillar: 'No Monetario', contribution: '5% del servicio', description: 'Subarrendar excedente al propio vendedor.' },
    ],
    steps: [
      'Tasación independiente del real estate.',
      'Estructurar SLB con cap rate competitivo y plazo largo.',
      'Refinanciar activos secundarios.',
    ],
    risks: ['Cap rates desfavorables', 'Cláusulas restrictivas del lease'],
    pillarsMix: ['No Monetario', 'Deuda'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-09-apprentice',
    number: 9,
    title: 'Adquisición por "Apprentice/Trainer"',
    shortTitle: 'Train-In + Franchise Sale',
    thesis: 'Monetizar la transferencia de conocimiento como fuente del down payment.',
    bestFor: ['Negocios franquiciables', 'Operadores con marca personal en M&A'],
    tactics: [
      { id: 147, name: 'Train-In / Look Over My Shoulder', pillar: 'No Monetario', contribution: '40% del DP',     description: 'Vender plaza de aprendiz a tercero.' },
      { id: 110, name: '3rd Party Franchise Sale',         pillar: 'Equity',       contribution: '60% del DP',     description: 'Pre-venta de derechos territoriales o franquicias.' },
    ],
    steps: [
      'Diseñar programa de aprendizaje con entregables.',
      'Pre-vender franquicias antes del cierre formal.',
    ],
    risks: ['Capacidad de cumplir el programa', 'Saturación territorial'],
    pillarsMix: ['Equity', 'No Monetario'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-10-rollup',
    number: 10,
    title: 'Roll-up de Micro-Competidores',
    shortTitle: 'Roll-up por Stock Swap',
    thesis: 'Consolidación sectorial usando equity como moneda — cero salida de caja.',
    bestFor: ['Sector fragmentado', 'Tesis de arbitraje de múltiplo', 'SPV matriz lista'],
    tactics: [
      { id: 206, name: 'Roll-up',                    pillar: 'Equity', contribution: 'Estructura',     description: 'Consolidar 3+ competidores bajo una SPV.' },
      { id: 143, name: 'Stock Swaps',                pillar: 'Equity', contribution: '100% no cash',   description: 'Intercambio de acciones SPV ↔ targets.' },
      { id: 124, name: 'Straight Merger for Stock',  pillar: 'Equity', contribution: 'Cierre',         description: 'Fusión directa por acciones.' },
    ],
    steps: [
      'Identificar 3-5 targets compatibles.',
      'Definir ratio de canje basado en EBITDA normalizado.',
      'Ejecutar fusiones simultáneas con SPA + Plan of Merger.',
    ],
    risks: ['Choque cultural', 'Integración operativa'],
    pillarsMix: ['Equity'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-11-jay-car',
    number: 11,
    title: '"Jay\'s Car Deal" Pre-Venta de Servicios',
    shortTitle: 'Pre-Sale + Memberships',
    thesis: 'Comprometer capacidad instalada futura para fondear el presente.',
    bestFor: ['Negocios con clientes recurrentes', 'IP fraccionable', 'Clubs / membresías'],
    tactics: [
      { id: 111, name: "Jay's Car Deal",             pillar: 'Bootstrap', contribution: '40%', description: 'Pre-venta de servicios 24 meses a clientes clave.' },
      { id: 154, name: 'Lifetime Memberships',       pillar: 'Bootstrap', contribution: '30%', description: 'Membresías vitalicias con descuento.' },
      { id: 114, name: 'Fractional Rights',          pillar: 'No Monetario', contribution: '30%', description: 'Vender derechos fraccionados sobre IP.' },
    ],
    steps: [
      'Modelar capacidad disponible y precio de pre-venta.',
      'Lanzar campaña Jay\'s Car Deal a top-clientes.',
      'Estructurar fractional rights agreement.',
    ],
    risks: ['Sobreventa de capacidad', 'Cumplimiento a 24 meses'],
    pillarsMix: ['Bootstrap', 'No Monetario'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-12-3p-guaranty',
    number: 12,
    title: 'Garantías de Terceros',
    shortTitle: 'Hypothecation + Co-Sign',
    thesis: 'Colateral externo que absorbe el riesgo institucional sin diluir capital.',
    bestFor: ['Acceso a HNI/garantes con activos', 'Operaciones con buen flujo pero poco colateral propio'],
    tactics: [
      { id: 38,  name: '3rd Party Hypothecation',    pillar: 'Deuda', contribution: '100% colateral', description: 'Activo de tercero como garantía del préstamo.' },
      { id: 91,  name: '3rd Party Co-Signer',        pillar: 'Deuda', contribution: 'Mejora tasa',    description: 'Co-firmante para mejorar condiciones.' },
      { id: 106, name: 'Back-up Loan',               pillar: 'Deuda', contribution: 'Buffer',         description: 'Préstamo standby para baches post-cierre.' },
    ],
    steps: [
      'Identificar garante con activos no apalancados.',
      'Estructurar hypothecation agreement + indemnización.',
      'Negociar préstamo standby como red de seguridad.',
    ],
    risks: ['Dependencia del garante', 'Conflictos en caso de default'],
    pillarsMix: ['Deuda'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-13-broker-partner',
    number: 13,
    title: '"Broker-Partner" Deal',
    shortTitle: 'Broker como Socio',
    thesis: 'Alinear al intermediario para eliminar fricción de cierre.',
    bestFor: ['Deals con broker con comisión alta', 'Brokers receptivos a equity'],
    tactics: [
      { id: 112, name: 'Broker Loan from Commission', pillar: 'Deuda',  contribution: '50% gap del DP', description: 'Broker presta su comisión al adquirente.' },
      { id: 113, name: 'Broker Investment for Equity', pillar: 'Equity', contribution: '50% restante',   description: 'La otra mitad de la comisión se vuelve equity en la SPV.' },
    ],
    steps: [
      'Mostrar al broker que sin esta estructura el deal cae.',
      'Documentar préstamo + suscripción de equity.',
      'Sumar nota del vendedor para llegar al 100%.',
    ],
    risks: ['Conflictos de interés del broker', 'Fragmentación del cap table'],
    pillarsMix: ['Equity', 'Deuda'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-14-earnout',
    number: 14,
    title: 'Earnout Agresivo + Owner Carry',
    shortTitle: 'Earnout 70/30',
    thesis: 'Transferir el riesgo de valoración al rendimiento futuro del activo.',
    bestFor: ['Vendedor confiado en proyecciones', 'EBITDA volátil o en transición'],
    tactics: [
      { id: 138, name: 'Earnout',                    pillar: 'Deuda', contribution: '70% del precio', description: 'Earnout supeditado a metas de EBITDA.' },
      { id: 82,  name: 'Owner Carry (No Interest)',  pillar: 'Deuda', contribution: '30% del precio', description: 'Owner carry sin intereses.' },
      { id: 50,  name: 'Net Sales Cashflow Assign',  pillar: 'Deuda', contribution: 'Mecanismo de pago', description: 'Asignación de % de ventas netas como pago mensual.' },
    ],
    steps: [
      'Definir métricas de earnout claras y auditables.',
      'Estructurar carve-outs anti-manipulación contables.',
      'Acordar % de ventas netas como pago automático.',
    ],
    risks: ['Disputas sobre cálculo del earnout', 'Cambios contables post-cierre'],
    pillarsMix: ['Deuda'],
    phase: 'Pre-Cierre',
  },
  {
    id: 'pb-15-debt-double-tap',
    number: 15,
    title: 'Debt Double Tap',
    shortTitle: 'Debt Double Tap',
    thesis: 'Cerrar 100% con seller note y luego renegociar con descuento agresivo.',
    bestFor: ['Vendedor con preferencia de liquidez post-cierre', 'Capacidad de refinanciar a 6 meses'],
    tactics: [
      { id: 203, name: 'Debt Double Tap',            pillar: 'Deuda', contribution: 'Reducción 30%',  description: 'Pago único con descuento sobre saldo.' },
      { id: 158, name: 'Consolidate Debt',           pillar: 'Deuda', contribution: 'Funding source', description: 'Consolidación de deudas para fondear el pago.' },
      { id: 159, name: 'Debt Restructure',           pillar: 'Deuda', contribution: 'Plazos',         description: 'Reestructuración de pasivos.' },
      { id: 160, name: 'Debt Reduction',             pillar: 'Deuda', contribution: 'Resultado',      description: 'Reducción inmediata del balance.' },
    ],
    steps: [
      'Cierre con 100% seller note y servicing puntual.',
      'A 6 meses: oferta de pago único con descuento.',
      'Fondear vía consolidación + reestructura.',
    ],
    risks: ['Vendedor rechaza el descuento', 'Costo de la nueva deuda'],
    pillarsMix: ['Deuda'],
    phase: 'Híbrida',
  },
];

/* ============================================================
   Eligibilidad: una agencia puede "Ejecutar Playbook" si:
   - Score ≥ 70 (entre los top accionables)
   - Cuadrante = deploy (Inyectar Capital)
   - Tiene oportunidad de ascenso (consolidada para ascensión)
   - DSCR ≥ 2.0 (cobertura total / excelente)
============================================================ */
export interface PlaybookEligibility {
  eligible: boolean;
  score: boolean;
  quadrant: boolean;
  ascension: boolean;
  dscr: boolean;
  reasons: string[];
}

export function getPlaybookEligibility(p: CapitalPriority, agency?: Agency): PlaybookEligibility {
  const a = agency ?? p.agency;
  const score = p.score >= 70;
  const quadrant = p.quadrant === 'deploy';
  const ascension = !!getAscensionOpportunity(a);
  const dscr = calcDSCR(a) >= 2.0;
  const reasons: string[] = [];
  if (!score) reasons.push(`Score ${p.score.toFixed(0)} < 70`);
  if (!quadrant) reasons.push('No está en cuadrante "Inyectar Capital"');
  if (!ascension) reasons.push('Sin candidatura activa para ascenso de nivel');
  if (!dscr) reasons.push(`DSCR ${calcDSCR(a).toFixed(2)}x < 2.0x`);
  return { eligible: score && quadrant && ascension && dscr, score, quadrant, ascension, dscr, reasons };
}

/* ============================================================
   Recomendación: dado el contexto de una agencia, sugiere los
   playbooks más relevantes según pilares disponibles.
============================================================ */
export function recommendPlaybooks(p: CapitalPriority, agency?: Agency): Playbook[] {
  const a = agency ?? p.agency;
  // Heurística simple: priorizar Deuda + Equity para deploy, evitar restructure-only.
  // El usuario igual ve los 15 ordenados.
  const score = (pb: Playbook) => {
    let s = 0;
    if (pb.pillarsMix.includes('Deuda')) s += 2;
    if (pb.pillarsMix.includes('Equity')) s += 1;
    if (pb.phase === 'Pre-Cierre') s += 1;
    if (a.ebitda > 1_000_000 && pb.id === 'pb-10-rollup') s += 2;
    if (a.operatingCashflow > a.debtService * 2 && pb.id === 'pb-01-lbo-corrientes') s += 2;
    return s;
  };
  return [...PLAYBOOKS].sort((x, y) => score(y) - score(x));
}