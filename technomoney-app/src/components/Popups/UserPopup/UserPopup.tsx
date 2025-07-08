import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCog,
  faQuestionCircle,
  faSignOutAlt,
  faSignInAlt,
  faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import "./UserPopup.css";
import "../CSSPopup/Popup.css";
import { Button } from "../../ui/Button";

interface UserPopupProps {
  onClose: () => void;
  openAccount: () => void;
  openSettings: () => void;
  openHelp: () => void;
}

const UserPopup: React.FC<UserPopupProps> = ({
  onClose,
  openAccount,
  openSettings,
  openHelp,
}) => {
  const { username, logout, isAuthenticated } = useAuth();

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) =>
    e.target === e.currentTarget && onClose();

  return (
    <>
      <div className="user-popup-overlay" onClick={handleOverlayClick}></div>
      <div className="user-popup">
        <div className="popup-content">
          <button
            onClick={onClose}
            className="close-btn"
            aria-label="Fechar popup"
          >
            ×
          </button>

          {!isAuthenticated ? (
            <ul>
              <li>
                <Link to="/login" onClick={onClose}>
                  <FontAwesomeIcon
                    icon={faSignInAlt}
                    style={{ marginRight: 8 }}
                  />
                  Fazer Login
                </Link>
              </li>
              <li>
                <Link to="/register" onClick={onClose}>
                  <FontAwesomeIcon
                    icon={faUserPlus}
                    style={{ marginRight: 8 }}
                  />
                  Registrar-se
                </Link>
              </li>
            </ul>
          ) : (
            <>
              <p className="greeting">Olá, {username}</p>
              <ul className="user-menu">
                <li onClick={openAccount}>
                  <FontAwesomeIcon icon={faUser} style={{ marginRight: 8 }} />
                  Minha Conta
                </li>
                <li onClick={openSettings}>
                  <FontAwesomeIcon icon={faCog} style={{ marginRight: 8 }} />
                  Configurações
                </li>
                <li onClick={openHelp}>
                  <FontAwesomeIcon
                    icon={faQuestionCircle}
                    style={{ marginRight: 8 }}
                  />
                  Ajuda
                </li>
              </ul>

              <Button
                variant="danger"
                onClick={() => {
                  logout();
                  onClose();
                }}
              >
                <FontAwesomeIcon
                  icon={faSignOutAlt}
                  style={{ marginRight: 8 }}
                />
                Sair
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UserPopup;
