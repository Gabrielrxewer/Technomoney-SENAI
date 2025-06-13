import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  createAsset,             
  getAllAssets,
  getAssetsById,
  getAssetsByDate,
  getAssetsSortedByVolume,
  getAssetsSortedByPrice,
} from "../controllers/assetController";

const router = Router();

router.post("/assets", createAsset);
router.get("/assets", getAllAssets);
router.get("/assets/:id", getAssetsById);
router.get("/assets/date/:date", authenticate, getAssetsByDate);
router.get("/assets/sorted/volume", authenticate, getAssetsSortedByVolume);
router.get("/assets/sorted/price", authenticate, getAssetsSortedByPrice);

export default router;
