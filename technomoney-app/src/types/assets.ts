export interface AssetFundamentals {
  dy: number;
  roe: number;
  pl: number;
  margem: number;
  ev_ebit: number;
  liquidez: number;
  score: number;
}

export interface AssetSummary {
  id: number;
  tag: string;
  nome: string;
  setor: string;
  preco: number;
  variacao: number;
  volume: number;
  fundamentals: AssetFundamentals;
}

export interface AssetDetail extends AssetSummary {
  marketCap: number;
  dividendYield: number;
  recomendacao: string;
  analise: string;
  bio: string;
  noticias: string[];
  grafico: number[];
  sede: string;
  industria: string;
  fundacao: number;
  empregados: number;
}
