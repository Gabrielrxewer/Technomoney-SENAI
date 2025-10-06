import React from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import type { AssetSummary } from "../../../types/assets";

type Props = { items: AssetSummary[] };

export default function Heatmap({ items }: Props) {
  const data = (items ?? []).map((s) => {
    const liquidity = Number.isFinite(s.fundamentals.liquidez)
      ? s.fundamentals.liquidez
      : 0;
    const liquidityMillions = Math.max(1, Math.round(liquidity / 1_000_000));
    return {
      name: s.tag,
      size: liquidityMillions,
      value: s.variacao,
      setor: s.setor,
      fill: s.variacao >= 0 ? "#22c55e" : "#ef4444",
      rawLiquidity: liquidity,
    };
  });

  return (
    <div className="heatmap-container">
      <div className="heatmap">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            stroke="#1f2937"
            fill="fill"
          >
            <Tooltip content={(props: any) => {
              const payload = props && props.payload ? props.payload : [];
              if (!payload.length) return null;
              const p = payload[0].payload;
              const formatter = new Intl.NumberFormat("pt-BR", {
                maximumFractionDigits: 0,
              });
              const liquidityLabel = `${formatter.format(
                Math.round(p.rawLiquidity / 1_000_000)
              )}M`;
              return (
                <div
                  style={{
                    background: "#fff",
                    color: "#111",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,.08)",
                    padding: "8px 10px",
                    fontSize: 12,
                  }}
                >
                  <div>
                    {p.name} • {p.setor}
                  </div>
                  <div>Liquidez: {liquidityLabel}</div>
                  <div style={{ color: p.value >= 0 ? "#22c55e" : "#ef4444" }}>
                    Variação: {p.value > 0 ? `+${p.value.toFixed(2)}%` : `${p.value.toFixed(2)}%`}
                  </div>
                </div>
              );
            }} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
