import React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
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
  maiorPreco: Acao;
  menorPreco: Acao;
}

type AssetsResult = {
  acoes: Acao[];
  dadosAnalise: DadosAnalise;
};

async function fetchAssets(): Promise<AssetsResult> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("Token não encontrado. Faça login.");
  }

  const res = await axios.get<Acao[]>(
    `${import.meta.env.VITE_API_URL}/assets/sorted/price`,
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
  const { data, isLoading, error } = useQuery<AssetsResult, Error>({
    queryKey: ["assetsSortedByPrice"],
    queryFn: fetchAssets,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading || !data) {
    return <Spinner />;
  }

  if (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return <ErrorMessage message={error.message} />;
  }

  return (
    <div className="dashboard-container">
      <RealTimeActions acoes={data.acoes} loading={isLoading} />
      <ActionsTable acoes={data.acoes} loading={isLoading} />
      <ActionsAnalysis acoes={data.acoes} loading={isLoading} />

    </div>
  );
};

export default Dashboard;
