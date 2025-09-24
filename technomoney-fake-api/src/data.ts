
import stock from "./stock.json";

export interface ApiAsset {
  ticker: string;
  nome: string;
  setor: string;
  preco: number;
  variacao: number;
  volume: number;
  dy: number;
  roe: number;
  pl: number;
  margem: number;
  ev_ebit: number;
  liquidez: number;
  score: number;
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

type RawAsset = {
  ticker: string;
  nome: string;
  setor: string;
  precoBase: number;
  volumeBase: number;
  variacaoBase?: number;
  dy: number;
  roe: number;
  pl: number;
  margem: number;
  ev_ebit: number;
  score: number;
  marketCap?: number;
  dividendYield?: number;
  recomendacao?: string;
  analise?: string;
  bio?: string;
  noticias?: string[];
  grafico?: number[];
  sede?: string;
  industria?: string;
  fundacao?: number;
  empregados?: number;
};

type AssetState = {
  raw: RawAsset;
  snapshot: ApiAsset;
  baseMarketCap: number;
};

const rawData = stock as RawAsset[];

const states: AssetState[] = rawData.map((raw) => {
  const price = round2(raw.precoBase * (1 + (Math.random() * 0.02 - 0.01)));
  const volume = randomVolume(raw.volumeBase);
  const grafico = raw.grafico ? [...raw.grafico] : generateHistory(raw.precoBase);
  const noticias = raw.noticias && raw.noticias.length ? [...raw.noticias] : defaultNews(raw);
  const analise = raw.analise ?? defaultAnalysis(raw);
  const bio = raw.bio ?? defaultBio(raw);
  const recomendacao = raw.recomendacao ?? defaultRecommendation(raw.score);
  const industria = raw.industria ?? raw.setor;
  const sede = raw.sede ?? "São Paulo, SP";
  const fundacao = raw.fundacao ?? 1990;
  const empregados = raw.empregados ?? 10000;
  const baseMarketCap = raw.marketCap ?? raw.precoBase * raw.volumeBase * 180;
  const marketCap = computeMarketCap(baseMarketCap, price, raw.precoBase);
  const dividendYield = raw.dividendYield ?? raw.dy / 100;

  return {
    raw,
    baseMarketCap,
    snapshot: {
      ticker: raw.ticker,
      nome: raw.nome,
      setor: raw.setor,
      preco: price,
      variacao: computeVariation(raw.precoBase, price, raw.variacaoBase),
      volume,
      dy: round1(raw.dy),
      roe: round1(raw.roe),
      pl: round1(raw.pl),
      margem: round1(raw.margem),
      ev_ebit: round1(raw.ev_ebit),
      liquidez: volume,
      score: raw.score,
      marketCap,
      dividendYield: round4(dividendYield),
      recomendacao,
      analise,
      bio,
      noticias,
      grafico,
      sede,
      industria,
      fundacao,
      empregados,
    },
  };
});

export const acoes: ApiAsset[] = states.map((state) => state.snapshot);

export function atualizarPrecos() {
  const now = Date.now();
  states.forEach((state) => {
    const { raw, snapshot, baseMarketCap } = state;
    const drift = raw.variacaoBase ?? 0;
    const randomBand = drift === 0 ? 0.025 : 0.02;
    const delta = drift / 100 + (Math.random() * randomBand - randomBand / 2);
    const next = round2(snapshot.preco * (1 + delta));
    const min = raw.precoBase * 0.6;
    const max = raw.precoBase * 1.5;
    const preco = clamp(next, min, max);
    const volume = randomVolume(raw.volumeBase);
    snapshot.preco = preco;
    snapshot.variacao = computeVariation(raw.precoBase, preco, raw.variacaoBase);
    snapshot.volume = volume;
    snapshot.liquidez = volume;
    snapshot.marketCap = computeMarketCap(baseMarketCap, preco, raw.precoBase);
    snapshot.dividendYield = round4(raw.dividendYield ?? raw.dy / 100);
    updateHistory(snapshot.grafico, preco, now);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomVolume(base: number) {
  const factor = 1 + (Math.random() * 0.3 - 0.15);
  return Math.max(100000, Math.round(base * factor));
}

function computeVariation(base: number, price: number, fallback?: number) {
  if (!Number.isFinite(base) || base <= 0) return round2(fallback ?? 0);
  const pct = ((price - base) / base) * 100;
  return round2(Number.isFinite(pct) ? pct : fallback ?? 0);
}

function computeMarketCap(base: number, price: number, reference: number) {
  if (!Number.isFinite(reference) || reference <= 0) return round2(base);
  return round2(base * (price / reference));
}

function generateHistory(base: number, points = 32) {
  const arr: number[] = [];
  let current = base;
  for (let i = 0; i < points; i += 1) {
    const delta = Math.random() * 0.04 - 0.02;
    current = clamp(round2(current * (1 + delta)), base * 0.6, base * 1.4);
    arr.push(current);
  }
  return arr;
}

function updateHistory(history: number[], price: number, timestamp: number) {
  history.push(price);
  if (history.length > 120) history.shift();
  void timestamp;
}

function defaultRecommendation(score: number) {
  if (score >= 85) return "Comprar";
  if (score >= 75) return "Manter";
  return "Observação";
}

function defaultAnalysis(raw: RawAsset) {
  return `${raw.nome} mantém fundamentos consistentes dentro do setor ${raw.setor}. O preço-alvo depende da execução de ganhos de eficiência e disciplina financeira nos próximos trimestres.`;
}

function defaultBio(raw: RawAsset) {
  return `${raw.nome} é uma companhia brasileira de referência no setor de ${raw.setor.toLowerCase()}, com histórico de governança e atuação nacional.`;
}

function defaultNews(raw: RawAsset) {
  return [
    `${raw.nome} divulga atualização operacional destacando foco em eficiência e governança.`,
    `Analistas acompanham ${raw.ticker} após variação recente dos preços no segmento de ${raw.setor.toLowerCase()}.`,
  ];
}

function round1(value: number) {
  return Number(value.toFixed(1));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function round4(value: number) {
  return Number(value.toFixed(4));
}
