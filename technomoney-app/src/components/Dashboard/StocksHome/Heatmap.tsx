import React, { useEffect, useMemo, useRef, useState } from "react";
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
  minUpdateMs?: number;
  immediateFirstDraw?: boolean;
};

export default function Heatmap({
  items,
  minUpdateMs = 60_000,
  immediateFirstDraw = true,
}: Props) {
  const latestItemsRef = useRef<AssetSummary[]>(items ?? []);
  useEffect(() => {
    latestItemsRef.current = items ?? [];
  }, [items]);

  const buildData = (src: AssetSummary[]) => {
    return (src ?? []).map((s) => {
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
  };

  const layoutSignature = (data: any[]) =>
    data.map((d) => `${d.name}:${d.size}`).join("|");

  const [data, setData] = useState<any[]>(
    immediateFirstDraw ? buildData(latestItemsRef.current) : []
  );

  const lastLayoutSigRef = useRef<string>(layoutSignature(data));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (immediateFirstDraw && data.length === 0) {
      const first = buildData(latestItemsRef.current);
      setData(first);
      lastLayoutSigRef.current = layoutSignature(first);
    }

    timerRef.current = setInterval(() => {
      const fresh = buildData(latestItemsRef.current);
      const newLayoutSig = layoutSignature(fresh);

      if (newLayoutSig !== lastLayoutSigRef.current) {
        setData(fresh);
        lastLayoutSigRef.current = newLayoutSig;
      }
    }, Math.max(60_000, minUpdateMs));

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [minUpdateMs, immediateFirstDraw]);

  return <HeatmapView data={data} />;
}
