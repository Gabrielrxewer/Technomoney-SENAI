import React from "react";
import "./ActionsAnalysis.css";

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

interface Props {
  dadosAnalise: DadosAnalise | null;
  loading: boolean;
}

const ActionsAnalysis: React.FC<Props> = ({ dadosAnalise, loading }) => {
  return (
    <section className="analise-acoes">
      {loading ? (
        <p className="loading-text">Carregando análise...</p>
      ) : dadosAnalise ? (
        <div className="analise-acoes-container">
          <div className="card azul">
            <h3 className="card__title">Total de Ações</h3>
            <p className="display-number">{dadosAnalise.totalAcoes}</p>
          </div>

          <div className="card verde">
            <h3 className="card__title">Maior Preço</h3>
            <p className="card__description">{dadosAnalise.maiorPreco.nome}</p>
            <p className="card__description">
              R${dadosAnalise.maiorPreco.preco.toFixed(2)}
            </p>
            <small>
              Variação: {dadosAnalise.maiorPreco.variacao.toFixed(2)}%
            </small>
          </div>

          <div className="card vermelho">
            <h3 className="card__title">Menor Preço</h3>
            <p className="card__description">{dadosAnalise.menorPreco.nome}</p>
            <p className="card__description">
              R${dadosAnalise.menorPreco.preco.toFixed(2)}
            </p>
            <small>
              Variação: {dadosAnalise.menorPreco.variacao.toFixed(2)}%
            </small>
          </div>
        </div>
      ) : (
        <p className="loading-text">Dados de análise não disponíveis.</p>
      )}
    </section>
  );
};

export default ActionsAnalysis;
