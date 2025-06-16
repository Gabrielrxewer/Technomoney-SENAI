import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  createAsset,
  getAllAssets,
  getAssetsByDate,
  getAssetsSortedByVolume,
  getAssetsSortedByPrice,
  getAssetByTag,
} from "../controllers/assetController";

const router = Router();

router.post("/assets", createAsset);
router.get("/assets", getAllAssets);
router.get("/assets/:tag", getAssetByTag);
router.get("/assets/date/:date", authenticate, getAssetsByDate);
router.get("/assets/sorted/volume", authenticate, getAssetsSortedByVolume);
router.get("/assets/sorted/price", authenticate, getAssetsSortedByPrice);

export default router;
