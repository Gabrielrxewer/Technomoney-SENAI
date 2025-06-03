import stock from "../src/stock.json";

export interface Acao {
  id: number;
  nome: string;
  preco: number;
  volume: number;
  data: number;
}

function gerarAcao(
  item: { nome: string; precoBase: number },
  id: number
): Acao {
  const precoInicial = +(
    item.precoBase *
    (1 + (Math.random() * 0.02 - 0.01))
  ).toFixed(2);
  return {
    id,
    nome: item.nome,
    preco: precoInicial,
    volume: Math.floor(Math.random() * 10000),
    data: Date.now(),
  };
}

export const acoes: Acao[] = stock.map((item, i) => gerarAcao(item, i + 1));

export function atualizarPrecos() {
  acoes.forEach((acao) => {
    const itemBase = stock.find((item) => item.nome === acao.nome);
    if (!itemBase) return;

    const variacao = 1 + (Math.random() * 0.06 - 0.03);
    let novoPreco = +(acao.preco * variacao).toFixed(2);

    const minPreco = itemBase.precoBase * 0.7;
    const maxPreco = itemBase.precoBase * 1.3;
    if (novoPreco < minPreco) novoPreco = minPreco;
    if (novoPreco > maxPreco) novoPreco = maxPreco;

    acao.preco = novoPreco;
    acao.data = Date.now();
  });
}
