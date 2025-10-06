import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import "./PriceChart.css";
import { SvgChart } from "./SvgChart";

export type Props = {
  id: string;
  nome: string;
  data: readonly number[];
  showRSI?: boolean;
  height?: number | string;
  decimals?: number;
  rsiPeriod?: number;
  className?: string;
  loading?: boolean;
  locale?: string;
  onHoverIndexChange?: (index: number, value: number) => void;
  rsiLevels?: { upper?: number; lower?: number };
  fullWidth?: boolean;
  minLoadingMs?: number;
};

const useNumberFmt = (locale: string, decimals: number) =>
  useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [locale, decimals]
  );

const useCurrencyFmt = (locale: string, currency: string, decimals: number) =>
  useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [locale, currency, decimals]
  );

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
};

const PriceChartHeader: React.FC<{
  id: string;
  nome: string;
  hasSeries: boolean;
  last: number;
  prev: number;
  fmtCurrency: Intl.NumberFormat;
  fmtPct: Intl.NumberFormat;
}> = ({ id, nome, hasSeries, last, prev, fmtCurrency, fmtPct }) => {
  const change = last - prev;
  const changePct = prev === 0 ? 0 : (change / prev) * 100;
  return (
    <header className="chart-header">
      <div className="asset-heading">
        <span className="asset-name" title={nome}>
          {nome}
        </span>
        <span className="asset-ticker" aria-label={`Ticker ${id}`}>
          {id}
        </span>
      </div>
      {hasSeries && (
        <div
          className={`asset-change ${change >= 0 ? "up" : "down"}`}
          aria-live="polite"
        >
          <span className="price-last">{fmtCurrency.format(last)}</span>
          <span className="price-delta">
            {change >= 0 ? "▲" : "▼"} {fmtCurrency.format(change)} (
            {fmtPct.format(changePct)}%)
          </span>
        </div>
      )}
    </header>
  );
};

const PriceChart: React.FC<Props> = ({
  id,
  nome,
  data,
  showRSI = false,
  height = 260,
  decimals = 2,
  rsiPeriod = 14,
  className,
  loading = false,
  locale = "pt-BR",
  onHoverIndexChange,
  rsiLevels,
  fullWidth = true,
  minLoadingMs = 180,
}) => {
  const hasSeries = data.length >= 2;
  const last = data[data.length - 1] ?? 0;
  const prev = data[data.length - 2] ?? last;

  const fmtPct = useNumberFmt(locale, 2);
  const fmtCurrency = useCurrencyFmt(locale, "BRL", decimals);

  const [showLoading, setShowLoading] = useState<boolean>(loading);
  const startedAt = useRef<number | null>(loading ? Date.now() : null);
  const hideTimer = useRef<number | null>(null);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (loading) {
      if (!showLoading) setShowLoading(true);
      if (startedAt.current == null) startedAt.current = Date.now();
      if (hideTimer.current)
        window.clearTimeout(hideTimer.current as unknown as number);
      hideTimer.current = null;
      return;
    }
    const since = startedAt.current ?? Date.now();
    const elapsed = Date.now() - since;
    const remain = Math.max(0, minLoadingMs - elapsed);
    if (remain === 0 || prefersReduced) {
      setShowLoading(false);
      startedAt.current = null;
    } else {
      hideTimer.current = window.setTimeout(() => {
        setShowLoading(false);
        startedAt.current = null;
        hideTimer.current = null;
      }, remain) as unknown as number;
    }
    return () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current as unknown as number);
        hideTimer.current = null;
      }
    };
  }, [loading, minLoadingMs, showLoading, prefersReduced]);

  const containerStyle: React.CSSProperties = fullWidth
    ? typeof height === "number"
      ? { minHeight: `${height}px`, height: "auto" }
      : { minHeight: height, height: "auto" }
    : typeof height === "number"
      ? { height: `${height}px` }
      : { height };

  const svgKey = `${id}-${data.length}-${data[data.length - 1] ?? "x"}`;

  return (
    <section
      className={`price-chart chart-container ${className ?? ""} ${showLoading ? "is-loading" : ""} ${fullWidth ? "allow-bleed" : ""}`}
      aria-label={`Gráfico do ativo ${nome}`}
      aria-busy={showLoading ? "true" : "false"}
      style={containerStyle}
      data-chart-id={id}
    >
      <PriceChartHeader
        id={id}
        nome={nome}
        hasSeries={hasSeries}
        last={last}
        prev={prev}
        fmtCurrency={fmtCurrency}
        fmtPct={fmtPct}
      />

      <div className={`chart-svg-wrapper ${fullWidth ? "full-bleed" : ""}`}>
        <div className="chart-loading-overlay" aria-hidden="true">
          {!prefersReduced && <div className="chart-skeleton" />}
        </div>

        {hasSeries ? (
          <SvgChart
            key={svgKey}
            id={id}
            nome={nome}
            data={data}
            showRSI={showRSI}
            decimals={decimals}
            rsiPeriod={rsiPeriod}
            locale={locale}
            onHoverIndexChange={onHoverIndexChange}
            rsiLevels={rsiLevels}
            visible={!showLoading}
          />
        ) : (
          !showLoading && (
            <div className="chart-empty" role="status" aria-live="polite">
              Sem dados suficientes para exibir o gráfico.
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default memo(PriceChart);
