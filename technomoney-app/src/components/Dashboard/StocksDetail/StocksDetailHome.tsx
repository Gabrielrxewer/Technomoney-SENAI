import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StockCard from "../StocksHome/StockCard";
import Spinner from "../../Spinner/Spinner";
import { fetchAssetSummaries } from "../../../services/assets";
import type { AssetSummary } from "../../../types/assets";
import "../StocksHome/StocksHome.css";

const MAX_FIELD = 100;

const StocksDetailHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, refetch } = useQuery<AssetSummary[]>({
    queryKey: ["assets", "detail-home"],
    queryFn: fetchAssetSummaries,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const filteredStocks = useMemo(() => {
    const base = data ?? [];
    if (!query.trim()) return base;
    const term = query.toLowerCase();
    return base.filter(
      (stock) =>
        stock.nome.toLowerCase().includes(term) ||
        stock.tag.toLowerCase().includes(term) ||
        stock.setor.toLowerCase().includes(term)
    );
  }, [data, query]);

  const handleStockClick = (stock: AssetSummary) => {
    navigate(`/stock-detail/${encodeURIComponent(stock.tag)}`, {
      state: { stock },
    });
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="loading-screen" role="alert">
        <div>Não foi possível carregar as ações.</div>
        <button type="button" className="retry-button" onClick={() => refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="stocks-home">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value.slice(0, MAX_FIELD))}
        placeholder="Buscar por ticker, nome ou setor"
        className="search-input"
      />
      <div className="stock-list">
        {filteredStocks.map((stock) => (
          <div key={stock.tag} onClick={() => handleStockClick(stock)}>
            <StockCard item={stock} onAdd={() => handleStockClick(stock)} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StocksDetailHome;
