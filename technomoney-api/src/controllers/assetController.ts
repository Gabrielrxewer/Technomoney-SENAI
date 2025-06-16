import { Request, Response } from "express";
import axios from "axios";
import { Op } from "sequelize";
import { Asset, AssetRecord } from "../models";
import { addAssetRecord } from "../services/assetService";

interface Asset {
  id: number;
  tag: string;
  nome: string;
  preco: number;
  variacao: number;
  volume: number;
}

const FAKE_API_ALL = "http://localhost:4001/acoes/all";
const FAKE_API_BY_NAME = "http://localhost:4001/acoes/byname";

const BASE_PRICES = [
  { nome: "PETR4", precoBase: 30.5 },
  { nome: "VALE3", precoBase: 75.8 },
  { nome: "ITUB4", precoBase: 25.9 },
  { nome: "BBDC4", precoBase: 22.3 },
  { nome: "ABEV3", precoBase: 15.4 },
  { nome: "BBAS3", precoBase: 33.1 },
  { nome: "GGBR4", precoBase: 22.0 },
  { nome: "B3SA3", precoBase: 11.5 },
  { nome: "RENT3", precoBase: 50.0 },
  { nome: "JBSS3", precoBase: 30.2 },
  { nome: "LREN3", precoBase: 43.3 },
  { nome: "BRFS3", precoBase: 25.4 },
  { nome: "WEGE3", precoBase: 40.8 },
  { nome: "MGLU3", precoBase: 25.0 },
  { nome: "VVAR3", precoBase: 11.0 },
  { nome: "USIM5", precoBase: 20.7 },
  { nome: "HYPE3", precoBase: 10.9 },
  { nome: "RAIL3", precoBase: 5.2 },
  { nome: "BRAP4", precoBase: 15.8 },
  { nome: "EQTL3", precoBase: 40.9 },
  { nome: "CMIG4", precoBase: 7.5 },
  { nome: "EMBR3", precoBase: 23.0 },
  { nome: "CPLE6", precoBase: 40.0 },
  { nome: "CIEL3", precoBase: 5.0 },
  { nome: "GOLL4", precoBase: 10.5 },
  { nome: "UGPA3", precoBase: 65.0 },
  { nome: "CSAN3", precoBase: 25.0 },
  { nome: "CSNA3", precoBase: 40.0 },
  { nome: "BBDC3", precoBase: 20.9 },
  { nome: "BRKM5", precoBase: 80.0 },
  { nome: "ELET3", precoBase: 30.0 },
  { nome: "ELET6", precoBase: 28.0 },
  { nome: "BBSE3", precoBase: 28.0 },
  { nome: "RECV3", precoBase: 12.0 },
  { nome: "KLBN11", precoBase: 17.0 },
  { nome: "TOTS3", precoBase: 23.0 },
  { nome: "EZTC3", precoBase: 12.0 },
  { nome: "BRDT3", precoBase: 17.0 },
  { nome: "SBSP3", precoBase: 32.0 },
  { nome: "CYRE3", precoBase: 20.0 },
  { nome: "COGN3", precoBase: 6.0 },
  { nome: "LOGG3", precoBase: 16.0 },
  { nome: "JHSF3", precoBase: 20.0 },
  { nome: "SULA11", precoBase: 20.0 },
  { nome: "RAIZ4", precoBase: 7.5 },
  { nome: "TIMS3", precoBase: 12.0 },
  { nome: "HAPV3", precoBase: 14.0 },
  { nome: "YDUQ3", precoBase: 16.0 },
  { nome: "BRML3", precoBase: 10.0 },
  { nome: "IGTI11", precoBase: 20.0 },
  { nome: "CRFB3", precoBase: 15.0 },
  { nome: "MULT3", precoBase: 25.0 },
  { nome: "ENBR3", precoBase: 20.0 },
  { nome: "BRPR3", precoBase: 14.0 },
  { nome: "CPFE3", precoBase: 45.0 },
  { nome: "RADL3", precoBase: 35.0 },
  { nome: "SUZB3", precoBase: 45.0 },
  { nome: "DIRR3", precoBase: 7.5 },
  { nome: "BEEF3", precoBase: 15.0 },
  { nome: "ALPA4", precoBase: 30.0 },
  { nome: "NTCO3", precoBase: 7.0 },
  { nome: "PRIO3", precoBase: 40.0 },
  { nome: "ODPV3", precoBase: 20.0 },
  { nome: "SBFG3", precoBase: 10.0 },
  { nome: "VIVT3", precoBase: 40.0 },
  { nome: "CESP6", precoBase: 35.0 },
  { nome: "BRKM3", precoBase: 78.0 },
  { nome: "RDOR3", precoBase: 6.0 },
  { nome: "FESA4", precoBase: 10.0 },
  { nome: "FIBR3", precoBase: 10.0 },
  { nome: "TAEE11", precoBase: 37.0 },
  { nome: "IGBR3", precoBase: 20.0 },
  { nome: "NTNX11", precoBase: 25.0 },
  { nome: "PCAR3", precoBase: 28.0 },
  { nome: "EVEN3", precoBase: 7.0 },
  { nome: "GFSA3", precoBase: 15.0 },
  { nome: "ITSA4", precoBase: 11.0 },
  { nome: "JSLG3", precoBase: 20.0 },
  { nome: "MRFG3", precoBase: 25.0 },
  { nome: "PSSA3", precoBase: 40.0 },
  { nome: "QUAL3", precoBase: 12.0 },
  { nome: "RAPT4", precoBase: 25.0 },
  { nome: "SANB11", precoBase: 35.0 },
  { nome: "SBSP3", precoBase: 32.0 },
  { nome: "TIMP3", precoBase: 10.0 },
  { nome: "VVAR3", precoBase: 11.0 },
  { nome: "WEGE3", precoBase: 40.8 },
  { nome: "YDUQ3", precoBase: 16.0 },
  { nome: "ZENV3", precoBase: 5.0 },
];

