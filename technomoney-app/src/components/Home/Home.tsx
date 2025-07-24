import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import "./Home.css";
import "./Modal.css";

import AboutSection from "./sections/AboutSection";
import ServicesSection from "./sections/ServicesSection";
import PricingSection from "./sections/PricingSection";
import ContactSection from "./sections/ContactSection";
import BlogSection from "./sections/BlogSection";
import FaqSection from "./sections/FaqSection";
import Spinner from "../../components/Dashboard/Spinner/Spinner";

interface InfoCard {
  title: string;
  description: string;
  details: string[];
}

const cards: InfoCard[] = [
  {
    title: "Personalização",
    description:
      "Ajuste o grid, escolha fórmulas e salve tudo em templates. Com carteiras configuráveis, você analisa apenas os dados que importam e compara estratégias rapidamente — liberdade para investir do seu jeito.",
    details: [
      "➤ Colunas visíveis: mostre ou oculte métricas conforme sua análise.",
      "➤ Filtros salvos: aplique rapidamente combinações frequentes.",
      "➤ Indicadores customizados: adicione fórmulas e KPIs de preferência.",
    ],
  },
  {
    title: "Interação em tempo real",
    description:
      "Cards atualizam preços, volumes e notícias sem recarregar a página. Defina alertas por preço ou evento e receba notificações instantâneas para agir na hora certa.",
    details: [
      "➤ Streaming via WebSocket atualizado a cada segundo.",
      "➤ Alertas visuais quando o preço atinge metas definidas.",
      "➤ Destaques automáticos de maior alta e maior baixa.",
    ],
  },
  {
    title: "Simulações",
    description:
      "Monte cenários sem arriscar dinheiro: conecte carteiras ou crie simulações do zero, ajuste período e indicadores e acompanhe gráficos que mostram o desempenho da estratégia antes de investir de verdade.",
    details: [
      "➤ Crie múltiplos cenários *what-if* lado a lado.",
      "➤ Vincule simulações a carteiras para comparar resultados.",
      "➤ Relatórios de rentabilidade, risco e drawdown projetados.",
    ],
  },
];

const Home: React.FC = () => {
  const { hash } = useLocation();
  const [activeCard, setActiveCard] = useState<InfoCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    }
  }, [hash, loading]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setActiveCard(null);
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const scrollToPrecos = () => {
    const section = document.querySelector("#precos");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <main className="home_home">
      {/* Hero */}
      <header className="hero_home" role="banner" id="hero">
        <h1 className="hero__title_home">Assessoria em Investimentos</h1>
        <p className="hero__subtitle_home">
          Transforme seu futuro financeiro conosco.
        </p>
        <button
          onClick={scrollToPrecos}
          className="btn_home btn--primary_home"
        >
          Saiba mais
        </button>
      </header>

      {/* Benefícios */}
      <section
        className="info-cards_home"
        id="beneficios"
        aria-label="Principais benefícios da plataforma"
      >
        {cards.map((card) => (
          <article
            key={card.title}
            className="card_home"
            tabIndex={0}
            role="button"
            aria-labelledby={`${card.title
              .replace(/\s+/g, "-")
              .toLowerCase()}-title-home`}
            onClick={() => setActiveCard(card)}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && setActiveCard(card)
            }
          >
            <h2
              id={`${card.title.replace(/\s+/g, "-").toLowerCase()}-title-home`}
              className="card__title_home"
            >
              {card.title}
            </h2>
            <p className="card__description_home">{card.description}</p>
          </article>
        ))}
      </section>

      {/* Modal */}
      {activeCard && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => setActiveCard(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={() => setActiveCard(null)}
              aria-label="Fechar"
            >
              ×
            </button>
            <h2 id="modal-title" className="modal__title">
              {activeCard.title}
            </h2>
            <p className="modal__body">{activeCard.description}</p>
            <ul className="modal__list">
              {activeCard.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Seções de 100vh */}
      <div className="lp">
        <AboutSection />
        <ServicesSection />
        <PricingSection />
        <ContactSection />
        <BlogSection />
        <FaqSection />
      </div>
    </main>
  );
};

export default Home;
