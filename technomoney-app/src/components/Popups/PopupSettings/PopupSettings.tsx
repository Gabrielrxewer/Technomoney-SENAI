import React, { useEffect, useState } from "react";
import "../CSSPopup/Popup.css";
import { Button } from "../../ui/Button";

interface PopupSettingsProps {
  onClose: () => void;
  backToProfile: () => void;
}

interface Preferences {
  notifications: boolean;
  darkTheme: boolean;
  language: string;
}

const STORAGE_KEY = "tmPreferences";

const PopupSettings: React.FC<PopupSettingsProps> = ({
  onClose,
  backToProfile,
}) => {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : { notifications: true, darkTheme: true, language: "pt" };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    const root = document.documentElement;
    prefs.darkTheme
      ? root.classList.remove("theme-light")
      : root.classList.add("theme-light");
  }, [prefs]);

  const toggle = (key: keyof Preferences) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  const setLanguage = (language: string) =>
    setPrefs((p) => ({ ...p, language }));

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) =>
    e.target === e.currentTarget && onClose();

  return (
    <>
      <div className="popup-overlay" onClick={handleOverlayClick} />
      <div className="popup-container">
        <div className="popup-content">
          <button onClick={onClose} className="close-btn" aria-label="Fechar">
            ×
          </button>

          <h2>Configurações</h2>

          <div className="settings-options">
            <label>
              <input
                type="checkbox"
                checked={prefs.notifications}
                onChange={() => toggle("notifications")}
              />
              Ativar Notificações
            </label>

            <label>
              <input
                type="checkbox"
                checked={prefs.darkTheme}
                onChange={() => toggle("darkTheme")}
              />
              Usar Tema Escuro
            </label>

            <div className="language-select">
              <label>
                <strong>Idioma:</strong>
              </label>
              <select
                value={prefs.language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="pt">Português (BR)</option>
                <option value="en">English (EN)</option>
                <option value="es">Español (ES)</option>
                <option value="fr">Français (FR)</option>
              </select>
            </div>

            <div className="section-divider" />

            <div className="advanced-settings">
              <h3>Ajuda &amp; Suporte</h3>
              <ul>
                <li onClick={() => alert("Alterar senha")}>Alterar Senha</li>
                <li onClick={() => alert("Configurações avançadas")}>
                  Configurações Avançadas
                </li>
                <li onClick={() => alert("Termos de Serviço")}>
                  Termos de Serviço
                </li>
              </ul>
            </div>
          </div>

          <Button variant="outline" onClick={backToProfile}>
            ← Voltar
          </Button>
        </div>
      </div>
    </>
  );
};

export default PopupSettings;
