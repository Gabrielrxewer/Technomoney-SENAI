import React from "react";
import {
  faHome,
  faDesktop,
  faInfoCircle,
  faTools,
  faTag,
  faPhone,
  faNewspaper,
  faQuestionCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Menu.css";

interface MenuProps {
  onClose: () => void;
}

const Menu: React.FC<MenuProps> = ({ onClose }) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <div className="menu-overlay" onClick={handleOverlayClick}></div>
      <nav className="menu" aria-label="Menu de Navegação">
        <div className="menu-content">
          <button
            onClick={onClose}
            className="close-btn"
            aria-label="Fechar menu"
          >
            ×
          </button>
          <ul>
            <li>
              <a href="/" onClick={onClose}>
                <FontAwesomeIcon icon={faHome} style={{ marginRight: 8 }} />
                Acessar Home
              </a>
            </li>
            <li>
              <a href="/dashboard" onClick={onClose}>
                <FontAwesomeIcon icon={faDesktop} style={{ marginRight: 8 }} />
                Acessar a Plataforma
              </a>
            </li>
            <li>
              <a href="/#sobre" onClick={onClose}>
                <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: 8 }} />
                Sobre / Quem Somos
              </a>
            </li>
            <li>
              <a href="/#servicos" onClick={onClose}>
                <FontAwesomeIcon icon={faTools} style={{ marginRight: 8 }} />
                Serviços / Produtos
              </a>
            </li>
            <li>
              <a href="/#precos" onClick={onClose}>
                <FontAwesomeIcon icon={faTag} style={{ marginRight: 8 }} />
                Preços / Planos
              </a>
            </li>
            <li>
              <a href="/#contato" onClick={onClose}>
                <FontAwesomeIcon icon={faPhone} style={{ marginRight: 8 }} />
                Contato / Fale Conosco
              </a>
            </li>
            <li>
              <a href="/#blog" onClick={onClose}>
                <FontAwesomeIcon icon={faNewspaper} style={{ marginRight: 8 }} />
                Blog / Notícias
              </a>
            </li>
            <li>
              <a href="/#faq" onClick={onClose}>
                <FontAwesomeIcon icon={faQuestionCircle} style={{ marginRight: 8 }} />
                Ajuda / FAQ
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
};

export default Menu;
