import React from "react";
import "./Sections.css";

const ContactSection: React.FC = () => (
  <section
    id="contato"
    className="section_generic"
    aria-label="Contato / Fale Conosco"
  >
    <h2>Fale Conosco</h2>
    <p>
      <strong>Email:</strong> suporte@technomoney.com
    </p>
    <p>
      <strong>Telefone:</strong> (11) 4000-1234
    </p>
    <p>
      <strong>Endereço:</strong> Av. das Nações, 123, São Paulo/SP
    </p>
  </section>
);

export default ContactSection;
