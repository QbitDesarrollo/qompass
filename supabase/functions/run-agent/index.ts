import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { AGENCIES, AgencyData, buildSnapshot, calcDSCR, dscrStatus, fmtCurrency } from "./agencies-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ============================================================
   Run Agent — endpoint server-side llamado por:
   - cron jobs (pg_cron → net.http_post)
   - botón "Ejecutar ahora" del frontend (opcional)
   Recibe { slug } y ejecuta el agente correspondiente, persistiendo
   run + output (+ alertas para Sentinel/Risk Radar).
============================================================ */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

/* ---------- LLM helper ---------- */

async function reason(systemPrompt: string, userPrompt: string, context: unknown): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  const ctxStr = JSON.stringify(context).slice(0, 80_000);
  const fullSystem = `${systemPrompt}\n\n## DATA DE QOMPASS (JSON)\n\n\`\`\`json\n${ctxStr}\n\`\`\``;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5",
      messages: [
        { role: "system", content: fullSystem },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return (j?.choices?.[0]?.message?.content as string) || "";
}

/* ---------- Run lifecycle ---------- */

async function startRun(agentId: string): Promise<string> {
  const sb = admin();
  const { data, error } = await sb.from("agent_runs").insert({ agent_id: agentId, status: "running" }).select("id").single();
  if (error || !data) throw new Error(`startRun: ${error?.message}`);
  return data.id as string;
}

async function finishRun(runId: string, agentId: string, durationMs: number, summary: string, alertsCreated = 0, status: "success"|"error" = "success") {
  const sb = admin();
  await sb.from("agent_runs").update({ status, duration_ms: durationMs, summary, alerts_created: alertsCreated }).eq("id", runId);
  await sb.from("agents").update({ last_run_at: new Date().toISOString() }).eq("id", agentId);
}

async function saveOutput(agentId: string, runId: string, kind: string, title: string, contentMd: string, data?: unknown): Promise<string> {
  const sb = admin();
  const { data: row, error } = await sb.from("agent_outputs").insert({
    agent_id: agentId, run_id: runId, kind, title, content_md: contentMd, data: data ?? null,
  }).select("id").single();
  if (error || !row) throw new Error(`saveOutput: ${error?.message}`);
  return row.id as string;
}

/* ---------- Sentinel (alertas determinísticas) ---------- */

async function runSentinel(agentId: string, runId: string) {
  const sb = admin();
  const alerts: Array<Record<string, unknown>> = [];
  for (const a of AGENCIES) {
    if (a.debtService > 0) {
      const d = calcDSCR(a);
      const s = dscrStatus(d);
      if (s === "riesgo") {
        alerts.push({
          agent_id: agentId, run_id: runId, severity: "critical",
          title: `${a.name}: DSCR en riesgo (${d.toFixed(2)}x)`,
          body: `OCF ${fmtCurrency(a.operatingCashflow)} vs deuda ${fmtCurrency(a.debtService)}.`,
          entity_type: "agency", entity_id: a.id, metric: "dscr",
        });
      } else if (s === "aceptable") {
        alerts.push({
          agent_id: agentId, run_id: runId, severity: "warning",
          title: `${a.name}: DSCR aceptable (${d.toFixed(2)}x)`,
          body: `Cobertura limitada. Sin margen para nueva deuda.`,
          entity_type: "agency", entity_id: a.id, metric: "dscr",
        });
      }
    }
    if (a.margin < 12) {
      alerts.push({
        agent_id: agentId, run_id: runId, severity: a.margin < 8 ? "critical" : "warning",
        title: `${a.name}: margen EBITDA bajo (${a.margin.toFixed(1)}%)`,
        body: `Margen vs umbral 12%. Revisar pricing o estructura de costos.`,
        entity_type: "agency", entity_id: a.id, metric: "ebitda_margin",
      });
    }
  }
  if (alerts.length) await sb.from("agent_alerts").insert(alerts);
  return { alertsCreated: alerts.length, summary: `${alerts.length} alertas generadas (Sentinel cron).` };
}

/* ---------- Risk Radar (alertas + reporte) ---------- */

