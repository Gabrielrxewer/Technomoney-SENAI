import React from "react";
import "../CSSPopup/Popup.css";

interface MyAccountPopupProps {
  onClose: () => void;
  backToProfile: () => void;
}

const MyAccountPopup: React.FC<MyAccountPopupProps> = ({
  onClose,
  backToProfile,
}) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChangePhoto = () => {
    alert("Funcionalidade para alterar foto de perfil.");
  };

  const handleChangePassword = () => {
    alert("Funcionalidade para alterar senha.");
  };

  const handleEditInfo = () => {
    alert("Funcionalidade para editar informações da conta.");
  };

  return (
    <>
      <div className="popup-overlay" onClick={handleOverlayClick}></div>
      <div className="popup-container">
        <div className="popup-content">
          <button onClick={onClose} className="close-btn">
            ×
          </button>

          <h2>Minha Conta</h2>

          <div className="account-info">
            <div className="profile-photo">
              <span>Foto de Perfil</span>
            </div>

            <button className="action-btn" onClick={handleChangePhoto}>
              Alterar Foto de Perfil
            </button>

            <p className="name">
              <strong>Nome:</strong> Usuário Exemplo
            </p>
            <p>
              <strong>Email:</strong> exemplo@email.com
            </p>
          </div>

          <div className="account-actions">
            <button className="action-btn" onClick={handleChangePassword}>
              Alterar Senha
            </button>
            <button className="action-btn" onClick={handleEditInfo}>
              Editar Informações da Conta
            </button>
          </div>

          <button className="back-btn" onClick={backToProfile}>
            ← Voltar para Perfil
          </button>
        </div>
      </div>
    </>
  );
};

export default MyAccountPopup;
