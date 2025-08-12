import React, { useEffect, useMemo, useState } from "react";
import "../Portfolio/styles/tokens.css";
import "../Portfolio/styles/globals.css";
import Spinner from "../../components/Spinner/Spinner";
import TickerSelectBar, {
  TickerOption,
} from "../Portfolio/TickerSelectBar/TickerSelectBar";
import CompanyAnalytics from "../Portfolio/CompanyAnalytics/CompanyAnalytics";
import CardsInformation from "../Portfolio/CardsInformation/CardsInformation";

import "./PortfolioPage.css";

const mockData = {
  PETR4: {
    nome: "Petrobras",
    preco: "R$ 34,20",
    variacao: "+1.5%",
    volume: "12M",
    marketCap: "R$ 300B",
    dividendYield: "6.2%",
    recomendacao: "Comprar",
    analise:
      "PETR4 costuma oferecer um bom ponto de entrada para quem busca exposição ao setor de energia com dividendos consistentes. Indicada como “Comprar” para horizontes médios (12–24 meses), desde que o investidor tolere volatilidade de commodities e siga o andamento dos leilões de campos e políticas de preço.",
    bio: "A Petrobras é uma empresa brasileira de petróleo e gás, fundada em 1953 e líder no setor energético.",
    grafico: [10, 20, 15, 30, 25, 40, 38, 35, 32, 45, 50, 48, 52] as const,
    noticias: [
      "Petrobras anuncia novos investimentos em energia renovável.",
      "Análise de mercado projeta crescimento das ações PETR4 no próximo trimestre.",
    ] as const,
    setor: "Energia",
    industria: "Petróleo & Gás",
    sede: "Rio de Janeiro, RJ",
    fundacao: 1953,
    empregados: "45k",
  },
  VALE3: {
    nome: "Vale",
    preco: "R$ 68,70",
    variacao: "-0.8%",
    volume: "9M",
    marketCap: "R$ 250B",
    dividendYield: "5.0%",
    recomendacao: "Manter",
    analise:
      "VALE3 é indicada como “Manter” para quem já tem posição, graças à sua resiliência de caixa e posição de liderança de mercado, mas exige acompanhamento próximo do cenário chinês e da calibragem de dividendos. Para entrada, pode valer a pena aguardar oscilações de preço abaixo de R$ 60,00–65,00 para melhorar o ponto de compra.",
    bio: "A Vale é uma mineradora multinacional brasileira, uma das maiores produtoras de minério de ferro do mundo.",
    grafico: [60, 62, 58, 64, 67, 70, 68, 65, 63, 60, 58, 59, 61] as const,
    noticias: [
      "Vale divulga relatório trimestral com queda de receita.",
      "Projeto de logística deve reduzir custos de exportação em 2025.",
    ] as const,
    setor: "Materiais Básicos",
    industria: "Mineração",
    sede: "Rio de Janeiro, RJ",
    fundacao: 1942,
    empregados: "75k",
  },
} as const;

type AcaoTicker = keyof typeof mockData;
type AcaoData = (typeof mockData)[AcaoTicker];

const PortfolioPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [acaoSelecionada, setAcaoSelecionada] = useState<AcaoTicker>("PETR4");
  const [showRSI, setShowRSI] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);

  const locale = "pt-BR";

  const fmtCurrency = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const fmtPercent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  if (isLoading) return <Spinner />;

  const dados: AcaoData = mockData[acaoSelecionada];
  const options: TickerOption[] = (Object.keys(mockData) as AcaoTicker[]).map(
    (t) => ({
      value: t,
      label: `${t} — ${mockData[t].nome}`,
    })
  );

  const serie = dados.grafico as readonly number[];
  const last = serie[serie.length - 1];
  const prev = serie.length > 1 ? serie[serie.length - 2] : last;

  const resumoPreco = Number.isFinite(last)
    ? fmtCurrency.format(last)
    : dados.preco;
  const changePct = prev !== 0 ? ((last - prev) / prev) * 100 : NaN;
  const resumoVariacao = Number.isFinite(changePct)
    ? `${changePct >= 0 ? "+" : ""}${fmtPercent.format(changePct)}%`
    : dados.variacao;

  return (
    <main className="portfolio-page">
      <div className="viewport-grid">
        <TickerSelectBar
          options={options}
          selected={acaoSelecionada}
          onChange={(t) => setAcaoSelecionada(t as AcaoTicker)}
          showRSI={showRSI}
          onToggleRSI={() => setShowRSI((prev) => !prev)}
        />

        <CompanyAnalytics
          chart={{
            id: acaoSelecionada,
            nome: dados.nome,
            data: serie,
            showRSI,
            rsiPeriod: 14,
            decimals: 2,
            locale,
          }}
          resumo={{
            preco: resumoPreco,
            variacao: resumoVariacao,
            nome: dados.nome,
            volume: dados.volume,
            marketCap: dados.marketCap,
            dividendYield: dados.dividendYield,
          }}
          panelHeight={400}
        />

        <CardsInformation
          recomendacao={dados.recomendacao}
          analise={dados.analise}
          bio={dados.bio}
          facts={{
            setor: dados.setor,
            industria: dados.industria,
            sede: dados.sede,
            fundacao: dados.fundacao,
            empregados: dados.empregados,
          }}
          noticias={[...dados.noticias]}
        />
      </div>
    </main>
  );
};

export default PortfolioPage;
