import { env } from "../config/env";
import type {
  AnalysisRequest,
  AnalysisResponse,
  AgentInsight,
  TrendLabel,
  Fundamentals,
} from "../types/analysis";

const positiveSignals = [
  "crescimento",
  "forte",
  "recorde",
  "otimista",
  "robusto",
  "expansão",
  "melhora",
  "redução de dívida",
  "dividendos",
  "caixa",
];

const negativeSignals = [
  "queda",
  "risco",
  "investigação",
  "pressão",
  "volatilidade",
  "redução",
  "prejuízo",
  "endividamento",
  "incerteza",
  "inflação",
];

const sanitize = (value: unknown): string | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  if (typeof value === "string") return value;
  return undefined;
};

const scoreFromFundamentals = (fundamentals: Fundamentals | undefined): number => {
  if (!fundamentals) return 50;
  const { score, dy, roe, margem, ev_ebit } = fundamentals;
  let total = typeof score === "number" ? score : 50;

  if (typeof dy === "number") total += Math.sign(dy) * Math.min(Math.abs(dy) / 2, 5);
  if (typeof roe === "number") total += roe > 20 ? 8 : roe > 10 ? 4 : -4;
  if (typeof margem === "number") total += margem > 25 ? 5 : margem < 10 ? -5 : 0;
  if (typeof ev_ebit === "number") total += ev_ebit < 8 ? 4 : ev_ebit > 15 ? -6 : 0;

  return Math.max(0, Math.min(100, total));
};

export class AiAgentService {
  analyze(request: AnalysisRequest): AnalysisResponse {
    const { asset, facts, context } = request;
    const baseScore = scoreFromFundamentals(asset.fundamentals);
    let adjustedScore = baseScore;
    const normalizedAnalysis = asset.analise.toLowerCase();
    const insights: AgentInsight[] = [];

    for (const word of positiveSignals) {
      if (normalizedAnalysis.includes(word)) {
        adjustedScore += 2;
        insights.push({
          metric: word,
          impact: "positivo",
          description: `O texto da análise sinaliza \"${word}\" como fator positivo.`,
        });
      }
    }

    for (const word of negativeSignals) {
      if (normalizedAnalysis.includes(word)) {
        adjustedScore -= 3;
        insights.push({
          metric: word,
          impact: "negativo",
          description: `O texto alerta sobre \"${word}\" e reduz a confiança.`,
        });
      }
    }

    if (Array.isArray(asset.noticias)) {
      const dividendNews = asset.noticias.some((n) => /dividend/i.test(n));
      if (dividendNews) {
        adjustedScore += 4;
        insights.push({
          metric: "dividendos",
          impact: "positivo",
          description: "Notícias recentes destacam dividendos, reforçando o apelo de renda.",
        });
      }
    }

    if (typeof asset.variacao === "number") {
      if (asset.variacao > 3) {
        adjustedScore += 2;
        insights.push({
          metric: "variacao",
          impact: "positivo",
          description: "A variação recente acima de 3% sugere momento positivo de curto prazo.",
        });
      } else if (asset.variacao < -3) {
        adjustedScore -= 4;
        insights.push({
          metric: "variacao",
          impact: "negativo",
          description: "Queda acentuada no curto prazo adiciona cautela à tese.",
        });
      }
    }

    const buyThreshold = env.AGENT_BUY_THRESHOLD;
    const holdThreshold = env.AGENT_HOLD_THRESHOLD;

    if (buyThreshold <= holdThreshold) {
      throw new Error("Configuração inválida: AGENT_BUY_THRESHOLD deve ser maior que AGENT_HOLD_THRESHOLD");
    }

    adjustedScore = Math.max(0, Math.min(100, adjustedScore));

    let tendencia: TrendLabel = "Manter";
    if (adjustedScore >= buyThreshold) {
      tendencia = "Comprar";
    } else if (adjustedScore <= holdThreshold) {
      tendencia = "Vender";
    }

    const finalInsights = insights.slice(0, 6);

    if (facts?.setor) {
      finalInsights.push({
        metric: "setor",
        impact: "neutro",
        description: `Setor de atuação: ${facts.setor}.`,
      });
    }

    if (typeof asset.dividendYield === "number") {
      finalInsights.push({
        metric: "dividendYield",
        impact: asset.dividendYield >= 0.05 ? "positivo" : "neutro",
        description: `Dividend Yield atual de ${(asset.dividendYield * 100).toFixed(2)}%.`,
      });
    }

    const rationaleParts: string[] = [];
    const sanitizedBio = sanitize(asset.bio || facts?.industria);
    if (sanitizedBio) {
      rationaleParts.push(`Contexto corporativo: ${sanitizedBio}.`);
    }
    if (context?.analiseTexto && context.analiseTexto !== asset.analise) {
      rationaleParts.push("Resumo original fornecido foi ajustado para refletir sinais recentes.");
    }
    rationaleParts.push(
      `Pontuação fundamental ajustada em ${adjustedScore.toFixed(1)} (base ${baseScore.toFixed(1)}).`
    );

    const analise = [
      asset.analise.trim(),
      rationaleParts.join(" "),
      tendencia === "Comprar"
        ? "Tendência favorável respaldada por geração de caixa e governança monitorada."
        : tendencia === "Vender"
        ? "Pressões identificadas sugerem cautela até que fundamentos melhorem."
        : "Indicadores equilibrados recomendam acompanhar novos gatilhos antes de se posicionar.",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      tendencia,
      analise,
      confidence: Math.round((adjustedScore / 100) * 100) / 100,
      score: {
        base: Number(baseScore.toFixed(2)),
        ajustado: Number(adjustedScore.toFixed(2)),
      },
      insights: finalInsights,
      modelo: env.AGENT_MODEL_NAME,
    };
  }
}
