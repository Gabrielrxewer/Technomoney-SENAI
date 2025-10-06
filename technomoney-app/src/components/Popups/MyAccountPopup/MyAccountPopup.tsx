import React from "react";
import "../CSSPopup/Popup.css";
import { Button } from "../../ui/Button";

interface MyAccountPopupProps {
  onClose: () => void;
  backToProfile: () => void;
}

const MyAccountPopup: React.FC<MyAccountPopupProps> = ({
  onClose,
  backToProfile,
}) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) =>
    e.target === e.currentTarget && onClose();

  return (
    <>
      {/* Overlay */}
      <div className="popup-overlay" onClick={handleOverlayClick} />

      {/* Modal */}
      <div className="popup-container">
        <div className="popup-content">
          <button className="close-btn" aria-label="Fechar" onClick={onClose}>
            ×
          </button>

          <h2>Minha Conta</h2>

          {/* Info */}
          <div className="account-info">
            <div className="profile-photo">Foto de Perfil</div>

            <Button
              variant="outline"
              onClick={() => alert("Alterar foto – implemente")}
              className="custom-button"
            >
              Alterar Foto
            </Button>

            <p className="name">
              <strong>Nome:</strong> Usuário Exemplo
            </p>
            <p>
              <strong>Email:</strong> exemplo@email.com
            </p>
          </div>

          {/* Ações */}
          <div className="account-actions">
            <Button
              variant="primary"
              onClick={() => alert("Alterar senha – implemente")}
              className="custom-button"
            >
              Alterar Senha
            </Button>

            <Button
              variant="primary"
              onClick={() => alert("Editar dados – implemente")}
              className="custom-button"
            >
              Editar Informações
            </Button>
          </div>

          {/* Voltar */}
          <Button
            variant="outline"
            onClick={backToProfile}
            className="custom-button"
          >
            ← Voltar
          </Button>
        </div>
      </div>
    </>
  );
};

export default MyAccountPopup;
