import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  startRegistration,
  finishRegistration,
  startAuthentication,
  finishAuthentication,
} from "../controllers/webauthn.controller";

const r = Router();

r.post("/register/start", authenticate, startRegistration);
r.post("/register/finish", authenticate, finishRegistration);
r.post("/authenticate/start", authenticate, startAuthentication);
r.post("/authenticate/finish", authenticate, finishAuthentication);

export default r;
