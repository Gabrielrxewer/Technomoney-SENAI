import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

type TotpChallengeProps = {
  onSuccess?: (
    result: { token: string; acr?: string | null }
  ) => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
  message?: React.ReactNode;
  disabled?: boolean;
};

const TotpChallenge: React.FC<TotpChallengeProps> = ({
  onSuccess,
  onCancel,
  title = "Confirme o código do autenticador",
  message,
  disabled = false,
}) => {
  const { fetchWithAuth, login, username, setStepUpRequirement } = useAuth();
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (loading || disabled) return;
    if (!code) {
      setError("Informe o código gerado pelo aplicativo autenticador.");
      return;
    }
    setError("");
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/auth/totp/challenge/verify", {
        method: "POST",
        data: { code },
      });
      const data = res.data as { token: string; acr?: string | null };
      if (data?.token) {
        await login(data.token, username);
      }
      setCode("");
      if (setStepUpRequirement) setStepUpRequirement(null);
      if (onSuccess) await onSuccess(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Código inválido. Tente novamente.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="totp-panel">
      <div className="totp-header">
        <h3>{title}</h3>
        {onCancel && (
          <button type="button" className="link-button" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
      {message ? (
        <div className="totp-description">{message}</div>
      ) : (
        <p>
          Abra seu aplicativo autenticador e insira o código de 6 dígitos para
          confirmar sua identidade.
        </p>
      )}
      <form onSubmit={handleSubmit} className="totp-form">
        <label htmlFor="totp-challenge-code">Código de 6 dígitos</label>
        <input
          id="totp-challenge-code"
          inputMode="numeric"
          pattern="\\d{6}"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          disabled={disabled || loading}
        />
        <button
          type="submit"
          className="auth-button"
          disabled={disabled || loading}
        >
          {loading ? "Validando…" : "Confirmar"}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </form>
    </div>
  );
};

export default TotpChallenge;
