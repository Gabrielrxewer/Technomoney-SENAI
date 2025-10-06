import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { AssetService } from "../services/asset.service";
import { AssetRepository } from "../repositories/asset.repository";
import { AssetRecordRepository } from "../repositories/asset-record.repository";
import { MarketDataService } from "../services/market-data.service";
import { AppError } from "../utils/app-error";

const assetService = new AssetService(
  new AssetRepository(),
  new AssetRecordRepository(),
  new MarketDataService()
);

export const createAsset = asyncHandler(async (req: Request, res: Response) => {
  const { tag, name } = req.body;
  if (!tag || !name) throw new AppError(400, "tag & name obrigatórios");

  const [asset, created] = await assetService.create(tag.toUpperCase(), name);
  if (!created) throw new AppError(409, `Asset com tag '${tag}' já existe`);

  res.status(201).json({ id: asset.id, tag: asset.tag, name: asset.name });
});

export const getAllAssets = asyncHandler(
  async (_req: Request, res: Response) => {
    res.json(await assetService.getAllToday());
  }
);

export const getAssetByTag = asyncHandler(
  async (req: Request, res: Response) => {
    const dto = await assetService.getByTagToday(req.params.tag.toUpperCase());
    if (!dto) throw new AppError(404, "Asset não encontrado");
    res.json(dto);
  }
);

const listSorted = async (field: "volume" | "preco") => {
  const list = await assetService.getAllToday();
  return list.sort((a: any, b: any) => b[field] - a[field]);
};

export const getAssetsSortedByVolume = asyncHandler(async (_req, res) => {
  res.json(await listSorted("volume"));
});

export const getAssetsSortedByPrice = asyncHandler(async (_req, res) => {
  res.json(await listSorted("preco"));
});
