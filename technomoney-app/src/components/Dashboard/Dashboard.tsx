import React from "react";
import { useQuery } from "@tanstack/react-query";
import StocksHome from "./StocksHome/StocksHome";
import Spinner from "../Spinner/Spinner";
import { fetchAssetSummaries } from "../../services/assets";
import type { AssetSummary } from "../../types/assets";

export default function Dashboard() {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<AssetSummary[]>({
    queryKey: ["assets", "dashboard"],
    queryFn: fetchAssetSummaries,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  return (
    <div className="dashboard-container">
      {isLoading ? (
        <div className="loading-screen">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="loading-screen" role="alert">
          <div>Falha ao carregar os dados de mercado.</div>
          <button type="button" className="btn btn-primary" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <StocksHome items={data ?? []} />
      )}
    </div>
  );
}
