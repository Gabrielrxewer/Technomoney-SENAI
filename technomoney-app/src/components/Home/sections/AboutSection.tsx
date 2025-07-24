import React from "react";
import "./Sections.css";

const AboutSection: React.FC = () => (
  <section
    id="sobre"
    className="section_generic"
    aria-label="Sobre nós / Quem Somos"
  >
    <h2>Sobre Nós</h2>
    <p>
      Na Technomoney, unimos tecnologia de ponta e atendimento humano para
      tornar investimentos profissionais acessíveis a todos. Nossa plataforma
      entrega ferramentas avançadas e consultoria personalizada, garantindo
      que você invista com confiança.
    </p>
    <p>
      Acreditamos na democratização do mercado financeiro: seja você iniciante
      ou veterano, oferecemos recursos que se adaptam ao seu perfil e estilo
      de investimento.
    </p>
  </section>
);

export default AboutSection;
