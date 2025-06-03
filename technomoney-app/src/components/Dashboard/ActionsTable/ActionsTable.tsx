import React from "react";
import "./ActionsTable.css";

interface Acao {
  id: number;
  nome: string;
  preco: number;
  variacao: number;
  volume: number;
}

interface Props {
  acoes: Acao[];
  loading: boolean;
}

const ActionsTable: React.FC<Props> = ({ acoes, loading }) => {
  return (
    <section className="colunas">
      <div className="card table-card">
        <header className="card-header">
          <span>Colunas</span>
          <div className="card-header-actions">
            <button
              className="btn btn-outline btn-sm icon-btn"
              title="Editar"
              aria-label="Editar"
            >
              <svg
                width="35"
                height="35"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
            <button
              className="btn btn-outline btn-sm icon-btn"
              title="Pesquisar"
              aria-label="Pesquisar"
            >
              <svg
                width="35"
                height="35"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </header>

        <div className="card-body">
          {loading ? (
            <p className="loading-text text-center">Carregando ações...</p>
          ) : acoes.length === 0 ? (
            <p className="loading-text text-center">Nenhuma ação disponível.</p>
          ) : (
            <table className="table table-dark table-striped">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Preço (R$)</th>
                  <th>Variação (%)</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {acoes.map((acao) => (
                  <tr key={acao.id}>
                    <td>{acao.nome}</td>
                    <td>{acao.preco.toFixed(2)}</td>
                    <td
                      className={
                        acao.variacao > 0
                          ? "text-success"
                          : acao.variacao < 0
                            ? "text-danger"
                            : ""
                      }
                    >
                      {acao.variacao.toFixed(2)}
                    </td>
                    <td>{acao.volume.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};

export default ActionsTable;
