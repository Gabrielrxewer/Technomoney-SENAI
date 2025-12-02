import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Spinner from "../Spinner/Spinner";
import { fetchMonthlyAccessReport } from "../../services/reports";
import type { MonthlyAccessReport } from "../../types/reports";
import "./AccessReport.css";

const now = new Date();
const defaultMonth = now.toISOString().slice(0, 7);

function formatMonthLabel(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) return "Mês atual";
  const [year, month] = value.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function formatDay(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export default function AccessReport() {
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const enabled = /^\d{4}-\d{2}$/.test(selectedMonth);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<MonthlyAccessReport>({
    queryKey: ["monthly-access-report", selectedMonth],
    queryFn: () => fetchMonthlyAccessReport(selectedMonth),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    keepPreviousData: true,
  });

  const totals = useMemo(
    () => data?.totals ?? { created: 0, revoked: 0 },
    [data?.totals]
  );

  return (
    <div className="access-report">
      <div className="access-report__header">
        <div>
          <p className="access-report__eyebrow">Segurança</p>
          <h1>Relatório mensal de acessos</h1>
          <p className="access-report__subtitle">
            Acompanhe o volume de sessões iniciadas e revogadas no mês selecionado. Os
            números são calculados a partir da tabela de sessões do serviço de autenticação.
          </p>
        </div>
        <label className="access-report__month-picker">
          <span>Mês de referência</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Selecione o mês do relatório"
          />
        </label>
      </div>

      {isLoading || !enabled ? (
        <div className="access-report__loading" role="status">
          <Spinner />
          <p>Montando o relatório...</p>
        </div>
      ) : isError ? (
        <div className="access-report__error" role="alert">
          <p>Não foi possível carregar o relatório agora.</p>
          <button type="button" className="btn btn-primary" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="access-report__summary">
            <div className="access-report__card">
              <p className="access-report__card-label">Mês</p>
              <strong className="access-report__card-value">{formatMonthLabel(selectedMonth)}</strong>
            </div>
            <div className="access-report__card">
              <p className="access-report__card-label">Sessões criadas</p>
              <strong className="access-report__card-value">
                {totals.created.toLocaleString("pt-BR")}
              </strong>
              <p className="access-report__card-help">Somas de todas as sessões geradas no mês.</p>
            </div>
            <div className="access-report__card">
              <p className="access-report__card-label">Sessões revogadas</p>
              <strong className="access-report__card-value">
                {totals.revoked.toLocaleString("pt-BR")}
              </strong>
              <p className="access-report__card-help">
                Inclui expirações e revogações realizadas pelo usuário ou pelo sistema.
              </p>
            </div>
            <div className="access-report__card access-report__card--info">
              <p className="access-report__card-label">Janela analisada</p>
              <p className="access-report__card-value access-report__card-value--muted">
                {data?.period.start && new Date(data.period.start).toLocaleDateString("pt-BR")}
                {" "}
                até
                {" "}
                {data?.period.endExclusive &&
                  new Date(new Date(data.period.endExclusive).getTime() - 1000)
                    .toLocaleDateString("pt-BR")}
              </p>
              {isFetching && <span className="access-report__chip">Atualizando…</span>}
            </div>
          </div>

          <div className="access-report__table">
            <div className="access-report__table-header">
              <h2>Evolução diária</h2>
              <p>Resumo consolidado por dia dentro do mês escolhido.</p>
            </div>
            <div className="access-report__table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>Novas sessões</th>
                    <th>Revogações</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.daily.map((entry) => (
                    <tr key={entry.day}>
                      <td>{formatDay(entry.day)}</td>
                      <td>{entry.created.toLocaleString("pt-BR")}</td>
                      <td className="access-report__revoked">{entry.revoked.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.daily.every((d) => d.created === 0 && d.revoked === 0) && (
              <p className="access-report__empty">Nenhum acesso registrado para este mês.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
