import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StockCard from "../StocksHome/StockCard";
import { Stock } from "../StocksHome/data";
import { stocks } from "../StocksHome/data";
import "./StocksHome.css";

const StocksDetailHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) =>
      stock.nome.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const handleStockClick = (stock: Stock) => {
    navigate("/stock-detail", { state: { stock } });
  };

  return (
    <div className="stocks-home">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por ação"
        className="search-input"
      />
      <div className="stock-list">
        {filteredStocks.map((stock: Stock) => (
          <StockCard 
            key={stock.ticker} 
            item={stock} 
            onAdd={() => handleStockClick(stock)} 
          />
        ))}
      </div>
    </div>
  );
};

export default StocksDetailHome;
