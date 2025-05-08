import React from 'react';
import { Link } from 'react-router-dom';
import './UserPopup.css'; 

interface UserPopupProps {
  onClose: () => void;  
}

const UserPopup: React.FC<UserPopupProps> = ({ onClose }) => {
  return (
    <div className="user-popup">
      <div className="popup-content">
        <button onClick={onClose} className="close-btn">X</button>
        <ul>
          <li>
            <Link to="/login" onClick={onClose}>Login</Link>
          </li>
          <li>
            <Link to="/register" onClick={onClose}>Registrar-se</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default UserPopup;
