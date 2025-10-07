import React from "react";
import { Stock } from "../StocksHome/data";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Props = {
  stock: Stock;
};

const StockChart = ({ stock }: Props) => {
  const generatePrice = (basePrice: number, month: number) => {
    const monthlyVariation = (Math.random() - 0.5) * 0.10; 
    return basePrice * (1 + monthlyVariation); 
  };

  const data = [
    { name: "Jan", price: generatePrice(stock.preco, 1) },
    { name: "Feb", price: generatePrice(stock.preco, 2) },
    { name: "Mar", price: generatePrice(stock.preco, 3) },
    { name: "Apr", price: generatePrice(stock.preco, 4) },
    { name: "May", price: generatePrice(stock.preco, 5) },
    { name: "Jun", price: generatePrice(stock.preco, 6) },
    { name: "Jul", price: generatePrice(stock.preco, 7) },
  ];

  return (
    <div className="stock-chart">
      <h2>Histórico de Preço</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="name" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip contentStyle={{ backgroundColor: '#333', borderRadius: '8px', padding: '8px', color: '#fff' }} />
          <Line type="monotone" dataKey="price" stroke="#22c55e" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
