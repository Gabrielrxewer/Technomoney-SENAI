import React, { useMemo } from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import type { AssetSummary } from "../../../types/assets";

function HeatmapTooltip({ payload }: any) {
  const list = payload ?? [];
  if (!list.length) return null;
  const p = list[0].payload;

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
      }),
    []
  );

  const liquidityLabel = `${formatter.format(
    Math.round((p?.rawLiquidity ?? 0) / 1_000_000)
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
        {p?.name} • {p?.setor}
      </div>
      <div>Liquidez: {liquidityLabel}</div>
      <div style={{ color: (p?.value ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
        Variação: {(p?.value ?? 0) > 0 ? `+${(p?.value ?? 0).toFixed(2)}%` : `${(p?.value ?? 0).toFixed(2)}%`}
      </div>
    </div>
  );
}

type ViewProps = { data: any[] };

const HeatmapView = React.memo(function HeatmapView({ data }: ViewProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="heatmap-container"
        style={{ position: "relative", height: 420, width: "100%" }}
      >
        <div className="heatmap" style={{ height: "100%", width: "100%" }}>
          <div className="empty-inset">
            <div className="empty-title">Sem dados para o Mapa do Mercado</div>
            <div className="empty-sub">Ajuste a busca para visualizar os blocos.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="heatmap-container"
      style={{ position: "relative", height: 420, width: "100%" }}
    >
      <div className="heatmap" style={{ height: "100%", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            stroke="#1f2937"
            fill="fill"
            isAnimationActive={false}
          >
            <Tooltip content={<HeatmapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}, (prev, next) => prev.data === next.data);

type Props = {
  items: AssetSummary[];
};

export default function Heatmap({ items }: Props) {
  const data = useMemo(() => {
    const src = items ?? [];
    if (!src.length) return [];
    return src.map((s) => {
      const liquidity = Number.isFinite(s?.fundamentals?.liquidez)
        ? s.fundamentals.liquidez
        : 0;
      const liquidityMillions = Math.max(1, Math.round(liquidity / 1_000_000));
      return {
        name: s?.tag,
        size: liquidityMillions,
        value: s?.variacao ?? 0,
        setor: s?.setor ?? "",
        fill: (s?.variacao ?? 0) >= 0 ? "#22c55e" : "#ef4444",
        rawLiquidity: liquidity,
      };
    });
  }, [items]);

  return <HeatmapView data={data} />;
}
