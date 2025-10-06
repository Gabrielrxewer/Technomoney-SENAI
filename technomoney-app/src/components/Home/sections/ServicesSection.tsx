import React from "react";
import "./Sections.css";

const ServicesSection: React.FC = () => (
  <section
    id="servicos"
    className="section_generic"
    aria-label="Serviços / Produtos"
  >
    <h2>Serviços</h2>
    <ul>
      <li>
        <strong>Monitoramento em tempo real:</strong> acompanhe suas carteiras
        com dados atualizados a cada segundo.
      </li>
      <li>
        <strong>Alertas inteligentes:</strong> receba notificações visuais e
        sonoras ao atingir metas de preço ou eventos de mercado.
      </li>
      <li>
        <strong>Relatórios personalizados:</strong> gere análises de risco,
        retorno e performance sob medida.
      </li>
      <li>
        <strong>Consultoria especializada:</strong> suporte individualizado com
        profissionais certificados.
      </li>
    </ul>
  </section>
);

export default ServicesSection;
