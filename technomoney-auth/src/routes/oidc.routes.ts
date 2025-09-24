import { Router, RequestHandler } from "express";
import bodyParser from "body-parser";
import { authenticate } from "../middlewares/auth.middleware";
import {
  parHandler,
  authorizeHandler,
  tokenHandler,
  introspectHandler,
  userinfoHandler,
} from "../controllers/oidc.controller";

const router = Router();
router.use(bodyParser.urlencoded({ extended: false }));

router.post("/oauth2/par", parHandler);
router.get(
  "/oauth2/authorize",
  authenticate as RequestHandler,
  authorizeHandler
);
router.post("/oauth2/token", tokenHandler);
router.post("/oauth2/introspect", introspectHandler);
router.get("/oauth2/userinfo", userinfoHandler);

export default router;
