import React from "react"
import { ResponsiveContainer, Treemap, Tooltip } from "recharts"
import { Stock } from "./data"

type Props = { items: Stock[] }

export default function Heatmap({ items }: Props) {
  const data = items.map(s => ({ name: s.ticker, size: Math.max(1, Math.round(s.liquidez / 1000000)), value: s.variacao, setor: s.setor }))
  return (
    <div className="heatmap">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={data} dataKey="size" nameKey="name" stroke="#1f2937" fill="#64748b">
          <Tooltip content={(props: any) => {
            const payload = props && props.payload ? props.payload : []
            if (!payload.length) return null
            const p = payload[0].payload
            return (
              <div style={{ background: "#fff", color: "#111", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", padding: "8px 10px", fontSize: 12 }}>
                <div>{p.name} • {p.setor}</div>
                <div>Liquidez: {p.size}M</div>
              </div>
            )
          }} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