async function runRiskRadar(agentId: string, runId: string) {
  const sb = admin();
  const alerts: Array<Record<string, unknown>> = [];
  for (const a of AGENCIES) {
    if (a.irf >= 4) alerts.push({
      agent_id: agentId, run_id: runId,
      severity: a.irf >= 4.5 ? "critical" : "warning",
      title: `${a.name}: riesgo fundador (IRF ${a.irf.toFixed(1)})`,
      body: `Concentración de know-how en el fundador.`,
      entity_type: "agency", entity_id: a.id, metric: "irf",
    });
    if (a.is_ >= 4) alerts.push({
      agent_id: agentId, run_id: runId,
      severity: a.is_ >= 4.5 ? "critical" : "warning",
      title: `${a.name}: alta sustituibilidad (IS ${a.is_.toFixed(1)})`,
      body: `Capacidad reemplazable por competidores.`,
      entity_type: "agency", entity_id: a.id, metric: "is",
    });
  }
  if (alerts.length) await sb.from("agent_alerts").insert(alerts);

  const md = await reason(
    `Eres Risk Radar. Genera el reporte de riesgo del portafolio Quantum Group con: top 5 riesgos, detalle por agencia en zona roja, riesgos sistémicos y decisiones para el board. Markdown ejecutivo.`,
    `Genera el risk radar consolidado en español, conciso y accionable.`,
    { agencies: AGENCIES }
  );
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  await saveOutput(agentId, runId, "risk_radar", `Risk Radar — ${today}`, md);
  return { alertsCreated: alerts.length, summary: `${alerts.length} alertas + reporte de riesgo.` };
}

/* ---------- DSCR Watchdog (alertas determinísticas) ---------- */

async function runDscrWatchdog(agentId: string, runId: string) {
  const sb = admin();
  const alerts: Array<Record<string, unknown>> = [];
  for (const a of AGENCIES) {
    if (!a.debtService || a.debtService <= 0) {
      if (a.operatingCashflow > 400_000 && a.nivel <= 2) {
        alerts.push({
          agent_id: agentId, run_id: runId, severity: "info",
          title: `${a.name}: capacidad ociosa de leverage`,
          body: `OCF ${fmtCurrency(a.operatingCashflow)} sin deuda. Evaluar leverage.`,
          entity_type: "agency", entity_id: a.id, metric: "leverage_capacity",
        });
      }
      continue;
    }
    const d = calcDSCR(a);
    const s = dscrStatus(d);
    if (s === "riesgo") {
      alerts.push({
        agent_id: agentId, run_id: runId, severity: "critical",
        title: `${a.name}: DSCR en riesgo (${d.toFixed(2)}x)`,
        body: `OCF ${fmtCurrency(a.operatingCashflow)} vs deuda ${fmtCurrency(a.debtService)}.`,
        entity_type: "agency", entity_id: a.id, metric: "dscr",
      });
    } else if (s === "aceptable") {
      alerts.push({
        agent_id: agentId, run_id: runId, severity: "warning",
        title: `${a.name}: DSCR aceptable (${d.toFixed(2)}x)`,
        body: `Cobertura limitada. Sin margen para nueva deuda.`,
        entity_type: "agency", entity_id: a.id, metric: "dscr",
      });
    } else if (d >= 2.5) {
      alerts.push({
        agent_id: agentId, run_id: runId, severity: "info",
        title: `${a.name}: capacidad ociosa (DSCR ${d.toFixed(2)}x)`,
        body: `Cobertura holgada. Evaluar deuda adicional para acelerar M&A.`,
        entity_type: "agency", entity_id: a.id, metric: "leverage_capacity",
      });
    }
  }
  if (alerts.length) await sb.from("agent_alerts").insert(alerts);
  return { alertsCreated: alerts.length, summary: `${alerts.length} señales DSCR (cron).` };
}

/* ---------- LLM-only agents ---------- */

async function runLLMAgent(agentId: string, runId: string, opts: {
  systemPrompt: string;
  userPrompt: string;
  context: unknown;
  kind: string;
  titlePrefix: string;
}) {
  const md = await reason(opts.systemPrompt, opts.userPrompt, opts.context);
  const today = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  await saveOutput(agentId, runId, opts.kind, `${opts.titlePrefix} — ${today}`, md);
  return { alertsCreated: 0, summary: `${opts.titlePrefix} generado por cron.` };
}

