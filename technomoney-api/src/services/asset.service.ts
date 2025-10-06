
import { getTodayRange } from "../utils/date.util";
import { basePriceMap } from "../utils/base-prices.util";
import { AssetDetailDto, AssetSummaryDto } from "../types/assets.types";
import { AssetRepository } from "../repositories/asset.repository";
import {
  AssetRecordRepository,
  AssetRecordUpsert,
} from "../repositories/asset-record.repository";
import { MarketDataService, ApiAsset } from "./market-data.service";
import { AppError } from "../utils/app-error";

interface AssetRecordCache {
  price: number;
  variation: number;
  volume: number;
}

interface AssetEntity {
  id: number;
  tag: string;
  name: string;
}

interface TodayRecord {
  asset_id: number;
  price: number;
  variation: number;
  volume: number;
}

function getRecValues(
  r: unknown
): { price: number; variation: number; volume: number } | null {
  if (!r) return null;
  const o =
    typeof (r as any).get === "function" ? (r as any).get() : (r as any);
  if (o == null) return null;
  return {
    price: Number(o.price),
    variation: Number(o.variation),
    volume: Number(o.volume),
  };
}

const sanitizeNumber = (value: number | null | undefined, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toUpper = (value: string) => value.toUpperCase();

function indexApiAssets(apiAssets: ApiAsset[]) {
  const byTicker = new Map<string, ApiAsset>();
  const byName = new Map<string, ApiAsset>();
  apiAssets.forEach((api) => {
    byTicker.set(toUpper(api.ticker), api);
    byName.set(toUpper(api.nome), api);
  });
  return { byTicker, byName };
}

const computeVariation = (api: ApiAsset, price: number, tag: string) => {
  const base =
    basePriceMap[api.ticker] ?? basePriceMap[tag] ?? basePriceMap[api.nome];
  if (Number.isFinite(api.variacao)) {
    return Number(api.variacao);
  }
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Number((((price - base) / base) * 100).toFixed(2));
};

const mapFundamentals = (api: ApiAsset) => ({
  dy: Number(api.dy),
  roe: Number(api.roe),
  pl: Number(api.pl),
  margem: Number(api.margem),
  ev_ebit: Number(api.ev_ebit),
  liquidez: Number(api.liquidez),
  score: Number(api.score),
});

const cloneArray = <T>(value: T[]): T[] => [...value];

export class AssetService {
  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly recordRepo: AssetRecordRepository,
    private readonly marketData: MarketDataService
  ) {}

  create(tag: string, name: string) {
    return this.assetRepo.findOrCreate(tag, name);
  }

  async getAllToday(): Promise<AssetSummaryDto[]> {
    const assets = (await this.assetRepo.findAll()) as unknown as AssetEntity[];
    if (!assets.length) return [];

    const { start, end } = getTodayRange();
    const [todayRecs, apiAssets] = await Promise.all([
      this.recordRepo.findToday(
        assets.map((a: AssetEntity) => a.id),
        start,
        end
      ),
      this.marketData.fetchAll(),
    ]);

    const recMap = new Map<number, AssetRecordCache>();
    (todayRecs as unknown as TodayRecord[]).forEach((r: TodayRecord) =>
      recMap.set(r.asset_id, {
        price: Number(r.price),
        variation: Number(r.variation),
        volume: Number(r.volume),
      })
    );

    const upserts: AssetRecordUpsert[] = [];
    const index = indexApiAssets(apiAssets);
    const apiByAssetId = new Map<number, ApiAsset>();

    for (const asset of assets) {
      const api =
        index.byTicker.get(toUpper(asset.tag)) ??
        index.byName.get(toUpper(asset.name));
      if (!api) continue;

      const price = sanitizeNumber(api.preco, NaN);
      const volume = sanitizeNumber(api.volume ?? api.liquidez, NaN);
      if (!Number.isFinite(price) || !Number.isFinite(volume)) continue;

      const variation = computeVariation(api, price, asset.tag);
      apiByAssetId.set(asset.id, api);

      const cached = recMap.get(asset.id);
      if (
        !cached ||
        cached.price !== price ||
        cached.volume !== volume ||
        cached.variation !== variation
      ) {
        upserts.push({
          assetId: asset.id,
          price,
          variation,
          volume,
          date: new Date(),
        });
        recMap.set(asset.id, { price, variation, volume });
      }
    }

    if (upserts.length) await this.recordRepo.bulkAdd(upserts);

    return assets
      .filter((a) => recMap.has(a.id) && apiByAssetId.has(a.id))
      .map((a) => {
        const rec = recMap.get(a.id)!;
        const api = apiByAssetId.get(a.id)!;
        return {
          id: a.id,
          tag: a.tag,
          nome: api.nome || a.name,
          setor: api.setor,
          preco: rec.price,
          variacao: rec.variation,
          volume: rec.volume,
          fundamentals: mapFundamentals(api),
        };
      });
  }

  async getByTagToday(tag: string): Promise<AssetDetailDto | null> {
    const asset = (await this.assetRepo.findByTag(
      tag
    )) as unknown as AssetEntity | null;
    if (!asset) return null;

    const api = await this.marketData.fetchByName(asset.tag);
    if (!api)
      throw new AppError(502, "No data from market API for requested asset");

    const price = sanitizeNumber(api.preco, NaN);
    const volume = sanitizeNumber(api.volume ?? api.liquidez, NaN);
    if (!Number.isFinite(price) || !Number.isFinite(volume))
      throw new AppError(502, "No numeric quote from market API");

    const variation = computeVariation(api, price, asset.tag);

    const { start, end } = getTodayRange();
    let rec: any = await this.recordRepo.findLatest(asset.id, start, end);

    const current = getRecValues(rec);
    if (
      !current ||
      current.price !== price ||
      current.volume !== volume ||
      current.variation !== variation
    ) {
      rec = await this.recordRepo.add(
        asset.id,
        price,
        variation,
        volume,
        new Date()
      );
    }

    const latest = getRecValues(rec)!;

    return {
      id: asset.id,
      tag: asset.tag,
      nome: api.nome || asset.name,
      setor: api.setor,
      preco: latest.price,
      variacao: latest.variation,
      volume: latest.volume,
      fundamentals: mapFundamentals(api),
      marketCap: Number(api.marketCap),
      dividendYield: Number(api.dividendYield),
      recomendacao: api.recomendacao,
      analise: api.analise,
      bio: api.bio,
      noticias: cloneArray(api.noticias),
      grafico: cloneArray(api.grafico),
      sede: api.sede,
      industria: api.industria,
      fundacao: Number(api.fundacao),
      empregados: Number(api.empregados),
    };
  }
}
