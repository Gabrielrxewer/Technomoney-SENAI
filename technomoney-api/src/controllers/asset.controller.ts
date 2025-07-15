import { Request, Response } from "express";
import { AssetService } from "../services/asset.service";

const assetService = new AssetService();

/** POST /assets */
export const createAsset = async (req: Request, res: any) => {
  try {
    const { tag, name } = req.body;
    if (!tag || !name) return res.status(400).json({ error: "tag & name obrigatórios" });
    const [asset, created] = await assetService.create(tag.toUpperCase(), name);
    if (!created)
      return res.status(409).json({ error: `Asset com tag '${tag}' já existe` });
    res.status(201).json({ id: asset.id, tag: asset.tag, name: asset.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

/** GET /assets */
export const getAllAssets = async (_req: Request, res: Response) => {
  try {
    const lista = await assetService.getAllToday();
    res.json(lista);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

/** GET /assets/:tag */
export const getAssetByTag = async (req: Request, res: any) => {
  try {
    const dto = await assetService.getByTagToday(req.params.tag.toUpperCase());
    if (!dto) return res.status(404).json({ error: "Asset não encontrado" });
    res.json(dto);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

/** GET /assets/sorted/volume */
export const getAssetsSortedByVolume = async (_: Request, res: Response) => {
  try {
    const lista = await assetService.getAllToday();
    lista.sort((a, b) => b.volume - a.volume);
    res.json(lista);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

/** GET /assets/sorted/price */
export const getAssetsSortedByPrice = async (_: Request, res: Response) => {
  try {
    const lista = await assetService.getAllToday();
    lista.sort((a, b) => b.preco - a.preco);
    res.json(lista);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};
