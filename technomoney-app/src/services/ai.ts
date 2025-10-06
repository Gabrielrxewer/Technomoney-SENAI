import { aiApi } from "./http";
import type { AssetDetail } from "../types/assets";
import type { AiAnalysisResponse } from "../types/ai";

export interface AiAnalysisRequestPayload {
  asset: AssetDetail;
  facts?: {
    setor?: string;
    industria?: string;
    sede?: string;
    fundacao?: string | number;
    empregados?: string | number;
  };
  context?: {
    analiseTexto?: string;
    recomendacaoAnterior?: string;
  };
}

export async function analyzeAsset(
  payload: AiAnalysisRequestPayload,
  signal?: AbortSignal
): Promise<AiAnalysisResponse> {
  const response = await aiApi.post<AiAnalysisResponse>("/v1/analysis", payload, { signal });
  return response.data;
}
