import { FaBars, FaBell, FaUserCircle } from "react-icons/fa";
import React, { useState } from "react";
import UserPopup from "../UserPopup/UserPopup";
import "./Header.css";

const Header: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  return (
    <header className="header">
      <div className="menu-icon">
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

      {isPopupOpen && <UserPopup onClose={togglePopup} />}
    </header>
  );
};

export default Header;
