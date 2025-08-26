import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import Spinner from "../../components/Dashboard/Spinner/Spinner";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/http";

const MAX_FIELD = 50;
const MAX_PASS = 50;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSpinner, setLoadingSpinner] = useState(true);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState(false);
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
    if (email.length > MAX_FIELD || password.length > MAX_PASS) {
      setError("Cada campo deve ter no máximo 50 caracteres.");
      return;
    }
    if (!executeRecaptcha) {
      setError("reCAPTCHA não carregou. Atualize a página.");
      return;
    }

    setLoading(true);
    setError("");
    setLoginError(false);

    try {
      const captchaToken = await executeRecaptcha("login");
      await authApi.get("auth/csrf");
      const { data } = await authApi.post("auth/login", {
        email,
        password,
        captchaToken,
      });
      login(data.token, data.username);
      navigate("/dashboard");
    } catch (err: any) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.message ||
        "O servidor não responde. Tente novamente.";
      if (status === 429 && err.response.data.retryAfter) {
        setRetryAfter(err.response.data.retryAfter);
        setError(msg);
      } else {
        const low = msg.toLowerCase();
        if (
          low.includes("conta não encontrada") ||
          low.includes("credenciais") ||
          low.includes("senha")
        ) {
          setLoginError(true);
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
            <h2>Login Temporariamente Bloqueado</h2>
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
          <h2>Login</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="login-email">E-mail</label>
              <input
                id="login-email"
                type="email"
                required
                maxLength={MAX_FIELD}
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError(false);
                }}
                className={loginError ? "input-error" : ""}
              />
              <span
                className="char-count"
                data-current={email.length}
                data-max={MAX_FIELD}
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Senha</label>
              <div className="input-eye">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={MAX_PASS}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(false);
                  }}
                  className={`password-input ${loginError ? "input-error" : ""}`}
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
              <span
                className="char-count"
                data-current={password.length}
                data-max={MAX_PASS}
              />
            </div>
            <button className="auth-button" disabled={loading}>
              {loading ? "Enviando…" : "Entrar"}
            </button>
            {error && <p className="error-msg">{error}</p>}
          </form>
          <div className="auth-footer">
            Não tem conta?{" "}
            <Link to="/register">
              <strong>Registre-se</strong>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
