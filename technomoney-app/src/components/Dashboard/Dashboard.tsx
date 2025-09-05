import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/http";
import RealTimeActions from "../Dashboard/RealTimeActions/RealTimeActions";
import ActionsTable from "../Dashboard/ActionsTable/ActionsTable";
import ActionsAnalysis from "../Dashboard/ActionsAnalysis/ActionsAnalysis";
import ErrorMessage from "../Dashboard/ErrorMessage/ErrorMessage";
import Spinner from "../Spinner/Spinner";
import "./Dashboard.css";

interface Acao {
  id: number;
  tag: string;
  nome: string;
  preco: number;
  variacao: number;
  volume: number;
}

interface DadosAnalise {
  totalAcoes: number;
  maiorPreco: Acao | null;
  menorPreco: Acao | null;
}

type AssetsResult = {
  acoes: Acao[];
  dadosAnalise: DadosAnalise;
};

async function fetchAssets({
  signal,
}: {
  signal?: AbortSignal;
}): Promise<AssetsResult> {
  const token = localStorage.getItem("access");
  if (!token) throw new Error("Token não encontrado. Faça login.");
  const { data } = await api.get<Acao[]>("/assets/sorted/price", { signal });
  const acoes = Array.isArray(data) ? data : [];
  const maiorPreco = acoes.length ? acoes[0] : null;
  const menorPreco = acoes.length ? acoes[acoes.length - 1] : null;
  return {
    acoes,
    dadosAnalise: { totalAcoes: acoes.length, maiorPreco, menorPreco },
  };
}

const Dashboard: React.FC = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access") : null;

  const { data, isLoading, error } = useQuery<AssetsResult, Error>({
    queryKey: ["assetsSortedByPrice", token],
    queryFn: ({ signal }) => fetchAssets({ signal }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 300000,
    retry: 1,
  });

  if (error) return <ErrorMessage message={error.message} />;
  if (isLoading || !data) return <Spinner />;

  return (
    <div className="dashboard-container">
      <RealTimeActions acoes={data.acoes} loading={isLoading} />
      <ActionsTable acoes={data.acoes} loading={isLoading} />
      <ActionsAnalysis acoes={data.acoes} loading={isLoading} />
    </div>
  );
};

export default Dashboard;
