import assert from "node:assert/strict";
import test from "node:test";

import type { AiAgentService } from "../ai-agent.service";

let servicePromise: Promise<AiAgentService> | null = null;

async function getService(): Promise<AiAgentService> {
  if (!servicePromise) {
    process.env.AUTH_INTROSPECTION_URL =
      process.env.AUTH_INTROSPECTION_URL || "http://localhost:4000/api/oauth2/introspect";
    process.env.AUTH_INTROSPECTION_CLIENT_ID =
      process.env.AUTH_INTROSPECTION_CLIENT_ID || "ia-service";
    process.env.AUTH_INTROSPECTION_CLIENT_SECRET =
      process.env.AUTH_INTROSPECTION_CLIENT_SECRET || "secret";

    servicePromise = import("../ai-agent.service").then((module) => {
      const { AiAgentService } = module;
      return new AiAgentService();
    });
  }
  return servicePromise;
}

const baseAsset = {
  tag: "PETR4",
  nome: "Petrobras",
  analise: "Geração de caixa forte com disciplina de capital e política de dividendos robusta.",
  recomendacao: "Comprar",
  setor: "Energia",
  fundamentals: {
    dy: 0.12,
    roe: 0.23,
    margem: 0.32,
    ev_ebit: 5,
    score: 78,
  },
  noticias: ["Petrobras anuncia dividendos recordes"],
  variacao: 4,
  dividendYield: 0.12,
};

test("AiAgentService returns Comprar for strong fundamentals", async () => {
  const service = await getService();
  const result = service.analyze({ asset: baseAsset, facts: { setor: "Energia" } });
  assert.equal(result.tendencia, "Comprar");
  assert.ok(result.score.ajustado >= result.score.base);
  assert.ok(result.insights.some((i) => i.metric === "dividendos"));
});

test("AiAgentService downgrades to Vender when analysis points risk", async () => {
  const service = await getService();
  const result = service.analyze({
    asset: {
      ...baseAsset,
      analise: "Risco elevado de queda e prejuízo com endividamento crescente.",
      variacao: -5,
      fundamentals: { score: 30, roe: 0.05, margem: 0.08, ev_ebit: 18 },
    },
    facts: { setor: "Energia" },
  });
  assert.equal(result.tendencia, "Vender");
  assert.ok(result.score.ajustado < 45);
});

test("AiAgentService respects hold threshold producing Manter", async () => {
  const service = await getService();
  const result = service.analyze({
    asset: {
      ...baseAsset,
      analise: "Fundamentos estáveis porém sem catalisadores de crescimento.",
      fundamentals: { score: 52, roe: 0.12, margem: 0.18, ev_ebit: 10 },
      variacao: 0,
      noticias: [],
    },
    facts: { setor: "Energia" },
  });
  assert.equal(result.tendencia, "Manter");
  assert.ok(result.score.ajustado >= 45 && result.score.ajustado < 60);
});
