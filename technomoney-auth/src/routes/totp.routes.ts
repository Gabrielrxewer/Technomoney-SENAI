import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requireDPoP } from "../middlewares/dpop.middleware";
import { totpVerifyLimiter } from "../middlewares/totpLimiter.middleware";
import {
  status,
  setupStart,
  setupVerify,
  challengeVerify,
} from "../controllers/totp.controller";

const r = Router();

r.get("/status", totpVerifyLimiter, authenticate, requireDPoP, status);
r.post("/setup/start", totpVerifyLimiter, authenticate, requireDPoP, setupStart);
r.post("/setup/verify", totpVerifyLimiter, authenticate, requireDPoP, setupVerify);
r.post("/challenge/verify", totpVerifyLimiter, authenticate, requireDPoP, challengeVerify);

export default r;
