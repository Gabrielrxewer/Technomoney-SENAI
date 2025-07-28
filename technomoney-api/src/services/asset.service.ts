import { getTodayRange } from "../utils/date.util";
import { basePriceMap } from "../utils/base-prices.util";
import { AssetDto } from "../types/assets.types";
import { AssetRepository } from "../repositories/asset.repository";
import { AssetRecordRepository } from "../repositories/asset-record.repository";
import { MarketDataService } from "./market-data.service";

export interface AssetRecordInterface {
  price: number;
  variation: number;
  volume: number;
}

export class AssetService {
  private assetRepo = new AssetRepository();
  private recordRepo = new AssetRecordRepository();
  private marketData = new MarketDataService();

  async create(tag: string, name: string) {
    return this.assetRepo.findOrCreate(tag, name);
  }

  async getAllToday(): Promise<AssetDto[]> {
    const assets = await this.assetRepo.findAll();
    const { start, end } = getTodayRange();

    const todayRecs = await this.recordRepo.findToday(
      assets.map((a) => a.id),
      start,
      end
    );

    const recordMap = new Map<number, AssetRecordInterface>();
    todayRecs.forEach(({ asset_id, price, variation, volume }: any) =>
      recordMap.set(asset_id, { price, variation, volume })
    );

    const apiAssets = await this.marketData.fetchAll();

    for (const asset of assets) {
      const apiInfo = apiAssets.find(
        (a) => a.nome === asset.tag || a.nome === asset.name
      );
      if (!apiInfo) continue;

      const precoNum = Number(apiInfo.preco);
      const volumeNum = Number(apiInfo.volume);
      if (Number.isNaN(precoNum) || Number.isNaN(volumeNum)) continue;

      const precoBase = basePriceMap[apiInfo.nome] ?? precoNum;
      const variation = Number((precoNum - precoBase).toFixed(2));

      const rec = recordMap.get(asset.id);
      const precisaAtualizar =
        !rec || rec.price !== precoNum || rec.volume !== volumeNum;

      if (precisaAtualizar) {
        await this.recordRepo.add(
          asset.id,
          precoNum,
          variation,
          volumeNum,
          new Date()
        );
        recordMap.set(asset.id, {
          price: precoNum,
          variation,
          volume: volumeNum,
        });
      }
    }

    return assets
      .filter((a) => recordMap.has(a.id))
      .map((a) => {
        const rec = recordMap.get(a.id)!;
        return {
          id: a.id,
          tag: a.tag,
          nome: a.name,
          preco: rec.price,
          variacao: rec.variation,
          volume: rec.volume,
        } satisfies AssetDto;
      });
  }

  async getByTagToday(tag: string): Promise<AssetDto | null> {
    const asset = await this.assetRepo.findByTag(tag);
    if (!asset) return null;

    const apiInfo = await this.marketData.fetchByName(asset.tag);
    if (!apiInfo || apiInfo.preco == null || apiInfo.volume == null)
      throw new Error("No data from market API");

    const { preco: precoAtual, volume: volumeAtual } = apiInfo;
    const { start, end } = getTodayRange();

    let rec = await this.recordRepo.findLatest(asset.id, start, end);
    if (!rec || rec.price !== precoAtual || rec.volume !== volumeAtual) {
      const precoBase = basePriceMap[tag] ?? precoAtual;
      const variation = precoAtual - precoBase;
      rec = await this.recordRepo.add(
        asset.id,
        precoAtual,
        variation,
        volumeAtual,
        new Date()
      );
    }

    const { price, variation, volume } = rec.get();
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
