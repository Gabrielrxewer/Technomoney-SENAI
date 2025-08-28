import axios, { AxiosInstance, AxiosError } from "axios";
import { AppError } from "../utils/app-error";

export interface ApiAsset {
  nome: string;
  preco: number;
  volume: number;
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
      if (!Array.isArray(data))
        throw new AppError(502, "Invalid response from market API");
      return data;
    } catch (err) {
      const e = err as AxiosError;
      throw new AppError(
        503,
        `Market API unavailable${e.response ? `: ${e.response.status}` : ""}`
      );
    }
  }

  async fetchByName(name: string): Promise<ApiAsset | null> {
    try {
      const { data } = await this.client.post<ApiAsset[]>(
        `${this.baseUrl}/acoes/byname`,
        { name }
      );
      if (!data) return null;
      return Array.isArray(data) ? data[0] ?? null : data;
    } catch (err) {
      const e = err as AxiosError;
      throw new AppError(
        503,
        `Market API unavailable${e.response ? `: ${e.response.status}` : ""}`
      );
    }
  }
}
