import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StockInfo from "./StockInfo";
import StockChart from "./StockChart";
import Spinner from "../../Spinner/Spinner";
import { fetchAssetDetail } from "../../../services/assets";
import type { AssetDetail, AssetSummary } from "../../../types/assets";
import "./StocksDetail.css";

type LocationState = {
  stock?: AssetSummary;
};

const StockDetail = () => {
  const location = useLocation();
  const params = useParams<{ tag?: string }>();
  const summary = (location.state as LocationState | null)?.stock ?? null;
  const normalizedTag = (params.tag ?? summary?.tag ?? "").toUpperCase();

  const { data, isLoading, isError, refetch } = useQuery<AssetDetail>({
    queryKey: ["assets", "detail", normalizedTag],
    queryFn: () => fetchAssetDetail(normalizedTag),
    enabled: !!normalizedTag,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const headerAsset: AssetSummary | null = data ?? summary;

  if (!normalizedTag) {
    return (
      <div className="stock-detail-page">
        <div className="error">Ação não encontrada</div>
      </div>
    );
  }

  return (
    <div className="stock-detail-page">
      {headerAsset ? (
        <div className="StocksDetailheader">
          <h1>
            {headerAsset.nome} ({headerAsset.tag})
          </h1>
          <p>{headerAsset.setor}</p>
          <p className={headerAsset.variacao >= 0 ? "positive" : "negative"}>
            {headerAsset.variacao >= 0 ? "+" : ""}
            {headerAsset.variacao.toFixed(2)}%
          </p>
          {data?.recomendacao ? (
            <span
              className={`stock-recommendation ${
                data.recomendacao === "Comprar" ? "recommend-buy" : "recommend-hold"
              }`}
            >
              {data.recomendacao}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="StocksDetailheader">
          <h1>Carregando ativo…</h1>
        </div>
      )}

      <div className="stock-content">
        {isLoading ? (
          <div className="loading-screen">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="loading-screen" role="alert">
            <div>Falha ao carregar detalhes da ação.</div>
            <button
              type="button"
              className="retry-button"
              onClick={() => refetch()}
            >
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          <>
            <StockInfo stock={data} />
            <div className="stock-grid">
              <div className="stock-panel">
                <StockChart stock={data} />
              </div>
              <div className="stock-panel stock-briefing">
                <h2>Resumo fundamentalista</h2>
                <p>{data.analise}</p>
                <div className="stock-meta">
                  <span>
                    <strong>Bio:</strong> {data.bio}
                  </span>
                  <span>
                    <strong>Indústria:</strong> {data.industria}
                  </span>
                  <span>
                    <strong>Sede:</strong> {data.sede}
                  </span>
                  <span>
                    <strong>Fundação:</strong> {data.fundacao}
                  </span>
                  <span>
                    <strong>Empregados:</strong>{" "}
                    {data.empregados.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
            <div className="stock-panel stock-news">
              <h2>Notícias recentes</h2>
              {data.noticias.length ? (
                <ul>
                  {data.noticias.map((news, index) => (
                    <li key={`${index}-${news.slice(0, 24)}`}>{news}</li>
                  ))}
                </ul>
              ) : (
                <p>Nenhuma notícia disponível para este ativo.</p>
              )}
            </div>
          </>
        ) : (
          <div className="loading-screen" role="status">
            Dados indisponíveis no momento.
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetail;
