import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import "../Portfolio/styles/tokens.css";
import "../Portfolio/styles/globals.css";
import Spinner from "../../components/Spinner/Spinner";
import TickerSelectBar, {
  TickerOption,
} from "../Portfolio/TickerSelectBar/TickerSelectBar";
import CompanyAnalytics from "../Portfolio/CompanyAnalytics/CompanyAnalytics";
import CardsInformation from "../Portfolio/CardsInformation/CardsInformation";

import "./PortfolioPage.css";
import { fetchAssetDetail, fetchAssetSummaries } from "../../services/assets";
import type { AssetDetail, AssetSummary } from "../../types/assets";

const PortfolioPage: React.FC = () => {
  const navigate = useNavigate();
  const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
  const [showRSI, setShowRSI] = useState(false);

  const {
    data: assets,
    isLoading: isLoadingAssets,
    isError: assetsError,
    refetch: refetchAssets,
  } = useQuery<AssetSummary[]>({
    queryKey: ["assets", "portfolio"],
    queryFn: fetchAssetSummaries,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!acaoSelecionada && assets && assets.length > 0) {
      setAcaoSelecionada(assets[0].tag);
    }
  }, [assets, acaoSelecionada]);

  const {
    data: assetDetail,
    isLoading: isLoadingDetail,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery<AssetDetail | null>({
    queryKey: ["asset", acaoSelecionada],
    queryFn: async () => {
      if (!acaoSelecionada) return null;
      return fetchAssetDetail(acaoSelecionada);
    },
    enabled: Boolean(acaoSelecionada),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

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

  const fmtCompact = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
      }),
    [locale]
  );

  if (isLoadingAssets) return <Spinner />;

  if (assetsError) {
    return (
      <div className="portfolio-page error-state" role="alert">
        <p>Não foi possível carregar a carteira.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => refetchAssets()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="portfolio-page error-state" role="alert">
        <p>Nenhum ativo disponível para exibir na carteira.</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
          Voltar para o dashboard
        </button>
      </div>
    );
  }

  const options: TickerOption[] = assets.map((asset) => ({
    value: asset.tag,
    label: `${asset.tag} — ${asset.nome}`,
  }));

  const dados = assetDetail;
  const serie = (dados?.grafico ?? []) as readonly number[];
  const last = serie[serie.length - 1];
  const prev = serie.length > 1 ? serie[serie.length - 2] : last;

  const resumoPreco = Number.isFinite(last)
    ? fmtCurrency.format(last)
    : dados
      ? fmtCurrency.format(dados.preco)
      : "-";
  const changePct =
    Number.isFinite(last) && Number.isFinite(prev) && prev !== 0
      ? ((last - prev) / prev) * 100
      : dados
        ? dados.variacao
        : NaN;
  const resumoVariacao = Number.isFinite(changePct)
    ? `${changePct >= 0 ? "+" : ""}${fmtPercent.format(changePct)}%`
    : dados
      ? `${dados.variacao >= 0 ? "+" : ""}${fmtPercent.format(dados.variacao)}`
      : "-";

  const resumoVolume = dados
    ? fmtCompact.format(dados.volume)
    : "-";
  const resumoMarketCap = dados
    ? fmtCurrency.format(dados.marketCap)
    : "-";
  const resumoDividendYield = dados
    ? `${fmtPercent.format(dados.dividendYield * 100)}%`
    : "-";

  const infoItems = dados
    ? [
        {
          title: "Setor",
          value: dados.setor,
          detail: dados.industria,
        },
        {
          title: "P/L",
          value: dados.fundamentals.pl.toFixed(2),
          detail: "Últimos 12 meses",
        },
        {
          title: "Margem",
          value: `${fmtPercent.format(dados.fundamentals.margem)}%`,
          detail: "Margem líquida",
        },
        {
          title: "EV/EBIT",
          value: dados.fundamentals.ev_ebit.toFixed(2),
          detail: "Estrutura de capital",
        },
        {
          title: "Liquidez",
          value: fmtCompact.format(dados.fundamentals.liquidez),
          detail: "Volume diário",
        },
        {
          title: "Score",
          value: dados.fundamentals.score.toString(),
          detail: "Índice proprietário",
        },
      ]
    : [];

  const facts = dados
    ? {
        setor: dados.setor,
        industria: dados.industria,
        sede: dados.sede,
        fundacao: dados.fundacao,
        empregados: fmtCompact.format(dados.empregados),
      }
    : {
        setor: "-",
        industria: "-",
        sede: "-",
        fundacao: "-",
        empregados: "-",
      };

  const summaryFacts = dados
    ? [
        { label: "Setor", value: dados.setor },
        { label: "Indústria", value: dados.industria },
        { label: "Sede", value: dados.sede },
        { label: "Fundação", value: String(dados.fundacao) },
      ]
    : [];

  return (
    <main className="portfolio-page">
      <div className="viewport-grid">
        <TickerSelectBar
          options={options}
          selected={acaoSelecionada ?? options[0].value}
          onChange={(t) => setAcaoSelecionada(t)}
          showRSI={showRSI}
          onToggleRSI={() => setShowRSI((prev) => !prev)}
        />

        <CompanyAnalytics
          chart={{
            id: acaoSelecionada ?? "-",
            nome: dados?.nome ?? "-",
            data: serie,
            showRSI,
            rsiPeriod: 14,
            decimals: 2,
            locale,
            loading: isLoadingDetail,
          }}
          resumo={{
            preco: resumoPreco,
            variacao: resumoVariacao,
            nome: dados?.nome ?? "-",
            volume: resumoVolume,
            marketCap: resumoMarketCap,
            dividendYield: resumoDividendYield,
            facts: summaryFacts,
          }}
          infoItems={infoItems}
          panelHeight={400}
        />

        {detailError ? (
          <div className="portfolio-page error-state" role="alert">
            <p>Não foi possível carregar os detalhes do ativo selecionado.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => refetchDetail()}
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <CardsInformation
            recomendacao={dados?.recomendacao ?? "-"}
            analise={dados?.analise ?? "Sem análise disponível."}
            bio={dados?.bio ?? ""}
            facts={facts}
            noticias={dados?.noticias ?? []}
            asset={dados ?? null}
          />
        )}
      </div>
    </main>
  );
};

export default PortfolioPage;
