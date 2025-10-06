export type TrendLabel = "Comprar" | "Manter" | "Vender";

export interface AiInsight {
  metric: string;
  impact: "positivo" | "negativo" | "neutro";
  description: string;
}

export interface AiAnalysisResponse {
  tendencia: TrendLabel;
  analise: string;
  confidence: number;
  score: {
    base: number;
    ajustado: number;
  };
  insights: AiInsight[];
  modelo: string;
}
