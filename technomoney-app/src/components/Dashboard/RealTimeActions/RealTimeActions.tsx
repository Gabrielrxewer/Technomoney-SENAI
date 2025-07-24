import React, { useRef, useEffect, useState, useMemo } from "react";
import "./RealTimeActions.css";

export interface Acao {
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

const RealTimeActions: React.FC<Props> = ({ acoes, loading }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const SPEED_PX_S = 60;

  const [activeId, setActiveId] = useState<number | null>(null);

  const [order, setOrder] = useState<number[]>([]);
  useEffect(() => {
    if (order.length === 0 && acoes.length > 0) {
      setOrder(acoes.map((a) => a.id));
    }
  }, [acoes, order.length]);

  const mapById = useMemo(
    () => Object.fromEntries(acoes.map((a) => [a.id, a])),
    [acoes]
  );

  useEffect(() => {
    paused.current = activeId !== null;
  }, [activeId]);

  useEffect(() => {
    const step = 1000 / 60;
    const pxPerTick = SPEED_PX_S / (1000 / step);
    const iv = setInterval(() => {
      if (!sliderRef.current || paused.current) return;
      const s = sliderRef.current;
      s.scrollLeft += pxPerTick;
      const half = s.scrollWidth / 2;
      if (s.scrollLeft >= half) s.scrollLeft -= half;
    }, step);
    return () => clearInterval(iv);
  }, []);

  const handleMouseEnter = () => {
    if (activeId === null) paused.current = true;
  };
  const handleMouseLeave = () => {
    if (activeId === null) paused.current = false;
  };

  const openModal = (id: number) => {
    setActiveId(id);
  };
  const closeModal = () => {
    setActiveId(null);
  };

  const cardsIds = [...order, ...order];
  const activeCard = activeId !== null ? mapById[activeId] : null;

  return (
    <section className="acoes-tempo-real">
      <div
        className="slider-cards"
        ref={sliderRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {loading ? (
          <p className="loading-text">Carregando...</p>
        ) : order.length === 0 ? (
          <p className="loading-text">Nenhuma ação disponível.</p>
        ) : (
          cardsIds.map((id, idx) => {
            const acao = mapById[id];
            if (!acao) return null;
            return (
              <article
                key={`${id}-${idx}`}
                className="card"
                role="button"
                tabIndex={0}
                onClick={() => openModal(id)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") openModal(id);
                }}
              >
                <h3 className="card__title">{acao.nome}</h3>
                <p className="card__description">
                  Preço: R${acao.preco.toFixed(2)}
                </p>
                <p
                  className={`card__description variacao ${
                    acao.variacao > 0
                      ? "text-success"
                      : acao.variacao < 0
                        ? "text-danger"
                        : ""
                  }`}
                >
                  Variação: {acao.variacao.toFixed(2)}%
                </p>
              </article>
            );
          })
        )}
      </div>

      {activeCard && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={closeModal}
              aria-label="Fechar"
            >
              &times;
            </button>

            <h2 className="modal__title">{activeCard.nome}</h2>
            <div className="modal__body">Detalhes da ação selecionada:</div>
            <ul className="modal__list">
              <li>
                Preço atual: <strong>R${activeCard.preco.toFixed(2)}</strong>
              </li>
              <li>
                Variação percentual:{" "}
                <strong>{activeCard.variacao.toFixed(2)}%</strong>
              </li>
              <li>
                Volume negociado:{" "}
                <strong>{activeCard.volume.toLocaleString()}</strong>
              </li>
              <li>Ajuda a avaliar liquidez e interesse do mercado.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};

export default RealTimeActions;
