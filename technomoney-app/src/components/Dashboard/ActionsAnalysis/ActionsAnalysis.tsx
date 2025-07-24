import React, { useState, useMemo } from "react";
import "./ActionsAnalysis.css";

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

const ActionsAnalysis: React.FC<Props> = ({ acoes, loading }) => {
  const [activeId, setActiveId] = useState<number | "total" | null>(null);

  const totalAcoes = useMemo(() => acoes.length, [acoes]);

  const maiorAcao = useMemo<Acao | null>(() => {
    if (acoes.length === 0) return null;
    return acoes.reduce((prev, curr) =>
      curr.preco > prev.preco ? curr : prev
    );
  }, [acoes]);

  const menorAcao = useMemo<Acao | null>(() => {
    if (acoes.length === 0) return null;
    return acoes.reduce((prev, curr) =>
      curr.preco < prev.preco ? curr : prev
    );
  }, [acoes]);

  const closeModal = () => setActiveId(null);

  const activeAcao =
    typeof activeId === "number"
      ? acoes.find((a) => a.id === activeId) || null
      : null;

  return (
    <section className="analise-acoes">
      {loading ? (
        <p className="loading-text">Carregando análise...</p>
      ) : (
        <>
          <div className="analise-acoes-container">
            {/* Card Total */}
            <div
              className="card azul"
              role="button"
              tabIndex={0}
              onClick={() => setActiveId("total")}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") setActiveId("total");
              }}
            >
              <h3 className="card__title">Total de Ações</h3>
              <p className="display-number">{totalAcoes}</p>
            </div>

            {/* Card Maior Preço */}
            {maiorAcao && (
              <div
                className="card verde"
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(maiorAcao.id)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setActiveId(maiorAcao.id);
                }}
              >
                <h3 className="card__title">Maior Preço</h3>
                <p className="card__description">{maiorAcao.nome}</p>
                <p className="card__description">
                  R${maiorAcao.preco.toFixed(2)}
                </p>
                <small>Variação: {maiorAcao.variacao.toFixed(2)}%</small>
              </div>
            )}

            {/* Card Menor Preço */}
            {menorAcao && (
              <div
                className="card vermelho"
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(menorAcao.id)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    setActiveId(menorAcao.id);
                }}
              >
                <h3 className="card__title">Menor Preço</h3>
                <p className="card__description">{menorAcao.nome}</p>
                <p className="card__description">
                  R${menorAcao.preco.toFixed(2)}
                </p>
                <small>Variação: {menorAcao.variacao.toFixed(2)}%</small>
              </div>
            )}
          </div>

          {/* Modal */}
          {activeId !== null && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <button
                  className="modal__close"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>

                {activeId === "total" ? (
                  <>
                    <h2 className="modal__title">Total de Ações</h2>
                    <div className="modal__body">
                      Este número indica quantos ativos foram incluídos na
                      análise de mercado.
                    </div>
                    <ul className="modal__list">
                      <li>Você vê o volume total de ações consideradas.</li>
                      <li>
                        Útil para entender a abrangência do seu portfólio.
                      </li>
                      <li>
                        Serve como ponto de partida para comparações de preço.
                      </li>
                    </ul>
                  </>
                ) : activeAcao ? (
                  <>
                    <h2 className="modal__title">{activeAcao.nome}</h2>
                    <div className="modal__body">
                      Detalhes do ativo selecionado:
                    </div>
                    <ul className="modal__list">
                      <li>
                        Preço atual:{" "}
                        <strong>R${activeAcao.preco.toFixed(2)}</strong>
                      </li>
                      <li>
                        Variação percentual recente:{" "}
                        <strong>{activeAcao.variacao.toFixed(2)}%</strong>
                      </li>
                      <li>
                        Volume negociado:{" "}
                        <strong>{activeAcao.volume.toLocaleString()}</strong>
                      </li>
                      <li>Indicador de liquidez e interesse do mercado.</li>
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ActionsAnalysis;
