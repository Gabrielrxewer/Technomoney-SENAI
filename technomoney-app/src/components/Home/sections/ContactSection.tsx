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
      <strong>Email:</strong> debora.romitti@technomoney.com
    </p>
    <p>
      <strong>Telefone:</strong> (49)1234-5678
    </p>
    <p>
      <strong>Endereço:</strong>Avenida Engenho, nº 120 – Centro.
    </p>
  </section>
);

export default ContactSection;
