import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type TotpEnrollmentProps = {
  onCompleted?: () => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
  description?: React.ReactNode;
};

const TotpEnrollment: React.FC<TotpEnrollmentProps> = ({
  onCompleted,
  onCancel,
  title = "Habilitar autenticação em duas etapas",
  description,
}) => {
  const { fetchWithAuth } = useAuth();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string>("");

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/totp/status");
      setEnrolled(!!res.data?.enrolled);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Não foi possível verificar o status do MFA.";
      setError(msg);
      setEnrolled(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startEnrollment = async () => {
    setError("");
    setQrDataUrl(null);
    setSecret(null);
    setCode("");
    try {
      setStarting(true);
      const res = await fetchWithAuth("/totp/setup/start", {
        method: "POST",
      });
      setQrDataUrl(res.data?.qrDataUrl || null);
      setSecret(res.data?.secret || null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Não foi possível iniciar a configuração.";
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  const verifyEnrollment = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!code || verifying) return;
    setError("");
    try {
      setVerifying(true);
      await fetchWithAuth("/totp/setup/verify", {
        method: "POST",
        data: { code },
      });
      setEnrolled(true);
      if (onCompleted) await onCompleted();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Não foi possível validar o código informado.";
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <p>Carregando status do MFA…</p>;
    }

    if (enrolled) {
      return <p>Autenticação em duas etapas já está habilitada.</p>;
    }

    return (
      <div className="totp-content">
        {description ? (
          <div className="totp-description">{description}</div>
        ) : (
          <p>
            Utilize um aplicativo autenticador para escanear o QR Code ou
            inserir a chave manualmente. Em seguida, informe o código gerado
            para concluir a ativação.
          </p>
        )}
        <div className="totp-setup">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code para configurar o MFA"
              className="totp-qr"
            />
          ) : (
            <button
              type="button"
              className="auth-button"
              onClick={startEnrollment}
              disabled={starting}
            >
              {starting ? "Gerando QR Code…" : "Gerar QR Code"}
            </button>
          )}
          {secret && (
            <div className="totp-secret">
              <strong>Chave manual:</strong>
              <code>{secret}</code>
            </div>
          )}
          {qrDataUrl && (
            <form onSubmit={verifyEnrollment} className="totp-form">
              <label htmlFor="totp-code">Código de 6 dígitos</label>
              <input
                id="totp-code"
                inputMode="numeric"
                pattern="^[0-9]{6}$"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
              <button
                type="submit"
                className="auth-button"
                disabled={verifying}
              >
                {verifying ? "Validando…" : "Confirmar"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
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
      {error && <p className="error-msg">{error}</p>}
      {renderContent()}
    </div>
  );
};

export default TotpEnrollment;
