import React from "react";
import "../../styles/Sections.css";

const PricingSection: React.FC = () => (
  <section id="precos" className="section_generic" aria-label="Planos">
    <h2>Preços / Planos</h2>
    <div className="pricing__plans">
      <div className="plan_card">
        <h3>Básico</h3>
        <p>Ideal para quem está começando.</p>
        <p><strong>R$ 29,90/mês</strong></p>
      </div>
      <div className="plan_card">
        <h3>Profissional</h3>
        <p>Funcionalidades avançadas e relatórios.</p>
        <p><strong>R$ 79,90/mês</strong></p>
      </div>
      <div className="plan_card">
        <h3>Premium</h3>
        <p>Suporte dedicado + consultoria.</p>
        <p><strong>R$ 149,90/mês</strong></p>
      </div>
    </div>
  </section>
);

export default PricingSection;
