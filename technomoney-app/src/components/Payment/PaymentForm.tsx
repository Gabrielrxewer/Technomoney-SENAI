import { FormEvent, useState } from "react";
import styles from "./CheckoutModal.module.css";
import { paymentsApi } from "../../services/http";

interface Props {
  open: boolean;
  onClose: () => void;
  price: string;
  plan: string;
}

export default function CheckoutModal({ open, onClose, price, plan }: Props) {
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const { data } = await paymentsApi.post("/payments", {
      fullName,
      cpf,
      email,
      amount: Number(price),
      platform: plan,
    });

    window.location.href = data.init_point;
  }

  return (
    <div className={styles["tmchk-overlay"]} onClick={onClose}>
      <div
        className={styles["tmchk-modal"]}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tmchk-title"
      >
        <button
          className={styles["tmchk-close"]}
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <h2 id="tmchk-title" className={styles["tmchk-title"]}>
          Checkout
        </h2>

        <form onSubmit={handleSubmit} className={styles["tmchk-form"]}>
          <label>Nome completo</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <label>CPF</label>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
          />

          <label>E‑mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Valor (R$)</label>
          <input type="text" value={price} readOnly />
          <button type="submit">Pagar</button>
        </form>
      </div>
    </div>
  );
}
