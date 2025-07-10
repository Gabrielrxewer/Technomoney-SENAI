import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/http";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const MAX_FIELD = 50;
const MAX_PASS = 50;

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState(false);

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

    if (email.length > MAX_FIELD || password.length > MAX_PASS) {
      setError("Cada campo deve ter no máximo 50 caracteres.");
      return;
    }

    setLoading(true);
    setError("");
    setLoginError(false);

    try {
      const { data } = await authApi.post("/api/auth/login", {
        email,
        password,
      });
      login(data.token, data.username);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "O servidor não responde. Tente novamente.";
      const low = msg.toLowerCase();
      if (
        low.includes("conta não encontrada") ||
        low.includes("credenciais") ||
        low.includes("senha")
      )
        setLoginError(true);
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
          <h2>Login</h2>

          <form onSubmit={handleSubmit}>
            {/* EMAIL */}
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
              <span className="char-count">{MAX_FIELD - email.length}</span>
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label htmlFor="login-password">Senha</label>

              <div className="input-eye">
                <input
                  id="login-password"
                  className={`password-input ${loginError ? "input-error" : ""}`}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={MAX_PASS}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError(false);
                  }}
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShow(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <span className="char-count">{MAX_PASS - password.length}</span>
            </div>

            <button className="auth-button" disabled={loading}>
              {loading ? "Enviando…" : "Entrar"}
            </button>

            {error && <p className="error-msg">{error}</p>}
          </form>

          <div className="auth-footer">
            <p>
              Não tem uma conta?{" "}
              <Link to="/register">
                <strong>Registre-se</strong>
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
