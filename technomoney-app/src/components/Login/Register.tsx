import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Auth.css";
import api from "../../api";

const Register: React.FC = () => {
  const [username, setUsername]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [emailTaken, setEmailTaken] = useState(false);   // NOVO

  const navigate = useNavigate();

  /* -------------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const form = e.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true); setError("");

    try {
      await api.post(
        "/api/auth/register",
        { username, email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      navigate("/login");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "O servidor não responde. Tente novamente.";

      // se o backend sinalizou que o e-mail já existe
      if (msg.toLowerCase().includes("e-mail já está em uso")) {
        setEmailTaken(true);
      }

      setError(msg);
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
          <h2>Registro</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reg-username">Usuário</label>
              <input
                id="reg-username"
                required
                placeholder="Escolha um nome"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">E-mail</label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTaken(false);     // limpa o erro assim que o usuário digita
                }}
                className={emailTaken ? "input-error" : ""}   // NOVO
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Senha</label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Confirmar senha</label>
              <input
                id="reg-confirm"
                type="password"
                required
                minLength={6}
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              <Link to="/login"><strong>Entrar</strong></Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Register;
