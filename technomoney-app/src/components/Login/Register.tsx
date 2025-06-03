import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

const Register: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await api.post(
        "/api/auth/register",
        { email, password, username },
        { headers: { "Content-Type": "application/json" } }
      );

      login(data.token, data.username);
      navigate("/dashboard");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        "O servidor não responde. Tente novamente";
      setError(message);
      console.error("Erro ao registrar:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Header />
      <div className="auth-content">
        <div className="auth-card">
          <h2>Registrar-se</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Nome de usuário</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Digite seu username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Digite seu e-mail"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Digite sua senha"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirme sua senha"
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Enviando…" : "Registrar"}
            </button>

            {error && <p className="error-msg">{error}</p>}
          </form>

          <div className="auth-footer">
            <p>
              Já tem uma conta?{" "}
              <Link to="/login">
                <strong>Faça login</strong>
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
