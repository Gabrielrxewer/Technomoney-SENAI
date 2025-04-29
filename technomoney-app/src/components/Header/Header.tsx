import { FaBars, FaBell, FaUserCircle } from "react-icons/fa";
import React from "react";
import "./Header.css";

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="menu-icon">
        {/* @ts-ignore */}
        <FaBars /> {/* Ícone de Menu */}
      </div>
      <div className="header-links">
        <h1>Technomoney</h1>
      </div>
      <div className="user-notifications">
        <div className="notification-bell">
          {/* @ts-ignore */}
          <FaBell /> {/* Ícone de Notificação */}
        </div>
        <div className="user-profile">
          {/* @ts-ignore */}
          <FaUserCircle /> {/* Ignorando erro do TypeScript */}
        </div>
      </div>
    </header>
  );
};

export default Header;
