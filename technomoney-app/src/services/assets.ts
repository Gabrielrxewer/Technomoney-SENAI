import { fetchApiWithAuth } from "./http";
import type { AssetDetail, AssetSummary } from "../types/assets";

export async function fetchAssetSummaries(): Promise<AssetSummary[]> {
  const response = await fetchApiWithAuth<AssetSummary[]>("/assets", {
    method: "GET",
  });
  return response.data;
}

export async function fetchAssetDetail(tag: string): Promise<AssetDetail> {
  const response = await fetchApiWithAuth<AssetDetail>(
    `/assets/${encodeURIComponent(tag)}`,
    {
      method: "GET",
    }
  );
  return response.data;
}
