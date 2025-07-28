import { Request, Response } from "express";
import { AssetService } from "../services/asset.service";
import { asyncHandler } from "../middlewares/asyncHandler";

const assetService = new AssetService();

/** POST /assets */
export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const { tag, name } = req.body;
  if (!tag || !name) {
    return res.status(400).json({ error: "tag & name obrigatórios" });
  }

  const [asset, created] = await assetService.create(tag.toUpperCase(), name);

  if (!created) {
    return res.status(409).json({ error: `Asset com tag '${tag}' já existe` });
  }

  res.status(201).json({ id: asset.id, tag: asset.tag, name: asset.name });
});

/** GET /assets */
export const getAllAssets = asyncHandler(
  async (_req: Request, res: Response) => {
    const lista = await assetService.getAllToday();
    res.json(lista);
  }
);

/** GET /assets/:tag */
export const getAssetByTag = asyncHandler(
  async (req: Request, res: Response) => {
    const dto = await assetService.getByTagToday(req.params.tag.toUpperCase());
    if (!dto) return res.status(404).json({ error: "Asset não encontrado" });
    res.json(dto);
  }
);

/** GET /assets/sorted/volume */
export const getAssetsSortedByVolume = asyncHandler(
  async (_req: Request, res: Response) => {
    const lista = await assetService.getAllToday();
    lista.sort((a, b) => b.volume - a.volume);
    res.json(lista);
  }
);

/** GET /assets/sorted/price */
export const getAssetsSortedByPrice = asyncHandler(
  async (_req: Request, res: Response) => {
    const lista = await assetService.getAllToday();
    lista.sort((a, b) => b.preco - a.preco);
    res.json(lista);
  }
);
