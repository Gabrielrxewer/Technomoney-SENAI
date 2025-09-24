import React, { useMemo, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa"; 
import { useNavigate } from "react-router-dom"; 
import "./StocksHome.css";
import { stocks as base, Stock } from "./data";
import StockCard from "./StockCard";
import LeaderboardTable from "./LeaderboardTable";
import MetricPill from "./MetricPill";
import Heatmap from "./Heatmap";

const MAX_FIELD = 100; 

type Props = { onOpenCarteira?: () => void };

const WALLET_ROUTE = "/portfolio";
const STOCK_DETAIL_ROUTE = "/stock-detail"; 

export default function StocksHome({ onOpenCarteira }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) ||
        s.nome.toLowerCase().includes(q) ||
        s.setor.toLowerCase().includes(q)
    );
  }, [query]);

  const topByScore = useMemo(
    () => [...filtered].sort((a, b) => b.score - a.score).slice(0, 6),
    [filtered]
  );

  const topDividend = useMemo(
    () => [...filtered].sort((a, b) => b.dy - a.dy).slice(0, 6),
    [filtered]
  );

  const overview = useMemo(() => {
    const n = filtered.length || 1;
    const avg = (k: keyof (typeof filtered)[number]) =>
      filtered.reduce((acc, s) => acc + (s[k] as unknown as number), 0) / n;
    const setores = Array.from(new Set(filtered.map((s) => s.setor))).length;
    return {
      mediaROE: avg("roe"),
      mediaDY: avg("dy"),
      mediaPL: avg("pl"),
      setores,
    };
  }, [filtered]);

  const goWallet = () => {
    if (onOpenCarteira) onOpenCarteira();
    else navigate(WALLET_ROUTE);
  };

  const handleAdd = (s: Stock) => {
    navigate(WALLET_ROUTE, { state: { add: s } });
  };

  const handleStockClick = (stock: Stock) => {
    navigate(STOCK_DETAIL_ROUTE, { state: { stock } }); 
  };

  return (
    <div className="page">
      <section className="card-header">
        <div className="hero-content">
          <div className="title">Descubra as melhores ações</div>
          <div className="subtitle">
            Seleção com métricas como ROE, DY e P/L para montar e vender
            carteiras com confiança
          </div>
        </div>
        <div className="search">
          <div className="input-container">
            <FaSearch className="search-icon" />
            <input
              className="input"
              placeholder="Buscar por ticker, nome ou setor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={MAX_FIELD}
            />
            {query && (
              <FaTimes className="clear-icon" onClick={() => setQuery("")} />
            )}
          </div>
        </div>
      </section>

      <section className="kpis">
        <MetricPill label="Retorno sobre o Patrimônio Líquido (ROE médio)" value={overview.mediaROE.toFixed(1) + "%"} />
        <MetricPill label="Rendimento do dividendo (DY médio)" value={overview.mediaDY.toFixed(1) + "%"} />
        <MetricPill label="Preço/Lucro (P/L médio)" value={overview.mediaPL.toFixed(1)} />
        <MetricPill label="Quantidade de Setores" value={String(overview.setores)} />
      </section>

      <section className="section">
        <div className="section-line">
          <div className="section-title">Top por Score:</div>
          <div className="section-sub">Ordenado por qualidade</div>
        </div>
        <div className="card p-4">
          <div className="card-grid">
            {topByScore.map((s) => (
              <div
                key={s.ticker}
                onClick={() => handleStockClick(s)}
              >
                <StockCard
                  item={s}
                  onAdd={handleAdd}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-line">
          <div className="section-title">Top Dividendos</div>
          <div className="section-sub">Maior DY</div>
        </div>
        <div className="card p-4">
          <div className="card-grid">
            {topDividend.map((s) => (
              <div
                key={s.ticker}
                onClick={() => handleStockClick(s)} 
              >
                <StockCard
                  item={s}
                  onAdd={handleAdd}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-line">
          <div className="section-title">Mapa do Mercado</div>
        </div>
        <div className="card p-4">
          <div className="heatmap-wrap">
            <Heatmap items={filtered} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-line">
          <div className="section-title">Ranking</div>
        </div>
        <div className="card p-4">
          <div className="table-card">
            <LeaderboardTable items={filtered} onAdd={handleAdd} />
          </div>
        </div>
      </section>
    </div>
  );
}
