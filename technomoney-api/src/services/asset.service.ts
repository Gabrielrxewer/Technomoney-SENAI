import { getTodayRange } from "../utils/date.util";
import { basePriceMap } from "../utils/base-prices.util";
import { AssetDto } from "../types/assets.types";
import { AssetRepository } from "../repositories/asset.repository";
import {
  AssetRecordRepository,
  AssetRecordUpsert,
} from "../repositories/asset-record.repository";
import { MarketDataService } from "./market-data.service";
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

interface ApiAsset {
  nome: string;
  preco: number;
  volume: number;
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

export class AssetService {
  constructor(
    private readonly assetRepo: AssetRepository,
    private readonly recordRepo: AssetRecordRepository,
    private readonly marketData: MarketDataService
  ) {}

  create(tag: string, name: string) {
    return this.assetRepo.findOrCreate(tag, name);
  }

  async getAllToday(): Promise<AssetDto[]> {
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
        price: r.price,
        variation: r.variation,
        volume: r.volume,
      })
    );

    const upserts: AssetRecordUpsert[] = [];
    const apiArr = apiAssets as unknown as ApiAsset[];

    for (const asset of assets) {
      const api = apiArr.find(
        (a: ApiAsset) => a.nome === asset.tag || a.nome === asset.name
      );
      if (!api) continue;

      const price = Number(api.preco);
      const volume = Number(api.volume);
      if (Number.isNaN(price) || Number.isNaN(volume)) continue;

      const base = basePriceMap[api.nome] ?? price;
      const variation = +(price - base).toFixed(2);
      const cached = recMap.get(asset.id);

      if (!cached || cached.price !== price || cached.volume !== volume) {
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
      .filter((a: AssetEntity) => recMap.has(a.id))
      .map((a: AssetEntity) => {
        const { price, variation, volume } = recMap.get(a.id)!;
        return {
          id: a.id,
          tag: a.tag,
          nome: a.name,
          preco: price,
          variacao: variation,
          volume,
        };
      });
  }

  async getByTagToday(tag: string): Promise<AssetDto | null> {
    const asset = (await this.assetRepo.findByTag(
      tag
    )) as unknown as AssetEntity | null;
    if (!asset) return null;

    const api = (await this.marketData.fetchByName(
      asset.tag
    )) as unknown as ApiAsset | null;
    if (!api || api.preco == null || api.volume == null)
      throw new AppError(502, "No data from market API");

    const { start, end } = getTodayRange();
    let rec: any = await this.recordRepo.findLatest(asset.id, start, end);

    const current = getRecValues(rec);
    if (
      !current ||
      current.price !== api.preco ||
      current.volume !== api.volume
    ) {
      const base = basePriceMap[tag] ?? api.preco;
      const variation = +(api.preco - base).toFixed(2);
      rec = await this.recordRepo.add(
        asset.id,
        api.preco,
        variation,
        api.volume,
        new Date()
      );
    }

    const { price, variation, volume } = getRecValues(rec)!;
    return {
      id: asset.id,
      tag: asset.tag,
      nome: asset.name,
      preco: price,
      variacao: variation,
      volume,
    };
  }
}