const SNAPSHOT = () => buildSnapshot();

const LLM_AGENTS: Record<string, { systemPrompt: string; userPrompt: string; context: () => unknown; kind: string; titlePrefix: string }> = {
  "capital-allocator": {
    systemPrompt: `Eres Capital Allocator. Recomienda allocation de $5M entre las top oportunidades del portafolio. Markdown ejecutivo con tabla de tickets, racional, NO invertir y checkpoints.`,
    userPrompt: `Tenemos $5M para desplegar este trimestre. Analiza el portafolio y entrega tu recomendación.`,
    context: () => ({ capitalPoolUSD: 5_000_000, snapshot: SNAPSHOT() }),
    kind: "capital_allocation", titlePrefix: "Allocation $5M",
  },
  "ascension-coach": {
    systemPrompt: `Eres Ascension Coach. Diseña roadmaps de 90 días para que cada agencia suba de nivel (N4→N3 con IPE>3.8, N3→N2 con IPP>3.8, N2→N1 con IPC>4.0 + revenue>$1M + margin>10%). Markdown con resumen y roadmap por agencia.`,
    userPrompt: `Construye los roadmaps de ascensión priorizando agencias más cerca de su transición.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "ascension_roadmap", titlePrefix: "Roadmaps de ascensión",
  },
  "board-reporter": {
    systemPrompt: `Eres Board Reporter. Produce el board pack mensual de Quantum Group con: executive summary, KPIs vs plan, highlights, riesgos, pipeline M&A, decisiones requeridas y próximos 30 días. Markdown institucional.`,
    userPrompt: `Genera el board pack del mes. Conciso, ejecutivo, con tablas.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "board_pack", titlePrefix: "Board Pack",
  },
  "deal-scout": {
    systemPrompt: `Eres Deal Scout. Detecta gaps en el portafolio LATAM y propón 3-5 targets sintéticos plausibles (nombres realistas, ciudades, montos) con racional estratégico y primera acción.`,
    userPrompt: `Analiza el portafolio. Detecta gaps y propón targets.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "deal_scouting", titlePrefix: "Deal Scout",
  },
  "forecaster": {
    systemPrompt: `Eres Forecaster. Genera proyección 12m con escenarios bear/base/bull, drivers principales, outliers (agencias que aceleran/frenan) y confidence level. Markdown con tabla bottom-line.`,
    userPrompt: `Genera el forecast 12m del grupo.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "forecast_12m", titlePrefix: "Forecast 12m",
  },
  "synergy-hunter": {
    systemPrompt: `Eres Synergy Hunter. Detecta sinergias activables en 90 días entre las agencias del holding (cross-sell, bundling, capability sharing, geographic, procurement). Sé específico.`,
    userPrompt: `Detecta sinergias de mayor impacto financiero.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "synergy_map", titlePrefix: "Synergy map",
  },
  "dd-coordinator": {
    systemPrompt: `Eres DD Coordinator. Como no recibís deals activos en este cron, generá un reporte general de mejores prácticas DD aplicadas al pipeline de Quantum (Halo, Atlas, Vertex). Sé operativo.`,
    userPrompt: `Resume el estado típico del DD y próximas acciones recomendadas.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "dd_status", titlePrefix: "DD Status",
  },
  "valuation-agent": {
    systemPrompt: `Eres Valuation Agent. Recalcula valuación con múltiplos comparables, sensibilidades (-10% EBITDA, -1x múltiplo) y rango low/mid/high. Bandera 🟢/🟡/🔴.`,
    userPrompt: `Genera reporte de valuación para deals tipo del pipeline.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "valuation_review", titlePrefix: "Valuation review",
  },
  "stakeholder-comms": {
    systemPrompt: `Eres Stakeholder Comms. Redacta carta a inversionistas (institucional) + comunicación interna (humana, directa). Mismos hechos, tonos distintos. Sin inventar números.`,
    userPrompt: `Redacta las dos piezas para este trimestre.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "stakeholder_comms", titlePrefix: "Comms pack",
  },
  "index-tracker": {
    systemPrompt: `Eres Index Tracker. Calculá IPE/IPP/IPC del snapshot y reportá agencias listas para transición de nivel (N4→N3 IPE>3.8, N3→N2 IPP>3.8, N2→N1 IPC>4 + rev>$1M + margin>10%). Markdown con tablas.`,
    userPrompt: `Reporte mensual de index tracking. Conciso y accionable.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "index_tracking", titlePrefix: "Index Tracker",
  },
  "ic-memo-writer": {
    systemPrompt: `Eres IC Memo Writer. Generá memo template de Investment Committee con executive summary, rationale, financials, tesis, riesgos, valuación, sinergias y recomendación. Tono institucional.`,
    userPrompt: `Generá un memo IC template para un deal genérico del pipeline LATAM.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "ic_memo", titlePrefix: "IC Memo",
  },
  "founder-risk-mitigator": {
    systemPrompt: `Eres Founder Risk Mitigator. Para cada agencia con IRF>=3.5 generá plan de mitigación 90 días: documentar, formar #2, diversificar comercial, KPI de transferencia. Específico por agencia.`,
    userPrompt: `Generá los planes de mitigación de riesgo fundador.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "founder_risk_plan", titlePrefix: "Founder Risk Plan",
  },
  "scenario-simulator": {
    systemPrompt: `Eres Scenario Simulator. Generá 3 escenarios what-if combinando deals + ascensos + ajustes de capital. Para cada uno: acciones, impacto en EBITDA consolidado, exit value (8x), DSCR del grupo y capital requerido.`,
    userPrompt: `Corré 3 escenarios concretos para evaluar este trimestre.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "scenario_simulation", titlePrefix: "Scenarios",
  },
  "lp-investor-updater": {
    systemPrompt: `Eres LP Investor Updater. Redactá update trimestral institucional a LPs: performance, highlights, lo que no salió, capital deployment, outlook 90d. Tono sobrio tipo Brookfield/Howard Marks. Sin inventar números.`,
    userPrompt: `Redactá el LP update del trimestre con datos reales del snapshot.`,
    context: () => ({ snapshot: SNAPSHOT() }),
    kind: "lp_update", titlePrefix: "LP Update",
  },
};

