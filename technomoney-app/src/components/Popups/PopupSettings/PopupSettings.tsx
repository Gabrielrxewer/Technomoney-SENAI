import React, { useState } from "react";
import "../CSSPopup/Popup.css";

interface PopupSettingsProps {
  onClose: () => void;
  backToProfile: () => void;
}

const PopupSettings: React.FC<PopupSettingsProps> = ({
  onClose,
  backToProfile,
}) => {
  const [language, setLanguage] = useState("pt");

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

          <h2>Configurações</h2>

          <div className="settings-options">
            <label>
              <input type="checkbox" defaultChecked />
              Ativar Notificações
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              Usar Tema Escuro
            </label>

            <div className="language-select">
              <label>
                <strong>Idioma:</strong>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="pt">Português (BR)</option>
                <option value="en">English (EN)</option>
                <option value="es">Español (ES)</option>
                <option value="fr">Français (FR)</option>
              </select>
            </div>

            <div className="section-divider"></div>

            <div className="advanced-settings">
              <h3>Ajuda e Suporte</h3>
              <ul>
                <li>Alterar Senha</li>
                <li>Configurações Avançadas</li>
                <li>Termos de Serviço</li>
              </ul>
            </div>
          </div>

          <button className="back-btn" onClick={backToProfile}>
            ← Voltar para Perfil
          </button>
        </div>
      </div>
    </>
  );
};

export default PopupSettings;
