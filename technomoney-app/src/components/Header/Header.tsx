import { FaBars, FaBell, FaUserCircle } from "react-icons/fa";
import React, { useState } from "react";
import UserPopup from "../Popups/UserPopup/UserPopup";
import HelpPopup from "../Popups/HelpPopup/HelpPopup";
import MyAccountPopup from "../Popups/MyAccountPopup/MyAccountPopup";
import PopupSettings from "../Popups/PopupSettings/PopupSettings";
import "./Header.css";
import Menu from "../Menu/Menu";

const Header: React.FC = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [showAccount, setShowAccount] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="menu-icon" onClick={toggleMenu}>
        <FaBars />
      </div>
      <div className="header-links">
        <h1>Technomoney</h1>
      </div>
      <div className="user-notifications">
        <div className="notification-bell">
          <FaBell />
        </div>
        <div className="user-profile" onClick={togglePopup}>
          <FaUserCircle />
        </div>
      </div>

      {/* Menu */}
      {isMenuOpen && <Menu onClose={toggleMenu} />}

      {/* User Popup */}
      {isPopupOpen && (
        <UserPopup
          onClose={togglePopup}
          openAccount={() => {
            setShowAccount(true);
            setIsPopupOpen(false);
          }}
          openSettings={() => {
            setShowSettings(true);
            setIsPopupOpen(false);
          }}
          openHelp={() => {
            setShowHelp(true);
            setIsPopupOpen(false);
          }}
        />
      )}

      {/* Minha Conta */}
      {showAccount && (
        <MyAccountPopup
          onClose={() => setShowAccount(false)}
          backToProfile={() => {
            setShowAccount(false);
            setIsPopupOpen(true);
          }}
        />
      )}

      {/* Configurações */}
      {showSettings && (
        <PopupSettings
          onClose={() => setShowSettings(false)}
          backToProfile={() => {
            setShowSettings(false);
            setIsPopupOpen(true);
          }}
        />
      )}

      {/* Ajuda */}
      {showHelp && (
        <HelpPopup
          onClose={() => setShowHelp(false)}
          backToProfile={() => {
            setShowHelp(false);
            setIsPopupOpen(true);
          }}
        />
      )}
    </header>
  );
};

export default Header;