/* ---------- Main handler ---------- */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const t0 = performance.now();
  let agentId = "";
  let runId = "";

  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = admin();
    const { data: agent, error: aErr } = await sb.from("agents").select("id, slug, name, enabled").eq("slug", slug).single();
    if (aErr || !agent) {
      return new Response(JSON.stringify({ error: `Agente '${slug}' no encontrado` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!agent.enabled) {
      return new Response(JSON.stringify({ error: `Agente '${slug}' deshabilitado` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    agentId = agent.id as string;
    runId = await startRun(agentId);

    let result: { alertsCreated: number; summary: string };

    if (slug === "sentinel") {
      result = await runSentinel(agentId, runId);
    } else if (slug === "risk-radar") {
      result = await runRiskRadar(agentId, runId);
    } else if (slug === "dscr-watchdog") {
      result = await runDscrWatchdog(agentId, runId);
    } else if (slug === "agency-copilot" || slug === "meeting-prep") {
      // requiere parámetro — no se schedulea, se ejecuta on-demand desde el frontend
      throw new Error(`${slug} requires per-agency parameter; use frontend runner`);
    } else if (LLM_AGENTS[slug]) {
      const cfg = LLM_AGENTS[slug];
      result = await runLLMAgent(agentId, runId, {
        systemPrompt: cfg.systemPrompt, userPrompt: cfg.userPrompt,
        context: cfg.context(), kind: cfg.kind, titlePrefix: cfg.titlePrefix,
      });
    } else {
      throw new Error(`No runner registered for slug '${slug}'`);
    }

    const durationMs = Math.round(performance.now() - t0);
    await finishRun(runId, agentId, durationMs, result.summary, result.alertsCreated, "success");

    return new Response(JSON.stringify({ ok: true, runId, ...result, durationMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("run-agent error:", msg);
    if (runId && agentId) {
      try {
        await finishRun(runId, agentId, Math.round(performance.now() - t0), `Error: ${msg}`, 0, "error");
      } catch (_) { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});