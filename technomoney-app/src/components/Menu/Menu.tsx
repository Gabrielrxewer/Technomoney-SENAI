import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
import "./Menu.css";

interface MenuProps {
  onClose: () => void;
}

const Menu: React.FC<MenuProps> = ({ onClose }) => {
  return (
    <div className="menu">
      <div className="menu-content">
        <button onClick={onClose} className="close-btn">
          X
        </button>
        <ul>
          <li>
            <Link to="/" onClick={onClose}>
              <FontAwesomeIcon icon={faHome} style={{ marginRight: 8 }} />
              Acessar Home
            </Link>
          </li>
          <li>
            <Link to="/regiter" onClick={onClose}>
              <FontAwesomeIcon icon={faDesktop} style={{ marginRight: 8 }} />
              Acessar a Plataforma
            </Link>
          </li>
          <li>
            <Link to="/login" onClick={onClose}>
              <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: 8 }} />
              Sobre / Quem Somos
            </Link>
          </li>
          <li>
            <Link to="/" onClick={onClose}>
              <FontAwesomeIcon icon={faTools} style={{ marginRight: 8 }} />
              Serviços / Produtos
            </Link>
          </li>
          <li>
            <Link to="/" onClick={onClose}>
              <FontAwesomeIcon icon={faTag} style={{ marginRight: 8 }} />
              Preços / Planos
            </Link>
          </li>
          <li>
            <Link to="/" onClick={onClose}>
              <FontAwesomeIcon icon={faPhone} style={{ marginRight: 8 }} />
              Contato / Fale Conosco
            </Link>
          </li>
          <li>
            <Link to="/" onClick={onClose}>
              <FontAwesomeIcon icon={faNewspaper} style={{ marginRight: 8 }} />
              Blog / Notícias
            </Link>
          </li>
          <li>
            <Link to="/" onClick={onClose}>
              <FontAwesomeIcon
                icon={faQuestionCircle}
                style={{ marginRight: 8 }}
              />
              Ajuda / FAQ
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
