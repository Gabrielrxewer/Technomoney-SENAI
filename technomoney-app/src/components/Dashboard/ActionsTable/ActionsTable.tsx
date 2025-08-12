import React, { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
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
    const rows = Array.isArray(acoes) ? acoes : [];
    if (!searchTerm) return rows;

    const lower = searchTerm.toLowerCase();
    return rows.filter((acao) =>
      [
        acao.nome ?? "",
        Number.isFinite(acao.preco) ? acao.preco.toFixed(2) : "",
        Number.isFinite(acao.variacao) ? acao.variacao.toFixed(2) : "",
        Number.isFinite(acao.volume) ? String(acao.volume) : "",
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
              aria-label="Pesquisar por nome, preço, variação ou volume"
            />

            <span className="icon-lupa" aria-hidden="true">
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

            {/* Botão "Minha Carteira" — SPA navigation */}
            <Link
              to="/portfolio"
              className="icon-cart"
              aria-label="Ver minha carteira"
              title="Minha Carteira"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </Link>
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
                        <td>
                          {Number.isFinite(acao.preco)
                            ? acao.preco.toFixed(2)
                            : "-"}
                        </td>
                        <td
                          className={
                            acao.variacao > 0
                              ? "text-success"
                              : acao.variacao < 0
                                ? "text-danger"
                                : ""
                          }
                        >
                          {Number.isFinite(acao.variacao)
                            ? acao.variacao.toFixed(2)
                            : "-"}
                        </td>
                        <td>
                          {Number.isFinite(acao.volume)
                            ? acao.volume.toLocaleString("pt-BR")
                            : "-"}
                        </td>
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
