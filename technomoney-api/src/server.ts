import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import assetRoutes from "./routes/assetRoutes";
import { swaggerSpec } from "./swagger";
import { authenticate } from "./middlewares/authenticate.middleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:4002"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", authenticate, assetRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});
