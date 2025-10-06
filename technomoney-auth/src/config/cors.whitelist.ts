export const corsOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://seu-dominio.com"]
    : [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://localhost:4000",
      ];
