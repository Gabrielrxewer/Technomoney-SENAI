import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import paymentRoutes from "./routes/payment.routes";
dotenv.config();
const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api", paymentRoutes);
export default app;