/**
 * @openapi
 * /assets:
 *   post:
 *     summary: Cria um novo asset
 *     tags:
 *       - Assets
 *     requestBody:
 *       description: Tag única e nome completo da empresa
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       '201':
 *         description: Asset criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       '400':
 *         description: Tag ou name faltando
 *       '409':
 *         description: Asset com essa tag já existe
 */
export const createAsset = async (req: Request, res: any) => {
  try {
    const { tag, name } = req.body;
    if (!tag || !name) {
      return res.status(400).json({ error: "Both tag and name are required" });
    }
    const [asset, created] = await Asset.findOrCreate({
      where: { tag },
      defaults: { name },
    });
    if (!created) {
      return res
        .status(409)
        .json({ error: `Asset with tag '${tag}' already exists.` });
    }
    res.status(201).json({ id: asset.id, tag: asset.tag, name: asset.name });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

const basePriceMap = BASE_PRICES.reduce<Record<string, number>>(
  (acc, cur) => ({ ...acc, [cur.nome]: cur.precoBase }),
  {}
);

export async function fetchCurrentAssets(): Promise<
  {
    id: number;
    tag: string;
    nome: string;
    preco: number;
    variacao: number;
    volume: number;
  }[]
> {
  const assets = await Asset.findAll({ attributes: ["id", "tag", "name"] });
  const { start, end } = getTodayRange();
  const todayRecs = await AssetRecord.findAll({
    where: { date: { [Op.gte]: start, [Op.lt]: end } },
    attributes: ["asset_id", "price", "variation", "volume"],
  });
  const recordMap = new Map<
    number,
    { price: number; variation: number; volume: number }
  >();
  for (const r of todayRecs) {
    const { asset_id, price, variation, volume } = r.get();
    recordMap.set(asset_id, { price, variation, volume });
  }
  const missing = assets.filter((a) => !recordMap.has(a.id));
  if (missing.length > 0) {
    const { data: apiList } = await axios.get<
      { nome: string; preco: number; volume: number }[]
    >(FAKE_API_ALL);
    for (const asset of missing) {
      const apiItem = apiList.find(
        (i) => i.nome === asset.tag || i.nome === asset.name
      );
      if (!apiItem || apiItem.preco == null || apiItem.volume == null) continue;
      const precoBase = basePriceMap[apiItem.nome] ?? apiItem.preco;
      const variation = apiItem.preco - precoBase;
      await addAssetRecord(
        asset.id,
        apiItem.preco,
        variation,
        apiItem.volume,
        new Date()
      );
      recordMap.set(asset.id, {
        price: apiItem.preco,
        variation,
        volume: apiItem.volume,
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
      };
    });
}
/**
 * @openapi
 * /assets:
 *   get:
 *     summary: Lista todos os assets com dados de hoje
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de assets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Acao'
 */
export const getAllAssets = async (req: Request, res: Response) => {
  try {
    const lista = await fetchCurrentAssets();
    res.json(lista);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * @openapi
 * /assets/{id}:
 *   get:
 *     summary: Retorna um asset pelo ID
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do asset
 *     responses:
 *       '200':
 *         description: Asset encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Acao'
 *       '404':
 *         description: Asset não encontrado
 */
export const getAssetsById = async (req: Request, res: any) => {
  try {
    const id = parseInt(req.params.id, 10);
    const asset = await Asset.findByPk(id, {
      attributes: ["id", "tag", "name"],
    });
    if (!asset) return res.status(404).json({ error: "Asset not found" });
    const { start, end } = getTodayRange();
    let rec = await AssetRecord.findOne({
      where: { asset_id: id, date: { [Op.gte]: start, [Op.lt]: end } },
      order: [["date", "DESC"]],
    });
    if (!rec) {
      const { data: apiItem } = await axios.post<{
        name: string;
        price: number;
        volume: number;
      }>(FAKE_API_BY_NAME, { name: asset.name });
      const prevClose = apiItem.price;
      const variation = apiItem.price - prevClose;
      rec = await AssetRecord.create({
        asset_id: id,
        price: apiItem.price,
        variation,
        volume: apiItem.volume,
        date: new Date(),
      });
    }
    const { price, variation, volume } = rec.get();
    res.json({
      id: asset.id,
      tag: asset.tag,
      nome: asset.name,
      preco: price,
      variacao: variation,
      volume,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * @openapi
 * /assets/date/{date}:
 *   get:
 *     summary: Retrieves all assets recorded on a specific date
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: 2025-06-12
 *         required: true
 *         description: Date to filter records (YYYY-MM-DD)
 *     responses:
 *       '200':
 *         description: Array of assets recorded on the given date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Acao'
 *       '500':
 *         description: Internal server error
 */

export const getAssetsByDate = async (req: Request, res: Response) => {
  try {
    const target = new Date(req.params.date);
    const start = new Date(target.setHours(0, 0, 0, 0));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const recs = await AssetRecord.findAll({
      where: { date: { [Op.gte]: start, [Op.lt]: end } },
      include: [{ model: Asset, attributes: ["id", "tag", "name"] }],
    });
    const result: Asset[] = recs.map((r) => {
      const { id, tag, name } = r.Asset;
      const { price, variation, volume } = r.get();
      return {
        id,
        tag,
        nome: name,
        preco: price,
        variacao: variation,
        volume,
      };
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * @openapi
 * /assets/sorted/volume:
 *   get:
 *     summary: Retrieves all current assets sorted by descending volume
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Array of assets sorted by volume
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Acao'
 *       '500':
 *         description: Internal server error
 */
export const getAssetsSortedByVolume = async (req: Request, res: Response) => {
  try {
    const lista = await fetchCurrentAssets();
    lista.sort((a, b) => b.volume - a.volume);
    res.json(lista);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
/**
 * @openapi
 * /assets/sorted/price:
 *   get:
 *     summary: Retrieves all current assets sorted by descending price
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Array of assets sorted by price
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Acao'
 *       '500':
 *         description: Internal server error
 */
export const getAssetsSortedByPrice = async (req: Request, res: Response) => {
  try {
    const lista = await fetchCurrentAssets();
    lista.sort((a, b) => b.preco - a.preco);
    res.json(lista);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
