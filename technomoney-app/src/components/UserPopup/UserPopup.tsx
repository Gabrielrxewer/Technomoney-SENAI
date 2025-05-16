import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./UserPopup.css";

interface UserPopupProps {
  onClose: () => void;
}

const UserPopup: React.FC<UserPopupProps> = ({ onClose }) => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) {
      setUsername(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="user-popup">
      <div className="popup-content">
        <button onClick={onClose} className="close-btn">
          X
        </button>

        {!username ? (
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
          <h1>Bem vindo/a {username}</h1>
        )}
      </div>
    </div>
  );
};

export default UserPopup;
