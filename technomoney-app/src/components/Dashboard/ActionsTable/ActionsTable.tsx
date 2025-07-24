import React, { useState, useMemo, useRef } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredAcoes = useMemo(() => {
    if (!searchTerm) return acoes;
    const lower = searchTerm.toLowerCase();
    return acoes.filter((acao) =>
      [
        acao.nome,
        acao.preco.toFixed(2),
        acao.variacao.toFixed(2),
        acao.volume.toString(),
      ].some((field) => field.toLowerCase().includes(lower))
    );
  }, [acoes, searchTerm]);

  return (
    <section className="colunas">
      <div className="card table-card">
        <header className="card-header">
          <span>Visão Geral das Ações</span>
          <div className="card-header-actions">
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="icon-lupa" aria-label="Pesquisar">
              <svg
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
            </span>
          </div>
        </header>

        <div className="card-body">
          {loading ? (
            <p className="loading-text text-center">Carregando ações...</p>
          ) : (
            <div className="table-wrapper">
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
                  {filteredAcoes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          fontStyle: "italic",
                        }}
                      >
                        Nenhuma ação encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredAcoes.map((acao) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ActionsTable;
