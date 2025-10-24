import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AssetDetail } from "../../../types/assets";

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type Props = {
  stock: AssetDetail;
};

const StockChart = ({ stock }: Props) => {
  const data = useMemo(() => {
    const history = Array.isArray(stock.grafico) ? stock.grafico : [];
    if (!history.length) return [];
    const recent = history.slice(-30);
    const start = Date.now() - (recent.length - 1) * DAY_IN_MS;
    return recent.map((price, index) => {
      const date = new Date(start + index * DAY_IN_MS);
      const name = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      return { name, price };
    });
  }, [stock.grafico]);

  if (!data.length) {
    return (
      <div className="stock-panel stock-chart">
        <h2>Histórico de Preço</h2>
        <p className="chart-empty">Sem histórico disponível para este ativo.</p>
      </div>
    );
  }

  return (
    <div className="stock-chart">
      <h2>Histórico de Preço</h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
          <YAxis
            stroke="#94a3b8"
            tickFormatter={(value) => priceFormatter.format(value)}
            tickLine={false}
            width={100}
          />
          <Tooltip
            formatter={(value: number) => priceFormatter.format(value)}
            contentStyle={{
              backgroundColor: "#111827",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#f9fafb",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
