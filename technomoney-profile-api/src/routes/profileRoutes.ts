import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requireScopes } from "../middlewares/scope.middleware";
import { getMyProfile, upsertMyProfile } from "../controllers/profile.controller";

const router = Router();

router.use(authenticate);
router.get("/profile", requireScopes("profile:read"), getMyProfile);
router.put("/profile", requireScopes("profile:write"), upsertMyProfile);
router.patch("/profile", requireScopes("profile:write"), upsertMyProfile);

export default router;
