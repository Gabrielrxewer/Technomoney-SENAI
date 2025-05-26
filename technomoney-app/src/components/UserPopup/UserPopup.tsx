import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCog,
  faQuestionCircle,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import "./UserPopup.css";

interface UserPopupProps {
  onClose: () => void;
}

const UserPopup: React.FC<UserPopupProps> = ({ onClose }) => {
  const { username, logout, isAuthenticated } = useAuth();

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="user-popup-overlay" onClick={handleOverlayClick}></div>
      <div className="user-popup">
        <div className="popup-content">
          <button onClick={onClose} className="close-btn" aria-label="Fechar popup">
            ×
          </button>

          {!isAuthenticated ? (
            <ul>
              <li>
                <Link to="/login" onClick={onClose}>
                  Fazer Login
                </Link>
              </li>
              <li>
                <Link to="/register" onClick={onClose}>
                  Registrar-se
                </Link>
              </li>
            </ul>
          ) : (
            <>
              <p className="greeting">Olá {username}</p>
              <ul className="user-menu">
                <li>
                  <Link to="/profile" onClick={onClose}>
                    <FontAwesomeIcon icon={faUser} style={{ marginRight: 8 }} /> Minha Conta
                  </Link>
                </li>
                <li>
                  <Link to="/settings" onClick={onClose}>
                    <FontAwesomeIcon icon={faCog} style={{ marginRight: 8 }} /> Configurações
                  </Link>
                </li>
                <li>
                  <Link to="/help" onClick={onClose}>
                    <FontAwesomeIcon icon={faQuestionCircle} style={{ marginRight: 8 }} /> Ajuda
                  </Link>
                </li>
              </ul>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="logout-btn"
              >
                <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: 8 }} /> Sair
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UserPopup;
