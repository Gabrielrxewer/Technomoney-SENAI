import React, { useMemo } from "react";
import "./SummaryStrip.css";

type Props = {
  preco: string;
  variacao: string;
  nome: string;
  volume: string;
  marketCap: string;
  dividendYield: string;
};

const SummaryStrip: React.FC<Props> = ({
  preco,
  variacao,
  nome,
  volume,
  marketCap,
  dividendYield,
}) => {
  const { variationClass, variationIcon, variationAria } = useMemo(() => {
    const raw = (variacao ?? "")
      .replace(/\s+/g, "")
      .replace("%", "")
      .replace(/\./g, "")
      .replace(",", ".");
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return { variationClass: "variation-neutral", variationIcon: "■", variationAria: "Variação estável" };
    if (n > 0) return { variationClass: "variation-up", variationIcon: "▲", variationAria: "Variação em alta" };
    if (n < 0) return { variationClass: "variation-down", variationIcon: "▼", variationAria: "Variação em queda" };
    return { variationClass: "variation-neutral", variationIcon: "■", variationAria: "Variação estável" };
  }, [variacao]);

  return (
    <section className="ss-strip ss-card" aria-label="Resumo do ativo" data-testid="summary-strip">
      <header className="ss-top">
        <div className="price-line" role="group" aria-label="Preço e variação">
          <span className="ss-label">Preço</span>
          <span className="ss-value price" data-testid="summary-price">{preco}</span>
          <span
            className={`variation-chip ${variationClass}`}
            role="status"
            aria-live="polite"
            aria-label={variationAria}
            title={variationAria}
            data-testid="summary-variation"
          >
            <span className="variation-icon" aria-hidden="true">{variationIcon}</span>
            <span className="variation-text">{variacao}</span>
          </span>
        </div>
      </header>

      <dl className="ss-grid" data-testid="summary-grid">
        {[
          { label: "Empresa", value: nome },
          { label: "Volume", value: volume },
          { label: "Market Cap", value: marketCap },
          { label: "Dividend Yield", value: dividendYield },
          { label: "Setor", value: "Minerais & Metais" },
          { label: "P/L", value: "7,8" },
          { label: "Beta (2y)", value: "1,12" },
          { label: "Free Float", value: "82%" },
        ].map((item) => (
          <div key={item.label} className="ss-item">
            <dt className="ss-label" title={item.label}>{item.label}</dt>
            <dd className="ss-value" data-testid={`summary-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default SummaryStrip;
