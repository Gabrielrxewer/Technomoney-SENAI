import { Router } from "express";
import { jwks } from "../controllers/jwks.controller";

const r = Router();
r.get("/jwks.json", jwks);
export default r;
