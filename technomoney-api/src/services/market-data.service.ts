import axios, { AxiosInstance } from "axios";

interface ApiAsset {
  nome: string;
  preco: number;
  volume: number;
}

export class MarketDataService {
  private readonly client: AxiosInstance;

  constructor(
    private readonly allUrl = "http://localhost:4001/acoes/all",
    private readonly byNameUrl = "http://localhost:4001/acoes/byname"
  ) {
    this.client = axios.create({ timeout: 8_000 });
  }

  async fetchAll(): Promise<ApiAsset[]> {
    const { data } = await this.client.get<ApiAsset[]>(this.allUrl);
    return data;
  }

  async fetchByName(name: string): Promise<ApiAsset | null> {
    const { data } = await this.client.post<ApiAsset[]>(this.byNameUrl, {
      name,
    });
    return Array.isArray(data) ? data[0] : data ?? null;
  }
}
