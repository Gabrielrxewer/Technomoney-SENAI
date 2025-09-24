import React, { useMemo, useState } from "react";
import { Stock } from "./data";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons"; 
import "./StocksHome.css";

type Props = { items: Stock[]; onAdd: (s: Stock) => void };

const cols = [
  { key: "ticker", label: "Ticker" },
  { key: "nome", label: "Nome" },
  { key: "setor", label: "Setor" },
  { key: "preco", label: "Preço" },
  { key: "variacao", label: "Var%" },
  { key: "roe", label: "ROE" },
  { key: "dy", label: "DY" },
  { key: "pl", label: "P/L" },
  { key: "score", label: "Score" },
];

export default function LeaderboardTable({ items, onAdd }: Props) {
  const [sortKey, setSortKey] = useState<string>("score");
  const [asc, setAsc] = useState<boolean>(false);

  const data = useMemo(() => {
    const arr = [...items];
    arr.sort((a: any, b: any) => {
      const ka = a[sortKey];
      const kb = b[sortKey];
      if (ka < kb) return asc ? -1 : 1;
      if (ka > kb) return asc ? 1 : -1;
      return 0;
    });
    return arr.slice(0, 15);
  }, [items, sortKey, asc]);

  return (
    <div className="card table-card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => {
                    if (sortKey === c.key) setAsc(!asc);
                    else {
                      setSortKey(c.key);
                      setAsc(false);
                    }
                  }}
                >
                  {c.label}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.ticker}>
                <td>{row.ticker}</td>
                <td>{row.nome}</td>
                <td>{row.setor}</td>
                <td>R$ {row.preco.toFixed(2)}</td>
                <td className={row.variacao >= 0 ? "badge-up" : "badge-down"}>
                  {row.variacao >= 0 ? "+" : ""}
                  {row.variacao.toFixed(2)}%
                </td>
                <td>{row.roe.toFixed(1)}%</td>
                <td>{row.dy.toFixed(1)}%</td>
                <td>{row.pl.toFixed(1)}</td>
                <td>{row.score}</td>
                <td>
                  <Link
                    to="/portfolio"
                    className="icon-cart"
                    aria-label="Ver minha carteira"
                    title="Minha Carteira"
                  >
                    <FontAwesomeIcon icon={faCartShopping} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
