import React from "react";

type Props = { label: string; value: string };
export default function MetricPill({ label, value }: Props) {
  return (
    <div className="metric-pill">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}
