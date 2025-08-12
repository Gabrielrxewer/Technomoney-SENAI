import React from "react";
import "./Sections.css";

const PricingSection: React.FC = () => (
  <section
    id="precos"
    className="section_generic"
    aria-label="Preços / Planos"
  >
    <h2>Planos</h2>
    <div className="pricing__plans">
      <div className="plan_card">
        <h3>Básico</h3>
        <p>Perfeito para iniciantes que buscam ferramentas essenciais.</p>
        <p>
          <strong>R$ 29,90/mês</strong>
        </p>
      </div>
      <div className="plan_card">
        <h3>Profissional</h3>
        <p>
          Funcionalidades avançadas, relatórios detalhados e alertas customizáveis.
        </p>
        <p>
          <strong>R$ 79,90/mês</strong>
        </p>
      </div>
      <div className="plan_card">
        <h3>Premium</h3>
        <p>
          Tudo do plano Profissional + consultoria dedicada e treinamentos
          exclusivos.
        </p>
        <p>
          <strong>R$ 149,90/mês</strong>
        </p>
      </div>
    </div>
  </section>
);

export default PricingSection;


