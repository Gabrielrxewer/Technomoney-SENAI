// Dashboard.tsx
import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import RealTimeActions from "./RealTimeActions/RealTimeActions";
import ActionsTable from "./ActionsTable/ActionsTable";
import ActionsAnalysis from "./ActionsAnalysis/ActionsAnalysis";
import ErrorMessage from "./ErrorMessage/ErrorMessage";
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
  maiorPreco: Acao;
  menorPreco: Acao;
}

async function fetchAssets(): Promise<{ acoes: Acao[]; dadosAnalise: DadosAnalise }> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado. Faça login.");
  const res = await axios.get<Acao[]>(
    `${import.meta.env.VITE_API_URL}/api/assets/sorted/price`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const acoes = res.data;
  return {
    acoes,
    dadosAnalise: {
      totalAcoes: acoes.length,
      maiorPreco: acoes[0],
      menorPreco: acoes[acoes.length - 1],
    },
  };
}

const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery<
    { acoes: Acao[]; dadosAnalise: DadosAnalise },
    Error
  >({
    queryKey: ["assetsSortedByPrice"],
    queryFn: fetchAssets,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <div className="dashboard-container">
      {error && <ErrorMessage message={error.message} />}
      <RealTimeActions acoes={data?.acoes ?? []} loading={isLoading} />
      <ActionsTable acoes={data?.acoes ?? []} loading={isLoading} />
      <ActionsAnalysis
        dadosAnalise={
          data?.dadosAnalise ?? {
            totalAcoes: 0,
            maiorPreco: {} as Acao,
            menorPreco: {} as Acao,
          }
        }
        loading={isLoading}
      />
    </div>
  );
};

export default Dashboard;
