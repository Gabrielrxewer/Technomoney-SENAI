import React, { useState, useEffect } from "react";
import axios from "axios";
import RealTimeActions from "./RealTimeActions/RealTimeActions";
import ActionsTable from "./ActionsTable/ActionsTable";
import ActionsAnalysis from "./ActionsAnalysis/ActionsAnalysis";
import ErrorMessage from "./ErrorMessage/ErrorMessage";

import "./Dashboard.css";

interface Acao {
  id: number;
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

const Dashboard: React.FC = () => {
  const [error, setError] = useState<string>("");
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [dadosAnalise, setDadosAnalise] = useState<DadosAnalise | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProtectedData = async () => {
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token não encontrado. Faça login.");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/auth/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAcoes(response.data.acoesTempoReal || []);
      setDadosAnalise(response.data.dadosAnalise || null);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erro ao acessar o conteúdo protegido."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtectedData();
  }, []);

  return (
    <div className="dashboard-container">
      {error && <ErrorMessage message={error} />}
      <RealTimeActions acoes={acoes} loading={loading} />
      <ActionsTable acoes={acoes} loading={loading} />
      <ActionsAnalysis dadosAnalise={dadosAnalise} loading={loading} />
    </div>
  );
};

export default Dashboard;
