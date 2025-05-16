import { FaBars, FaBell, FaUserCircle } from "react-icons/fa";
import React, { useState } from "react";
import UserPopup from "../UserPopup/UserPopup";
import "./Header.css";
import Menu from "../Menu/Menu";

const Header: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="menu-icon" onClick={toggleMenu}>
        {/* Ícone de Menu */}
        <FaBars />
      </div>
      <div className="header-links">
        <h1>Technomoney</h1>
      </div>
      <div className="user-notifications">
        <div className="notification-bell">
          {/* Ícone de Notificação */}
          <FaBell />
        </div>
        <div className="user-profile" onClick={togglePopup}>
          {/* Ícone de Usuário */}
          <FaUserCircle />
        </div>
      </div>
      {isMenuOpen && <Menu onClose={toggleMenu} />}

      {isPopupOpen && <UserPopup onClose={togglePopup} />}
    </header>
  );
};

export default Header;
