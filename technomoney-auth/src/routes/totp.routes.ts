import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { totpVerifyLimiter } from "../middlewares/totpLimiter.middleware";
import {
  status,
  setupStart,
  setupVerify,
  challengeVerify,
} from "../controllers/totp.controller";

const r = Router();

r.get("/status", totpVerifyLimiter, authenticate, status);
r.post("/setup/start", totpVerifyLimiter, authenticate, setupStart);
r.post("/setup/verify", totpVerifyLimiter, authenticate, setupVerify);
r.post("/challenge/verify", totpVerifyLimiter, authenticate, challengeVerify);

export default r;
