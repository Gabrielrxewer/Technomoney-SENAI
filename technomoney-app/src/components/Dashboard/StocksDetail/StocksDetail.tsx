import { useLocation } from "react-router-dom";
import { Stock } from "../StocksHome/data";
import StockInfo from "./StockInfo";
import StockChart from "./StockChart";
import "./StocksDetail.css";

const StockDetail = () => {
  const location = useLocation();
  const { stock }: { stock: Stock } = location.state || {};

  if (!stock) {
    return <div className="error">Ação não encontrada</div>;
  }

  return (
    <div className="stock-detail-page">
      <div className="StocksDetailheader">
        <h1>{stock.nome} ({stock.ticker})</h1>
        <p>{stock.setor}</p>
        <p className={stock.variacao >= 0 ? "positive" : "negative"}>
          {stock.variacao >= 0 ? "+" : ""}{stock.variacao.toFixed(2)}%
        </p>
      </div>
      
      <div className="stock-content">
        <StockInfo stock={stock} />
        <StockChart stock={stock} />
      </div>
    </div>
  );
};

export default StockDetail;
