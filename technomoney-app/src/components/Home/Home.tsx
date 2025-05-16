import React from "react";
import "./Home.css";

const Home: React.FC = () => {
  return (
    <div className="home-container">
      {/* Seção Principal */}
      <main className="home-main">
        <section className="hero">
          <h1>Acessoria em Investimentos</h1>
        </section>
        <button className="saiba-mais">Saiba mais</button>
      </main>
      {/* Seção dos Cartões de Informação */}
      <section className="info-cards">
        <div className="card">
          <h1>Personalização</h1>
          <p>
            Os usuários podem personalizar a visualização das suas carteiras e
            das informações das ações, ajustando colunas, filtros e até mesmo os
            indicadores que desejam visualizar, criando uma experiência mais
            adaptada às suas necessidades.
          </p>
        </div>
        <div className="card">
          {" "}
          <h1>Interação em tempo real</h1>
          <p>
            A plataforma oferece atualizações dinâmicas em tempo real das ações
            no mercado, permitindo que os usuários acompanhem as flutuações de
            preços e volúmenes de negociação de forma contínua, sem necessidade
            de recarregar a página.
          </p>
        </div>
        <div className="card">
          {" "}
          <h1>Simulações</h1>
          <p>
            A plataforma permite que os usuários criem simulações de
            investimentos, testando diferentes cenários antes de aplicar
            dinheiro real. É possível vincular simulações a
            carteiras específicas e acompanhar o comportamento de seus ativos ao
            longo do tempo.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
