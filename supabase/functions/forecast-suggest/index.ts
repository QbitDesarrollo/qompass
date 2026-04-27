// Sugiere supuestos de forecast (revenueGrowth, margins, ocfConversion) usando Lovable AI.
// Recibe el contexto de la agencia (vertical, nivel, métricas históricas) y devuelve
// supuestos optimizados con justificación.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  agencyName?: string;
  vertical?: string;
  nivel?: number;
  country?: string;
  // Históricos resumidos
  trailing12: {
    revenue: number;
    agi: number;
    ebitda: number;
    ocf: number;
    debtService: number;
  };
  current: {
    revenueGrowth: number;
    agiMargin: number;
    ebitdaMargin: number;
    ocfConversion: number;
    debtServiceGrowth: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as Body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un analista financiero senior de Quantum Group, un holding de agencias de marketing en LATAM.
Tu tarea es sugerir supuestos de forecast a 12-36 meses basados en:
- Vertical de la agencia (Creative, Media, BTL, Data/Tech/AI, Contact/Sales)
- Nivel de integración (1=subsidiaria, 2=minoritaria, 3=aliada, 4=proveedor)
- País (México, Colombia, Perú, Chile, Argentina, Ecuador)
- Métricas trailing-12-meses (revenue, AGI, EBITDA, OCF, debt service)
- Supuestos actuales derivados del histórico

Devuelve supuestos REALISTAS para LATAM (no usar growth >5% mensual). Considera:
- Verticales digitales (Media, Data/Tech) crecen más rápido pero con más volatilidad
- BTL y Contact/Sales son más estables pero con menores márgenes
- N1 y N2 (con equity QG) suelen tener mejores márgenes por sinergias del hub
- N3 tiene margen bajo el grupo pero potencial de mejora si se integran

Responde SOLO con tool_call.`;

    const userPrompt = `Agencia: ${body.agencyName || 'Sin nombre'}
Vertical: ${body.vertical || '—'} | Nivel: ${body.nivel ?? '—'} | País: ${body.country || '—'}

Trailing 12 meses (USD):
- Revenue: $${Math.round(body.trailing12.revenue).toLocaleString()}
- AGI: $${Math.round(body.trailing12.agi).toLocaleString()}
- EBITDA: $${Math.round(body.trailing12.ebitda).toLocaleString()}
- OCF: $${Math.round(body.trailing12.ocf).toLocaleString()}
- Debt Service: $${Math.round(body.trailing12.debtService).toLocaleString()}

Supuestos actuales (derivados del histórico):
- Revenue growth mensual: ${(body.current.revenueGrowth * 100).toFixed(2)}%
- AGI margin: ${(body.current.agiMargin * 100).toFixed(1)}%
- EBITDA margin: ${(body.current.ebitdaMargin * 100).toFixed(1)}%
- OCF / EBITDA: ${(body.current.ocfConversion * 100).toFixed(0)}%
- Debt service growth mensual: ${(body.current.debtServiceGrowth * 100).toFixed(2)}%

Sugiere supuestos optimizados para escenario Base (no Bull, no Bear) y justifica brevemente.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_assumptions",
            description: "Sugerir supuestos de forecast.",
            parameters: {
              type: "object",
              properties: {
                revenueGrowth: { type: "number", description: "Crecimiento mensual decimal (-0.05 a 0.06)" },
                agiMargin: { type: "number", description: "AGI/Revenue decimal (0.2 a 0.85)" },
                ebitdaMargin: { type: "number", description: "EBITDA/Revenue decimal (0.02 a 0.45)" },
                ocfConversion: { type: "number", description: "OCF/EBITDA decimal (0.3 a 1.4)" },
                debtServiceGrowth: { type: "number", description: "Crecimiento mensual del DS decimal (-0.02 a 0.03)" },
                rationale: { type: "string", description: "Justificación de 2-3 frases con foco en vertical/nivel/país." },
              },
              required: ["revenueGrowth", "agiMargin", "ebitdaMargin", "ocfConversion", "debtServiceGrowth", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_assumptions" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Intenta en 1 minuto." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos de AI. Recarga en Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ error: "AI no devolvió sugerencia" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forecast-suggest error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
