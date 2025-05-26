import React, { useState } from "react";
import axios from "axios";

const Dashboard: React.FC = () => {
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fetchProtectedData = async () => {
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Token não encontrado. Faça login.");
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/auth/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erro ao acessar o conteúdo protegido."
      );
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <button
        onClick={fetchProtectedData}
        style={{
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          cursor: "pointer",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#007bff",
          color: "white",
        }}
      >
        Buscar conteúdo protegido
      </button>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Dashboard;
