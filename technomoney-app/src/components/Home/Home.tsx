import React from "react";
import "./Home.css";
import heroImage from "../../../public/1.jpeg";

const cards = [
  {
    title: "Personalização",
    description:
      "Os usuários podem personalizar a visualização das suas carteiras e das informações das ações, ajustando colunas, filtros e até mesmo os indicadores que desejam visualizar, criando uma experiência mais adaptada às suas necessidades.",
  },
  {
    title: "Interação em tempo real",
    description:
      "A plataforma oferece atualizações dinâmicas em tempo real das ações no mercado, permitindo que os usuários acompanhem as flutuações de preços e volumes de negociação de forma contínua, sem necessidade de recarregar a página.",
  },
  {
    title: "Simulações",
    description:
      "A plataforma permite que os usuários criem simulações de investimentos, testando diferentes cenários antes de aplicar dinheiro real. É possível vincular simulações a carteiras específicas e acompanhar o comportamento de seus ativos ao longo do tempo.",
  },
];

const Home: React.FC = () => {
  return (
    <main className="home">
      <header className="hero" role="banner">
        <div className="overlay" />
        <h1 className="hero__title">Assessoria em Investimentos</h1>
        <p className="hero__subtitle">Transforme seu futuro financeiro conosco.</p>
        <button
          className="btn btn--primary"
          aria-label="Saiba mais sobre a assessoria"
        >
          Saiba mais
        </button>
      </header>

      <section className="info-cards" aria-label="Principais benefícios da plataforma">
        {cards.map(({ title, description }) => (
          <article
            key={title}
            className="card"
            tabIndex={0}
            aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}
          >
            <h2 id={`${title.replace(/\s+/g, "-").toLowerCase()}-title`} className="card__title">
              {title}
            </h2>
            <p className="card__description">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
};

export default Home;
