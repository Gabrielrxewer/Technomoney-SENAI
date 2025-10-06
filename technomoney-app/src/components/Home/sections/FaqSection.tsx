import React from "react";
import "./Sections.css";

const FaqSection: React.FC = () => (
  <section
    id="faq"
    className="section_generic"
    aria-label="Perguntas Frequentes / FAQ"
  >
    <h2>FAQ</h2>

    <details className="faq_item">
      <summary>Como crio minha primeira carteira?</summary>
      <p>
        No Dashboard, clique em “Nova Carteira”, informe um nome e selecione os
        ativos. Você poderá salvar configurações de colunas e indicadores.
      </p>
    </details>

    <details className="faq_item">
      <summary>Como cancelo minha assinatura?</summary>
      <p>
        Acesse “Configurações &gt; Plano” e selecione “Cancelar assinatura”.
        Seu acesso continuará ativo até o fim do período contratado.
      </p>
    </details>

    <details className="faq_item">
      <summary>Recebo notificações por e-mail?</summary>
      <p>
        Sim! Vá em “Configurações &gt; Notificações” e ative alertas por e-mail
        para preços, volumes ou relatórios.
      </p>
    </details>
  </section>
);

export default FaqSection;
