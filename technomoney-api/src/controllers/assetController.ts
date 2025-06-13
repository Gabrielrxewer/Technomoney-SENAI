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

async function fetchCurrentAssets(): Promise<Asset[]> {
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
      { name: string; price: number; volume: number }[]
    >(FAKE_API_ALL);
    for (const asset of missing) {
      const apiItem = apiList.find((i) => i.name === asset.name);
      if (!apiItem) continue;
      const prevClose = apiItem.price;
      const variation = apiItem.price - prevClose;
      await addAssetRecord(
        asset.id,
        apiItem.price,
        variation,
        apiItem.volume,
        new Date()
      );
      recordMap.set(asset.id, {
        price: apiItem.price,
        variation,
        volume: apiItem.volume,
      });
    }
  }

  return assets.map((a) => {
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
