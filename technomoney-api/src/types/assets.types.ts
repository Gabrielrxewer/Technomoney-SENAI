
export interface AssetFundamentalsDto {
  dy: number;
  roe: number;
  pl: number;
  margem: number;
  ev_ebit: number;
  liquidez: number;
  score: number;
}

export interface AssetSummaryDto {
  id: number;
  tag: string;
  nome: string;
  setor: string;
  preco: number;
  variacao: number;
  volume: number;
  fundamentals: AssetFundamentalsDto;
}

export interface AssetDetailDto extends AssetSummaryDto {
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
