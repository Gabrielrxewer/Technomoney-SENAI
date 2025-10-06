
import axios, { AxiosInstance, AxiosError } from "axios";
import { z } from "zod";
import { AppError } from "../utils/app-error";

const assetSchema = z.object({
  ticker: z.string().min(1),
  nome: z.string().min(1),
  setor: z.string().min(1),
  preco: z.number(),
  variacao: z.number(),
  volume: z.number(),
  dy: z.number(),
  roe: z.number(),
  pl: z.number(),
  margem: z.number(),
  ev_ebit: z.number(),
  liquidez: z.number(),
  score: z.number(),
  marketCap: z.number(),
  dividendYield: z.number(),
  recomendacao: z.string(),
  analise: z.string(),
  bio: z.string(),
  noticias: z.array(z.string()),
  grafico: z.array(z.number()),
  sede: z.string(),
  industria: z.string(),
  fundacao: z.number(),
  empregados: z.number(),
});

export type ApiAsset = z.infer<typeof assetSchema>;

const assetArraySchema = z.array(assetSchema);

function parseAssetList(payload: unknown): ApiAsset[] {
  const result = assetArraySchema.safeParse(payload);
  if (!result.success) {
    throw new AppError(502, "Invalid response from market API");
  }
  return result.data;
}

function parseAsset(payload: unknown): ApiAsset | null {
  if (payload == null) return null;
  const asArray = assetArraySchema.safeParse(payload);
  if (asArray.success) {
    return asArray.data[0] ?? null;
  }
  const asSingle = assetSchema.safeParse(payload);
  if (!asSingle.success) {
    throw new AppError(502, "Invalid response from market API");
  }
  return asSingle.data;
}

export class MarketDataService {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    client: AxiosInstance = axios.create({ timeout: 8000 }),
    baseUrl?: string
  ) {
    this.client = client;
    this.baseUrl =
      baseUrl ?? process.env.MARKET_API_BASE_URL ?? "http://localhost:4001";
  }

  async fetchAll(): Promise<ApiAsset[]> {
    try {
      const { data } = await this.client.get<ApiAsset[]>(
        `${this.baseUrl}/acoes/all`
      );
      return parseAssetList(data);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async fetchByName(name: string): Promise<ApiAsset | null> {
    try {
      const { data } = await this.client.post(`${this.baseUrl}/acoes/byname`, {
        name,
      });
      return parseAsset(data);
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  private wrapError(err: unknown) {
    const e = err as AxiosError;
    return new AppError(
      503,
      `Market API unavailable${e.response ? `: ${e.response.status}` : ""}`
    );
  }
}
