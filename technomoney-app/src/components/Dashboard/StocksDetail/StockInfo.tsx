import React from "react";
import MetricPill from "../StocksHome/MetricPill";
import type { AssetDetail } from "../../../types/assets";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPercent = (value: number, precision: "default" | "fine" = "default") => {
  const formatter = precision === "fine" ? percentFormatter : decimalFormatter;
  return `${formatter.format(value)}%`;
};

const formatMillions = (value: number) => {
  if (!Number.isFinite(value)) return "N/D";
  return `${decimalFormatter.format(value / 1_000_000)} mi`;
};

const formatBillions = (value: number) => {
  if (!Number.isFinite(value)) return "N/D";
  const billions = value / 1_000_000_000;
  if (Math.abs(billions) >= 0.1) {
    return `${decimalFormatter.format(billions)} bi`;
  }
  return currencyFormatter.format(value);
};

type Props = {
  stock: AssetDetail;
};

const StockInfo = ({ stock }: Props) => {
  const { fundamentals } = stock;
  const metrics = [
    { label: "Preço", value: currencyFormatter.format(stock.preco) },
    {
      label: "DY",
      value: formatPercent(stock.dividendYield * 100, "fine"),
    },
    { label: "ROE", value: formatPercent(fundamentals.roe) },
    { label: "P/L", value: fundamentals.pl.toFixed(1) },
    { label: "Margem", value: formatPercent(fundamentals.margem) },
    { label: "EV/EBIT", value: fundamentals.ev_ebit.toFixed(1) },
    { label: "Liquidez", value: formatMillions(fundamentals.liquidez) },
    { label: "Score", value: fundamentals.score.toFixed(0) },
    { label: "Market Cap", value: formatBillions(stock.marketCap) },
  ];

  return (
    <div className="stock-info">
      {metrics.map((metric) => (
        <MetricPill key={metric.label} label={metric.label} value={metric.value} />
      ))}
    </div>
  );
};

export default StockInfo;
