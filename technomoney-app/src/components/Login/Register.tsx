import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import { authApi } from "../../services/http";
import { useAuth } from "../../context/AuthContext";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const MAX_FIELD = 50;
const MAX_PASS = 50;

const Register: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);

  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (
      username.length > MAX_FIELD ||
      email.length > MAX_FIELD ||
      password.length > MAX_PASS ||
      confirm.length > MAX_PASS
    ) {
      setError("Cada campo deve ter no máximo 50 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!executeRecaptcha) {
      setError("reCAPTCHA não carregou. Atualize a página.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const captchaToken = await executeRecaptcha("register");
      await authApi.post("/api/auth/register", {
        username,
        email,
        password,
        captchaToken,
      });
      const { data } = await authApi.post("/api/auth/login", {
        email,
        password,
        captchaToken,
      });
      login(data.token, data.username);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "O servidor não responde. Tente novamente.";
      if (msg.toLowerCase().includes("e-mail já está em uso"))
        setEmailTaken(true);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Header />

      <div className="auth-content">
        <div className="auth-card">
          <h2>Registro</h2>

          <form onSubmit={handleSubmit}>
            {/* USERNAME */}
            <div className="form-group">
              <label htmlFor="reg-username">Usuário</label>
              <input
                id="reg-username"
                required
                maxLength={MAX_FIELD}
                placeholder="Escolha um nome"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <span className="char-count">{MAX_FIELD - username.length}</span>
            </div>

            {/* EMAIL */}
            <div className="form-group">
              <label htmlFor="reg-email">E-mail</label>
              <input
                id="reg-email"
                type="email"
                required
                maxLength={MAX_FIELD}
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTaken(false);
                }}
                className={emailTaken ? "input-error" : ""}
              />
              <span className="char-count">{MAX_FIELD - email.length}</span>
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label htmlFor="reg-password">Senha</label>

              <div className="input-eye">
                <input
                  id="reg-password"
                  className="password-input"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={MAX_PASS}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <span className="char-count">{MAX_PASS - password.length}</span>
            </div>

            {/* CONFIRM */}
            <div className="form-group">
              <label htmlFor="reg-confirm">Confirmar senha</label>

              <div className="input-eye">
                <input
                  id="reg-confirm"
                  className="password-input"
                  type={showConf ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={MAX_PASS}
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label={showConf ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowConf(!showConf)}
                >
                  {showConf ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <span className="char-count">{MAX_PASS - confirm.length}</span>
            </div>

            <button className="auth-button" disabled={loading}>
              {loading ? "Enviando…" : "Registrar"}
            </button>

            {error && <p className="error-msg">{error}</p>}
          </form>

          <div className="auth-footer">
            <p>
              Já tem conta?{" "}
              <Link to="/login">
                <strong>Entrar</strong>
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Register;
