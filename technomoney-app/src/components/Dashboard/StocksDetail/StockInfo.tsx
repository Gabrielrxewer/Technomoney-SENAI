import React from "react";
import { Stock } from "../StocksHome/data";
import MetricPill from "../StocksHome/MetricPill";
import "./StocksDetail.css";

type Props = {
  stock: Stock;
};

const StockInfo = ({ stock }: Props) => {
  return (
    <div className="stock-info">
      <MetricPill label="Preço" value={`R$ ${stock.preco.toFixed(2)}`} />
      <MetricPill label="DY" value={`${stock.dy.toFixed(1)}%`} />
      <MetricPill label="ROE" value={`${stock.roe.toFixed(1)}%`} />
      <MetricPill label="P/L" value={`${stock.pl.toFixed(1)}`} />
      <MetricPill label="Liquidez" value={`${(stock.liquidez / 1000000).toFixed(1)}M`} />
    </div>
  );
};

export default StockInfo;
