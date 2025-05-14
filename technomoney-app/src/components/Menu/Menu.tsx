import React from 'react';
import { Link } from 'react-router-dom';
import './Menu.css';

interface MenuProps {
  onClose: () => void;
}

const Menu: React.FC<MenuProps> = ({ onClose }) => {
  return (
    <div className="menu">
      <div className="menu-content">
        {/* Botão de fechar */}
        <button onClick={onClose} className="close-btn">X</button>

        {/* Lista de Links */}
        <ul>
          <li>
            <Link to="/" onClick={onClose}>Acessar Home</Link>
          </li>
          <li>
            <Link to="/register" onClick={onClose}>Acessar a Plataforma</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Menu;
