import React, { useRef, useEffect } from "react";
import "./RealTimeActions.css";

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

const RealTimeActions: React.FC<Props> = ({ acoes, loading }) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const SPEED_PX_S = 60; // pixels por segundo

  useEffect(() => {
    const step = 1000 / 60; // ms entre frames (~60fps)
    const pxPerTick = SPEED_PX_S / (1000 / step);

    const interval = setInterval(() => {
      if (!sliderRef.current || paused.current) return;
      const slider = sliderRef.current;
      slider.scrollLeft += pxPerTick;
      const half = slider.scrollWidth / 2;
      if (slider.scrollLeft >= half) {
        slider.scrollLeft -= half;
      }
    }, step);

    return () => clearInterval(interval);
  }, []); // roda só no mount

  const handleMouseEnter = () => {
    paused.current = true;
  };
  const handleMouseLeave = () => {
    paused.current = false;
  };

  const cards = [...acoes, ...acoes];

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
        ) : acoes.length === 0 ? (
          <p className="loading-text">Nenhuma ação disponível.</p>
        ) : (
          cards.map((acao, i) => (
            <article key={`${acao.id}-${i}`} className="card">
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
          ))
        )}
      </div>
    </section>
  );
};

export default RealTimeActions;
