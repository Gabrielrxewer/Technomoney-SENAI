import React, { useState } from "react";
import "./Sections.css";
import CheckoutProForm from "../../Payment/PaymentForm.";

type Plan = {
  key: string;
  title: string;
  description: string;
  price: string;
};

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

const PricingSection: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  return (
    <section
      id="precos"
      className="section_generic"
      aria-label="Preços / Planos"
    >
      <h2>Planos</h2>
      <div className="pricing__plans">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`plan_card${selectedPlan?.key === plan.key ? " active" : ""}`}
            onClick={() => setSelectedPlan(plan)}
          >
            <h3>{plan.title}</h3>
            <p>{plan.description}</p>
            <p>
              <strong>R$ {plan.price}/mês</strong>
            </p>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div className="checkout-container">
          <h3>Você escolheu: {selectedPlan.title}</h3>
          <CheckoutProForm
            defaultAmount={selectedPlan.price}
            defaultPlan={selectedPlan.title}
          />
        </div>
      )}
    </section>
  );
};

export default PricingSection;
