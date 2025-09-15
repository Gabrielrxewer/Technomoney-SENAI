import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  status,
  setupStart,
  setupVerify,
  challengeVerify,
} from "../controllers/totp.controller";

const r = Router();

r.get("/status", authenticate, status);
r.post("/setup/start", authenticate, setupStart);
r.post("/setup/verify", authenticate, setupVerify);
r.post("/challenge/verify", authenticate, challengeVerify);

export default r;
