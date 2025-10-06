
import express from "express";
import cors from "cors";
import { acoes, atualizarPrecos } from "./data";

const app = express();
const rawOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions =
  rawOrigins.length && !rawOrigins.includes("*")
    ? { origin: rawOrigins }
    : undefined;
app.use(cors(corsOptions));
app.use(express.json());
const PORT = Number(process.env.PORT || 4001);

app.get("/acoes/all", (_req, res) => {
  res.json(acoes);
});

app.post("/acoes/byname", (req, res: any) => {
  const identifier = String(req.body?.name || "").trim();

  if (!identifier) {
    return res
      .status(400)
      .json({ error: "Campo 'name' obrigatório no body e deve ser string." });
  }

  const termo = identifier.toLowerCase();
  const exact = acoes.find(
    (acao) =>
      acao.ticker.toLowerCase() === termo || acao.nome.toLowerCase() === termo
  );
  if (exact) {
    return res.json([exact]);
  }

  const resultado = acoes.filter((acao) => {
    const ticker = acao.ticker.toLowerCase();
    const nome = acao.nome.toLowerCase();
    const setor = acao.setor.toLowerCase();
    return (
      ticker.includes(termo) || nome.includes(termo) || setor.includes(termo)
    );
  });

  res.json(resultado);
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

atualizarPrecos();

setInterval(() => {
  atualizarPrecos();
  console.log("Preços atualizados");
}, 30 * 1000);
app.listen(PORT, () => {
  console.log(`Fake API rodando na porta ${PORT}`);
});
