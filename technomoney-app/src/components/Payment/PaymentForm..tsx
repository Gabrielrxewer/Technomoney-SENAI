import { FormEvent, useState, useEffect } from "react";
import { paymentsApi } from "../../services/http";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function CheckoutProForm({
  defaultAmount = "0.00",
  defaultPlan = "",
}: {
  defaultAmount?: string;
  defaultPlan?: string;
}) {
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<"credit_card" | "debit_card" | "pix">(
    "credit_card"
  );
  const [platform] = useState(defaultPlan);
  const [mp, setMp] = useState<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      const mpInstance = new window.MercadoPago(
        import.meta.env.VITE_MP_PUBLIC_KEY,
        { locale: "pt-BR" }
      );
      setMp(mpInstance);
    };
    document.body.appendChild(script);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mp) {
      alert("Aguarde o SDK do Mercado Pago carregar...");
      return;
    }

    try {
      // dispara preferência no backend
      const response = await paymentsApi.post("/payments", {
        fullName,
        cpf,
        email,
        method,
        amount: Number(amount), // <‑‑ converte para número
        platform,
      });
      const { id } = response.data; // pega só o id

      // inicia o Checkout Pro
      mp.checkout({
        preference: { id },
        render: {
          container: "#mp-checkout-pro",
          label: "Pagar com Mercado Pago",
        },
      });
    } catch (err: any) {
      console.error("Erro ao criar preferência:", err.response?.data || err);
      alert(
        "Não foi possível iniciar o pagamento. Veja o console para mais detalhes."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "0 auto" }}>
      <h2>Checkout Pro — {platform}</h2>

      <div>
        <label>Nome completo</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div>
        <label>CPF</label>
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          required
        />
      </div>

      <div>
        <label>E‑mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Meio de pagamento</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
        >
          <option value="credit_card">Cartão de Crédito</option>
          <option value="debit_card">Cartão de Débito</option>
          <option value="pix">Pix</option>
        </select>
      </div>

      <button type="submit">Pagar</button>

      {/* container onde o SDK injeta o botão/layout */}
      <div id="mp-checkout-pro" style={{ marginTop: 20 }} />
    </form>
  );
}
