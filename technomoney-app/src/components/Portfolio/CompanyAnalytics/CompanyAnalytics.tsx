import React from "react";
import PriceChart from "../PriceChart/PriceChart";
import SummaryStrip from "../SummaryStrip/SummaryStrip";
import InfoCardsGrid, { InfoCardItem } from "../InfoCardsGrid/InfoCardsGrid";
import "./CompanyAnalytics.css";

type ChartProps = {
  id: string;
  nome: string;
  data: readonly number[];
  showRSI?: boolean;
  rsiPeriod?: number;
  decimals?: number;
  locale?: string;
  loading?: boolean;
  rsiLevels?: { upper?: number; lower?: number };
};

type ResumoProps = {
  preco: string;
  variacao: string;
  nome: string;
  volume: string;
  marketCap: string;
  dividendYield: string;
};

export type CompanyAnalyticsProps = {
  chart: ChartProps;
  resumo?: ResumoProps;
  preco?: string;
  variacao?: string;
  nome?: string;
  volume?: string;
  marketCap?: string;
  dividendYield?: string;
  panelHeight?: number | string;
};

export default function CompanyAnalytics({
  chart,
  resumo,
  preco,
  variacao,
  nome,
  volume,
  marketCap,
  dividendYield,
  panelHeight = 300,
}: CompanyAnalyticsProps) {
  const resumoFinal: ResumoProps = resumo ?? {
    preco: preco ?? "",
    variacao: variacao ?? "",
    nome: nome ?? chart.nome,
    volume: volume ?? "-",
    marketCap: marketCap ?? "-",
    dividendYield: dividendYield ?? "-",
  };

  const caPanelH =
    typeof panelHeight === "number" ? `${panelHeight}px` : panelHeight;

  const infoItems: InfoCardItem[] = [
    { title: "Setor", value: "Minerais & Metais", detail: "Básicos" },
    { title: "P/L", value: "7,8", detail: "Últimos 12m" },
    { title: "Beta (2y)", value: "1,12", detail: "Volatilidade" },
    { title: "Free Float", value: "82%", detail: "Ações no mercado" },
  ];

  return (
    <section
      className="company-analytics"
      aria-label={`Visão da empresa ${resumoFinal.nome}`}
      style={{ ["--ca-panel-h" as any]: caPanelH }}
    >
      <div className="company-analytics__left" aria-label="Painel do gráfico">
        <PriceChart
          id={chart.id}
          nome={chart.nome}
          data={chart.data}
          showRSI={chart.showRSI}
          rsiPeriod={chart.rsiPeriod}
          decimals={chart.decimals}
          locale={chart.locale}
          loading={chart.loading}
          rsiLevels={chart.rsiLevels}
          fullWidth={false}
          height="100%"
          className="as-panel"
        />
      </div>

      <aside
        className="company-analytics__right"
        aria-label="Painel de informações"
      >
        <SummaryStrip
          preco={resumoFinal.preco}
          variacao={resumoFinal.variacao}
          nome={resumoFinal.nome}
          volume={resumoFinal.volume}
          marketCap={resumoFinal.marketCap}
          dividendYield={resumoFinal.dividendYield}
        />

        {/* KPIs extras */}
        <InfoCardsGrid items={infoItems} />
      </aside>
    </section>
  );
}
