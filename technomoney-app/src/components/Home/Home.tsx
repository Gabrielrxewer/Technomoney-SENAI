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
          <h1>Informações Technomoney</h1>
          <p>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quos
            corrupti soluta veritatis blanditiis, ex vel quaerat, sed quas
            beatae rerum illum quam deserunt optio atque ea libero velit sunt
            itaque.
          </p>
        </div>
        <div className="card">
          {" "}
          <h1>Informações Technomoney</h1>
          <p>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quos
            corrupti soluta veritatis blanditiis, ex vel quaerat, sed quas
            beatae rerum illum quam deserunt optio atque ea libero velit sunt
            itaque.
          </p>
        </div>
        <div className="card">
          {" "}
          <h1>Informações Technomoney</h1>
          <p>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Quos
            corrupti soluta veritatis blanditiis, ex vel quaerat, sed quas
            beatae rerum illum quam deserunt optio atque ea libero velit sunt
            itaque.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
