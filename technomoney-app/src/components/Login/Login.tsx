import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

const Login: React.FC = () => {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [loginError, setLoginError] = useState(false);   // marca campos em vermelho

  const navigate  = useNavigate();
  const { login } = useAuth();

  /* -------------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    setLoading(true);
    setError("");
    setLoginError(false);

    try {
      const { data } = await api.post(
        "/api/auth/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      login(data.token, data.username);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "O servidor não responde. Tente novamente.";

      /* ativa o vermelho quando é erro de credencial/conta */
      const low = msg.toLowerCase();
      if (
        low.includes("conta não encontrada") ||
        low.includes("usuário não encontrado") ||
        low.includes("credenciais inválidas") ||
        low.includes("senha incorreta")
      ) {
        setLoginError(true);
      }

      setError(msg);
      console.error("Erro ao autenticar:", err);
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
            <div className="form-group">
              <label htmlFor="login-email">E-mail</label>
              <input
                id="login-email"
                type="email"
                required
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError(false);      // limpa highlight ao digitar
                }}
                className={loginError ? "input-error" : ""}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Senha</label>
              <input
                id="login-password"
                type="password"
                required
                minLength={6}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError(false);
                }}
                className={loginError ? "input-error" : ""}
              />
            </div>

            <button className="auth-button" disabled={loading}>
              {loading ? "Enviando…" : "Entrar"}
            </button>

            {error && <p className="error-msg">{error}</p>}
          </form>

          <div className="auth-footer">
            <p>
              Não tem uma conta?{" "}
              <Link to="/register"><strong>Registre-se</strong></Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
