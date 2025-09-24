
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requireDPoPIfBound } from "../middlewares/dpop.middleware";
import { requireAAL2 } from "../middlewares/requireAAL2.middleware";
import {
  createAsset,
  getAllAssets,
  getAssetByTag,
  getAssetsSortedByVolume,
  getAssetsSortedByPrice,
} from "../controllers/asset.controller";

const assetRouter = Router();

assetRouter.use(authenticate, requireDPoPIfBound, requireAAL2);

assetRouter.post("/assets", createAsset);
assetRouter.get("/assets", getAllAssets);
assetRouter.get("/assets/sorted/volume", getAssetsSortedByVolume);
assetRouter.get("/assets/sorted/price", getAssetsSortedByPrice);
assetRouter.get("/assets/:tag", getAssetByTag);

export default assetRouter;
