import React from "react";
import "../CSSPopup/Popup.css";

interface HelpPopupProps {
  onClose: () => void;
  backToProfile: () => void;
}

const HelpPopup: React.FC<HelpPopupProps> = ({
  onClose,
  backToProfile,
}) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="popup-overlay" onClick={handleOverlayClick}></div>
      <div className="popup-container">
        <div className="popup-content">
          <button onClick={onClose} className="close-btn">
            ×
          </button>
          <h2>Ajuda</h2>
          <div className="help-content">
            <h3>Perguntas Frequentes</h3>
            <ul>
              <li>• Como redefinir minha senha?</li>
              <li>• Como alterar minhas preferências?</li>
              <li>• Como desativar minha conta?</li>
            </ul>

            <h3>Suporte</h3>
            <p>Email: suporte@technomoney.com</p>
            <p>Telefone: (11) 1234-5678</p>

            <h3>Recursos Úteis</h3>
            <ul>
              <li>Tutoriais</li>
              <li>Central de Ajuda</li>
              <li>Política de Privacidade</li>
            </ul>
          </div>
          <button className="back-btn" onClick={backToProfile}>
            ← Voltar para Perfil
          </button>
        </div>
      </div>
    </>
  );
};

export default HelpPopup;
