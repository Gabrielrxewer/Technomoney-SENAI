import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import "./StocksHome.css";
import type { AssetSummary } from "../../../types/assets";

type Props = { items: AssetSummary[]; onAdd: (s: AssetSummary) => void };

const cols = [
  { key: "tag", label: "Ticker" },
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
    const getValue = (item: AssetSummary, key: string): string | number => {
      if (key in item) return (item as any)[key];
      if (key in item.fundamentals) return (item.fundamentals as any)[key];
      return "";
    };
    arr.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      if (typeof va === "number" && typeof vb === "number") {
        return asc ? va - vb : vb - va;
      }
      return asc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
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
              <tr key={row.tag}>
                <td>{row.tag}</td>
                <td>{row.nome}</td>
                <td>{row.setor}</td>
                <td>R$ {row.preco.toFixed(2)}</td>
                <td className={row.variacao >= 0 ? "badge-up" : "badge-down"}>
                  {row.variacao >= 0 ? "+" : ""}
                  {row.variacao.toFixed(2)}%
                </td>
                <td>{row.fundamentals.roe.toFixed(1)}%</td>
                <td>{row.fundamentals.dy.toFixed(1)}%</td>
                <td>{row.fundamentals.pl.toFixed(1)}</td>
                <td>{row.fundamentals.score}</td>
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
