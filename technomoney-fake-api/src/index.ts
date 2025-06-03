import express from "express";
import cors from "cors";
import { acoes, atualizarPrecos } from "./data";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 4001;

app.get("/acoes/all", (req, res) => {
  res.json(acoes);
});

app.post("/acoes/byname", (req, res: any) => {
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    return res
      .status(400)
      .json({ error: "Campo 'name' obrigatório no body e deve ser string." });
  }

  const nomeBusca = name.toLowerCase();
  const resultado = acoes.filter((acao) =>
    acao.nome.toLowerCase().includes(nomeBusca)
  );

  res.json(resultado);
});

atualizarPrecos();

setInterval(() => {
  atualizarPrecos();
  console.log("Preços atualizados");
}, 5 * 1000);
app.listen(PORT, () => {
  console.log(`Fake API rodando na porta ${PORT}`);
});
