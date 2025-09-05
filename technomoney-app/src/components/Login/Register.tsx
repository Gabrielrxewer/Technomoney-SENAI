import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import Spinner from "../../components/Dashboard/Spinner/Spinner";
import { authApi } from "../../services/http";
import { useAuth } from "../../context/AuthContext";

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
  const [loadingSpinner, setLoadingSpinner] = useState(true);
  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setLoadingSpinner(false), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (retryAfter === null) return;
    if (retryAfter <= 0) {
      setRetryAfter(null);
      setError("");
      return;
    }
    const timer = setTimeout(() => setRetryAfter(retryAfter - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || retryAfter) return;
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
      const captchaToken = await executeRecaptcha("login");
      const { data: csrf } = await authApi.get("auth/csrf", {
        withCredentials: true,
      });
      if (csrf?.csrfToken)
        authApi.defaults.headers.common["x-csrf-token"] = csrf.csrfToken;
      await authApi.post(
        "auth/register",
        { username, email, password, recaptchaToken: captchaToken },
        { withCredentials: true }
      );
      const loginRes = await authApi.post(
        "auth/login",
        { email, password, recaptchaToken: captchaToken },
        { withCredentials: true }
      );
      login(loginRes.data.token, loginRes.data.username);
      navigate("/dashboard");
    } catch (err: any) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.message ||
        "O servidor não responde. Tente novamente.";
      if (status === 429 && err.response?.data?.retryAfter) {
        setRetryAfter(err.response.data.retryAfter);
        setError(msg);
      } else {
        if (msg.toLowerCase().includes("e-mail já está em uso")) {
          setEmailTaken(true);
        }
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingSpinner) return <Spinner />;

  if (retryAfter !== null) {
    return (
      <div className="auth-container">
        <Header />
        <div className="auth-content">
          <div className="auth-card blocked">
            <h2>Registro Temporariamente Bloqueado</h2>
            <p>
              Você poderá tentar novamente em <strong>{retryAfter}s</strong>.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <Header />
      <div className="auth-content">
        <div className="auth-card">
          <h2>Registro</h2>
          <form onSubmit={handleSubmit} noValidate>
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
              <span
                className="char-count"
                data-current={username.length}
                data-max={MAX_FIELD}
              />
            </div>
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
              <span
                className="char-count"
                data-current={email.length}
                data-max={MAX_FIELD}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">Senha</label>
              <div className="input-eye">
                <input
                  id="reg-password"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={MAX_PASS}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="password-input"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <span
                className="char-count"
                data-current={password.length}
                data-max={MAX_PASS}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm">Confirmar senha</label>
              <div className="input-eye">
                <input
                  id="reg-confirm"
                  type={showConf ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={MAX_PASS}
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="password-input"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowConf(!showConf)}
                  aria-label={showConf ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConf ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <span
                className="char-count"
                data-current={confirm.length}
                data-max={MAX_PASS}
              />
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
