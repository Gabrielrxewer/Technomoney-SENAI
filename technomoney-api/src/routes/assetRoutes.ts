import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  createAsset,
  getAllAssets,
  getAssetsSortedByVolume,
  getAssetsSortedByPrice,
  getAssetByTag,
} from "../controllers/assetController";

const router = Router();

router.post("/assets", createAsset);
router.get("/assets", getAllAssets);
router.get("/assets/:tag", getAssetByTag);
router.get("/assets/sorted/volume", getAssetsSortedByVolume);
router.get("/assets/sorted/price", getAssetsSortedByPrice);

export default router;
