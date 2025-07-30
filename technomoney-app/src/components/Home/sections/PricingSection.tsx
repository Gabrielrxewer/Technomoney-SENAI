import React, { useState } from "react";
import CheckoutModal from "../../Payment/PaymentForm";
import "./Sections.css";

type Plan = { key: string; title: string; description: string; price: string };

const plans: Plan[] = [
  {
    key: "basico",
    title: "Básico",
    description: "Perfeito para iniciantes que buscam ferramentas essenciais.",
    price: "29.90",
  },
  {
    key: "profissional",
    title: "Profissional",
    description:
      "Funcionalidades avançadas, relatórios detalhados e alertas customizáveis.",
    price: "79.90",
  },
  {
    key: "premium",
    title: "Premium",
    description:
      "Tudo do plano Profissional + consultoria dedicada e treinamentos exclusivos.",
    price: "149.90",
  },
];
export default function PricingSection() {
  const [selected, setSelected] = useState<Plan | null>(null);

  return (
    <section
      id="precos"
      className="section_generic"
      aria-label="Preços / Planos"
    >
      <h2>Planos</h2>

      <div className="pricing__plans">
        {plans.map((p) => (
          <div
            key={p.key}
            className={`plan_card${selected?.key === p.key ? " active" : ""}`}
            onClick={() => setSelected(p)}
          >
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <p>
              <strong>R$ {p.price}/mês</strong>
            </p>
            {/* Botão mudou de lugar — dentro do card */}
            <button
              className="btn_home btn--primary_home"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(p);
              }}
            >
              Assinar {p.title}
            </button>
          </div>
        ))}
      </div>

      {/* modal fica fora do fluxo normal */}
      {selected && (
        <CheckoutModal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          price={selected.price}
          plan={selected.title}
        />
      )}
    </section>
  );
};
