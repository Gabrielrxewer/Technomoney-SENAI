import { z } from "zod";

export const fundamentalsSchema = z
  .object({
    dy: z.number().optional(),
    roe: z.number().optional(),
    pl: z.number().optional(),
    margem: z.number().optional(),
    ev_ebit: z.number().optional(),
    liquidez: z.number().optional(),
    score: z.number().optional(),
  })
  .partial();

export const factsSchema = z
  .object({
    setor: z.string().optional(),
    industria: z.string().optional(),
    sede: z.string().optional(),
    fundacao: z.union([z.string(), z.number()]).optional(),
    empregados: z.union([z.string(), z.number()]).optional(),
  })
  .partial();

export const assetDetailSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  tag: z.string().min(1),
  nome: z.string().min(1),
  setor: z.string().optional(),
  preco: z.number().optional(),
  variacao: z.number().optional(),
  volume: z.number().optional(),
  fundamentals: fundamentalsSchema.optional(),
  marketCap: z.number().optional(),
  dividendYield: z.number().optional(),
  recomendacao: z.string().optional(),
  analise: z.string().min(1),
  bio: z.string().optional(),
  noticias: z.array(z.string()).optional(),
  grafico: z.array(z.number()).optional(),
  sede: z.string().optional(),
  industria: z.string().optional(),
  fundacao: z.union([z.number(), z.string()]).optional(),
  empregados: z.union([z.number(), z.string()]).optional(),
});

export const analysisRequestSchema = z.object({
  asset: assetDetailSchema,
  facts: factsSchema.optional(),
  context: z
    .object({
      analiseTexto: z.string().optional(),
      recomendacaoAnterior: z.string().optional(),
    })
    .optional(),
});

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type AssetDetailInput = z.infer<typeof assetDetailSchema>;
export type Fundamentals = z.infer<typeof fundamentalsSchema>;
export type Facts = z.infer<typeof factsSchema>;

export type TrendLabel = "Comprar" | "Manter" | "Vender";

export type AgentInsight = {
  metric: string;
  impact: "positivo" | "negativo" | "neutro";
  description: string;
};

export type AnalysisResponse = {
  tendencia: TrendLabel;
  analise: string;
  confidence: number;
  score: {
    base: number;
    ajustado: number;
  };
  insights: AgentInsight[];
  modelo: string;
};
