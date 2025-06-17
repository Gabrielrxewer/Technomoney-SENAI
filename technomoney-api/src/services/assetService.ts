import { Asset, AssetRecord } from "../models";

export interface AssetInterface {
  id: number;
  name: string;
}

export interface AssetRecordInterface {
  id: number;
  asset_id: number;
  price: string;
  variation: string;
  volume: number;
  date: Date;
}

export const createAsset = async (name: string): Promise<AssetInterface> => {
  const asset = await Asset.create({ name });
  const { id, name: assetName } = asset.toJSON() as any;
  return { id, name: assetName };
};

export const getAllAssets = async (): Promise<AssetInterface[]> => {
  const assets = await Asset.findAll();
  return assets.map((a) => {
    const { id, name } = a.toJSON() as any;
    return { id, name };
  });
};

export const getAssetById = async (
  id: number
): Promise<AssetInterface | null> => {
  const asset = await Asset.findByPk(id);
  if (!asset) return null;
  const { name } = asset.toJSON() as any;
  return { id, name };
};

export const updateAsset = async (
  id: number,
  fields: Partial<{ name: string }>
): Promise<AssetInterface | null> => {
  const asset = await Asset.findByPk(id);
  if (!asset) return null;
  await asset.update(fields);
  const { name } = asset.toJSON() as any;
  return { id, name };
};

export const deleteAsset = async (id: number): Promise<boolean> => {
  const deletedCount = await Asset.destroy({ where: { id } });
  return deletedCount > 0;
};

export const addAssetRecord = async (
  asset_id: number,
  price: number | string,
  variation: number | string,
  volume: number,
  date: Date
): Promise<AssetRecord> => {
  return AssetRecord.create({
    asset_id,
    price,
    variation,
    volume,
    date,
  });
};

export const getAssetRecordsByAssetId = async (
  asset_id: number
): Promise<AssetRecordInterface[]> => {
  const records = await AssetRecord.findAll({
    where: { asset_id },
    order: [["date", "ASC"]],
  });
  return records.map((r) => r.toJSON() as AssetRecordInterface);
};
