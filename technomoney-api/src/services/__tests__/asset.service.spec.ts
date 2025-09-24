
import assert from "node:assert/strict";
import test from "node:test";
import { AssetService } from "../asset.service";
import type { ApiAsset } from "../market-data.service";

class FakeAssetRepository {
  constructor(private readonly items: any[]) {}

  async findAll() {
    return this.items;
  }

  async findByTag(tag: string) {
    return this.items.find((item) => item.tag === tag) ?? null;
  }

  async findOrCreate(tag: string, name: string) {
    return [{ id: 99, tag, name }, true];
  }
}

class FakeAssetRecordRepository {
  public added: any[] = [];
  public today: any[] = [];
  private latest: any = null;

  async findToday() {
    return this.today;
  }

  async bulkAdd(records: any[]) {
    this.added.push(...records);
    this.today = records.map((r) => ({
      asset_id: r.assetId,
      price: r.price,
      variation: r.variation,
      volume: r.volume,
    }));
  }

  async add(assetId: number, price: number, variation: number, volume: number) {
    this.latest = { asset_id: assetId, price, variation, volume };
    return {
      get: () => ({ price, variation, volume }),
    };
  }

  async findLatest() {
    return this.latest
      ? { get: () => ({
          price: this.latest.price,
          variation: this.latest.variation,
          volume: this.latest.volume,
        }) }
      : null;
  }
}

class FakeMarketDataService {
  constructor(private readonly payload: ApiAsset) {}

  async fetchAll() {
    return [this.payload];
  }

  async fetchByName() {
    return this.payload;
  }
}

test("AssetService enriches market data with fundamentals", async () => {
  const asset = { id: 1, tag: "PETR4", name: "Petrobras PN" };
  const apiAsset: ApiAsset = {
    ticker: "PETR4",
    nome: "Petrobras PN",
    setor: "Energia",
    preco: 42.5,
    variacao: 1.7,
    volume: 12500000,
    dy: 15.1,
    roe: 22.4,
    pl: 3.5,
    margem: 35.7,
    ev_ebit: 2.8,
    liquidez: 12500000,
    score: 84,
    marketCap: 320000000000,
    dividendYield: 0.151,
    recomendacao: "Comprar",
    analise: "Fluxo de caixa forte e política de dividendos agressiva.",
    bio: "Companhia integrada de energia.",
    noticias: [
      "Petrobras expande CAPEX em projetos do pré-sal.",
      "Conselho aprova distribuição extraordinária de dividendos.",
    ],
    grafico: [40, 41, 42, 43],
    sede: "Rio de Janeiro, RJ",
    industria: "Energia",
    fundacao: 1953,
    empregados: 45000,
  };

  const repo = new FakeAssetRepository([asset]);
  const records = new FakeAssetRecordRepository();
  const market = new FakeMarketDataService(apiAsset);
  const service = new AssetService(repo as any, records as any, market as any);

  const all = await service.getAllToday();
  assert.equal(all.length, 1);
  const first = all[0];
  assert.equal(first.tag, "PETR4");
  assert.equal(first.setor, "Energia");
  assert.equal(first.fundamentals.dy, 15.1);
  assert.equal(records.added.length, 1);
  assert.equal(first.variacao, records.added[0].variation);

  const detail = await service.getByTagToday("PETR4");
  assert(detail);
  assert.equal(detail?.marketCap, 320000000000);
  assert.equal(detail?.noticias.length, 2);
  assert.equal(detail?.grafico.at(-1), 43);
  assert.equal(detail?.fundamentals.ev_ebit, 2.8);
});
