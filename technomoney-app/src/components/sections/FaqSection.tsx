import React from "react";
import "../../styles/Sections.css";

const FaqSection: React.FC = () => (
  <section id="faq" className="section_generic" aria-label="Perguntas frequentes">
    <h2>Ajuda / FAQ</h2>

    <details className="faq_item" open>
      <summary>Como crio minha primeira carteira?</summary>
      <p>Acesse o Dashboard, clique em “Nova Carteira” e siga o passo a passo.</p>
    </details>

    <details className="faq_item">
      <summary>Como cancelar minha assinatura?</summary>
      <p>Acesse “Configurações &gt; Plano” e clique em “Cancelar”.</p>
    </details>
  </section>
);

export default FaqSection;
