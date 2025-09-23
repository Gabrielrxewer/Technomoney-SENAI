import React from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";

const mockItems = [
  { ticker: 'AAPL', liquidez: 60000000, variacao: 1.25, setor: 'Tecnologia' },
  { ticker: 'MSFT', liquidez: 40000000, variacao: -0.85, setor: 'Tecnologia' },
  { ticker: 'GOOG', liquidez: 30000000, variacao: 0.45, setor: 'Serviços' },
  { ticker: 'AMZN', liquidez: 80000000, variacao: -2.35, setor: 'Consumo' },
  { ticker: 'TSLA', liquidez: 25000000, variacao: 4.10, setor: 'Automotivo' },
  { ticker: 'META', liquidez: 35000000, variacao: -1.05, setor: 'Redes Sociais' },
  { ticker: 'NFLX', liquidez: 45000000, variacao: 2.85, setor: 'Entretenimento' },
  { ticker: 'NVDA', liquidez: 50000000, variacao: -1.10, setor: 'Tecnologia' },
  { ticker: 'SPY', liquidez: 90000000, variacao: 0.80, setor: 'ETFs' },
  { ticker: 'BABA', liquidez: 22000000, variacao: -3.20, setor: 'Consumo' },
  { ticker: 'DIS', liquidez: 32000000, variacao: 1.80, setor: 'Entretenimento' },
  { ticker: 'BA', liquidez: 12000000, variacao: -0.25, setor: 'Aeroespacial' },
  { ticker: 'V', liquidez: 18000000, variacao: 2.40, setor: 'Financeiro' },
  { ticker: 'JPM', liquidez: 25000000, variacao: -1.50, setor: 'Financeiro' },
  { ticker: 'TSM', liquidez: 55000000, variacao: 0.95, setor: 'Semicondutores' },
  { ticker: 'INTC', liquidez: 30000000, variacao: -1.75, setor: 'Semicondutores' },
  { ticker: 'AMD', liquidez: 40000000, variacao: 5.25, setor: 'Semicondutores' },
  { ticker: 'PFE', liquidez: 18000000, variacao: 0.50, setor: 'Farmacêutico' },
  { ticker: 'JNJ', liquidez: 29000000, variacao: 1.10, setor: 'Farmacêutico' },
  { ticker: 'BA', liquidez: 14000000, variacao: 1.80, setor: 'Aeroespacial' },
  { ticker: 'MA', liquidez: 23000000, variacao: 1.80, setor: 'Financeiro' },
  { ticker: 'PG', liquidez: 28000000, variacao: 1.05, setor: 'Consumo' },
  { ticker: 'DIS', liquidez: 32000000, variacao: 1.80, setor: 'Entretenimento' },
];

type Props = { items: { ticker: string; liquidez: number; variacao: number; setor: string }[] };

export default function Heatmap({ items }: Props) {
  const data = mockItems.map(s => ({
    name: s.ticker,
    size: Math.max(1, Math.round(s.liquidez / 1000000)), 
    value: s.variacao,
    setor: s.setor,
    fill: s.variacao >= 0 ? '#22c55e' : '#ef4444' 
  }));

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
              const payload = props && props.payload ? props.payload : []
              if (!payload.length) return null
              const p = payload[0].payload
              return (
                <div style={{ background: "#fff", color: "#111", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", padding: "8px 10px", fontSize: 12 }}>
                  <div>{p.name} • {p.setor}</div>
                  <div>Liquidez: {p.size}M</div>
                  <div style={{ color: p.value >= 0 ? '#22c55e' : '#ef4444' }}>
                    Variação: {p.value > 0 ? `+${p.value}%` : `${p.value}%`}
                  </div>
                </div>
              )
            }} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
