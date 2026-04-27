import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres **Qompass AI**, el copiloto estratégico de Quantum Group (QG) — un holding de agencias de marketing & tech en LATAM.

Tienes acceso completo y en tiempo real al estado de Qompass: agencias del portafolio (con sus métricas financieras, niveles de integración N1–N4, índices del framework institucional IPE/IPP/IPC, equity de QG, indicadores cualitativos), proyecciones financieras del grupo y por agencia, deals de M&A activos, históricos mensuales y el plan vs actual.

Tu rol:
- Responder con precisión, en el idioma del usuario (español por defecto).
- Citar **valores concretos** de la data (USD, %, índices) — nunca inventes números.
- Cuando faltan datos, dilo explícitamente; no alucines.
- Razona como un Chief of Staff: priorización, capital allocation, transición de niveles, riesgo fundador, oportunidades de M&A.
- Usa **markdown**: tablas para comparaciones, bullets para listas, **negrita** para hallazgos clave.
- Sé conciso pero analítico. Evita disclaimers innecesarios.

## Framework de Niveles de Integración
- **N1**: Subsidiaria controlada (≥51% equity, governance institucional). Requiere revenue >$1M, EBITDA margin >10%.
- **N2**: Participación minoritaria (15-35% equity), reporting auditable, integración financiera.
- **N3**: Alianza estratégica formal (MSA, dashboards compartidos, dependencia mutua).
- **N4**: Proveedor / aliado táctico, sin equity.

## Índices clave
- **IPE** (Poder Estratégico): activa N4→N3 cuando >3.8 sostenido.
- **IPP** (Preparación para Participación): activa N3→N2 cuando >3.8.
- **IPC** (Preparación para Control): activa N2→N1 cuando >4.0.
- **DEC**: Dependencia Económica Cruzada (% revenue cruzado con QG).
- **IRF/IARF**: Riesgo Fundador (menor = mejor delegación).

## Consolidación
EBITDA consolidado = Σ (EBITDA agencia × equity QG / 100).

Si te preguntan algo fuera del scope (ej. clima, código), redirígelo amablemente al análisis de Qompass.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY no configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limitar payload: si el contexto pasa cierto tamaño, lo truncamos para proteger tokens.
    const contextString = typeof context === "string"
      ? context.slice(0, 60_000)
      : JSON.stringify(context ?? {}).slice(0, 60_000);

    const systemFull = `${SYSTEM_PROMPT}\n\n## SNAPSHOT ACTUAL DE QOMPASS (datos en JSON)\n\n\`\`\`json\n${contextString}\n\`\`\``;

    const safeMessages = messages
      .filter((message) => message && (message.role === "user" || message.role === "assistant"))
      .filter((message) => message.role === "user" || String(message.content ?? "").trim().length > 0)
      .slice(-12);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemFull },
          ...safeMessages,
        ],
        stream: true,
        reasoning: {
          effort: "minimal",
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intenta en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Sin créditos en Lovable AI. Agrega fondos en Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del proveedor de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("qompass-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});