import { Request, Response } from "express";

interface Acao {
  id: number;
  nome: string;
  preco: number;
  variacao: number;
  volume: number;
}

const acoesTempoReal: Acao[] = [
  { id: 1, nome: "PETR4", preco: 28.34, variacao: 0.42, volume: 10000 },
  { id: 2, nome: "VALE3", preco: 94.10, variacao: -0.25, volume: 8500 },
  { id: 3, nome: "ITUB4", preco: 25.50, variacao: 0.05, volume: 13000 },
  { id: 4, nome: "BBDC4", preco: 23.22, variacao: -0.12, volume: 7000 },
  { id: 5, nome: "ABEV3", preco: 18.45, variacao: 0.30, volume: 5000 },
  { id: 6, nome: "MGLU3", preco: 7.10, variacao: -0.50, volume: 15000 },
  { id: 7, nome: "GGBR4", preco: 25.50, variacao: 0.22, volume: 6000 },
  { id: 8, nome: "LREN3", preco: 34.00, variacao: -0.10, volume: 3000 },
  { id: 9, nome: "BBAS3", preco: 35.60, variacao: 0.40, volume: 4000 },
  { id: 10, nome: "WEGE3", preco: 42.00, variacao: 0.05, volume: 8000 },
  { id: 11, nome: "RADL3", preco: 17.30, variacao: -0.15, volume: 11000 },
  { id: 12, nome: "USIM5", preco: 14.50, variacao: 0.08, volume: 9000 },
  { id: 13, nome: "HYPE3", preco: 23.70, variacao: -0.04, volume: 12000 },
  { id: 14, nome: "RAIL3", preco: 43.90, variacao: 0.35, volume: 3500 },
  { id: 15, nome: "BRFS3", preco: 18.20, variacao: -0.07, volume: 4500 },
  { id: 16, nome: "CSAN3", preco: 12.50, variacao: 0.18, volume: 2200 },
  { id: 17, nome: "SUZB3", preco: 14.75, variacao: -0.12, volume: 2800 },
  { id: 18, nome: "SBSP3", preco: 28.80, variacao: 0.22, volume: 7000 },
  { id: 19, nome: "ENGI11", preco: 30.00, variacao: -0.02, volume: 6000 },
  { id: 20, nome: "CIEL3", preco: 7.80, variacao: 0.10, volume: 14000 },
];

const dadosAnalise = {
  totalAcoes: acoesTempoReal.length,
  maiorPreco: acoesTempoReal.reduce((prev, curr) =>
    curr.preco > prev.preco ? curr : prev
  ),
  menorPreco: acoesTempoReal.reduce((prev, curr) =>
    curr.preco < prev.preco ? curr : prev
  ),
};

export const getDashboardData = (
  req: Request & { user?: any },
  res: Response
) => {
  const result = 1 + 1;

  res.json({
    user: req.user,
    result,
    acoesTempoReal,
    dadosAnalise,
  });
};
