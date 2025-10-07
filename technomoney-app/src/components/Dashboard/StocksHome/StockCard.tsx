import React from "react";
import type { AssetSummary } from "../../../types/assets";

type Props = { item: AssetSummary; onAdd: (s: AssetSummary) => void };
export default function StockCard({ item, onAdd }: Props) {
  return (
    <div className="stock-card">
      <div className="stock-head">
        <div className="stock-left">
          <span className="stock-name">{item.nome}</span>
          <div className="stock-ticker">{item.tag}</div>
        </div>
        <div className="stock-right">
          <div className="stock-price">R$ {item.preco.toFixed(2)}</div>
          <div
            className={item.variacao >= 0 ? "stock-var-up" : "stock-var-down"}
          >
            {item.variacao >= 0 ? "+" : ""}
            {item.variacao.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="metrics-row">
        <div className="metric-box">
          <div className="m-label">ROE</div>
          <div className="m-val">{item.fundamentals.roe.toFixed(1)}%</div>
        </div>
        <div className="metric-box">
          <div className="m-label">DY</div>
          <div className="m-val">{item.fundamentals.dy.toFixed(1)}%</div>
        </div>
        <div className="metric-box">
          <div className="m-label">P/L</div>
          <div className="m-val">{item.fundamentals.pl.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
