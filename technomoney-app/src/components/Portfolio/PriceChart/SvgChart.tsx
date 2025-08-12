// SvgChart.tsx
import React, { useMemo, useId, useCallback, memo } from "react";
import { SvgDefs } from "./SvgDefs";

type Props = {
  id: string;
  nome: string;
  data: readonly number[];
  showRSI?: boolean;
  decimals?: number;
  rsiPeriod?: number;
  locale?: string;
  onHoverIndexChange?: (index: number, value: number) => void;
  rsiLevels?: { upper?: number; lower?: number };
  visible?: boolean;
};

type Area = { x: number; y: number; w: number; h: number };
const vb = { w: 100, h: 56.25 } as const; // 16:9

const useNumberFmt = (locale: string, decimals: number) =>
  useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [locale, decimals]
  );

const getMinMax = (arr: readonly number[]) => {
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === Infinity) min = 0;
  if (max === -Infinity) max = 0;
  return { min, max };
};

export const SvgChart: React.FC<Props> = memo(
  ({
    id,
    nome,
    data,
    showRSI = false,
    decimals = 2,
    rsiPeriod = 14,
    locale = "pt-BR",
    rsiLevels,
    visible = true,
  }) => {
    const uid = useId();
    const n = data.length;
    const hasSeries = n >= 2;

    const fmt = useNumberFmt(locale, decimals);

    const AXIS_W = 4.2,
      TICK_LEN = 1.1,
      LABEL_PAD = 0.6;
    const margin = { top: 6, right: 2, bottom: 10, left: 8 };
    const inner: Area = {
      x: margin.left,
      y: margin.top,
      w: vb.w - margin.left - margin.right,
      h: vb.h - margin.top - margin.bottom,
    };

    const rsiSplit = showRSI ? 0.72 : 1;
    const priceArea: Area = {
      x: inner.x + AXIS_W,
      y: inner.y,
      w: inner.w - AXIS_W,
      h: inner.h * rsiSplit,
    };
    const rsiArea: Area = {
      x: priceArea.x,
      y: inner.y + priceArea.h + (showRSI ? 3 : 0),
      w: priceArea.w,
      h: inner.h * (1 - rsiSplit) - (showRSI ? 3 : 0),
    };

    const { minVal, span } = useMemo(() => {
      if (!hasSeries) return { minVal: 0, span: 1 };
      const { min, max } = getMinMax(data);
      const pad = (max - min) * 0.06 || 1;
      return { minVal: min - pad, span: Math.max(1e-6, max - min + 2 * pad) };
    }, [data, hasSeries]);

    const xAt = useCallback(
      (i: number) => priceArea.x + (i / Math.max(1, n - 1)) * priceArea.w,
      [priceArea.x, priceArea.w, n]
    );
    const yAt = useCallback(
      (v: number) => priceArea.y + (1 - (v - minVal) / span) * priceArea.h,
      [priceArea.y, priceArea.h, minVal, span]
    );

    const points = useMemo(
      () => (hasSeries ? data.map((v, i) => [xAt(i), yAt(v)] as const) : []),
      [data, hasSeries, xAt, yAt]
    );

    const pricePath = useMemo(() => {
      if (!points.length) return "";
      let out = "M " + points[0][0] + "," + points[0][1];
      for (let i = 1; i < points.length; i++)
        out += " L " + points[i][0] + "," + points[i][1];
      return out;
    }, [points]);

    const areaPath = useMemo(() => {
      if (!points.length) return "";
      const [x0] = points[0];
      const [xn] = points[points.length - 1];
      const yBase = priceArea.y + priceArea.h;
      return `M ${x0},${yBase} L ${points.map(([x, y]) => `${x},${y}`).join(" ")} L ${xn},${yBase} Z`;
    }, [points, priceArea.h, priceArea.y]);

    const yTicksP = [0, 0.25, 0.5, 0.75, 1];
    const yTickYs = yTicksP.map((p) => priceArea.y + p * priceArea.h);
    const yTickValues = yTicksP.map((p) => minVal + (1 - p) * span);

    /* RSI */
    const rsiSeries = useMemo(() => {
      if (!showRSI || n < rsiPeriod + 1) return [] as number[];
      const gains: number[] = [],
        losses: number[] = [];
      for (let i = 1; i < n; i++) {
        const d = data[i] - data[i - 1];
        gains.push(d > 0 ? d : 0);
        losses.push(d < 0 ? -d : 0);
      }
      let avgGain = 0,
        avgLoss = 0;
      for (let i = 0; i < rsiPeriod; i++) {
        avgGain += gains[i];
        avgLoss += losses[i];
      }
      avgGain /= rsiPeriod;
      avgLoss /= rsiPeriod;

      const out: number[] = new Array(n).fill(NaN);
      out[rsiPeriod] = 100 - 100 / (1 + avgGain / Math.max(1e-6, avgLoss));
      for (let i = rsiPeriod + 1; i < n; i++) {
        avgGain = (avgGain * (rsiPeriod - 1) + gains[i - 1]) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) + losses[i - 1]) / rsiPeriod;
        out[i] = 100 - 100 / (1 + avgGain / Math.max(1e-6, avgLoss));
      }
      let firstValid = rsiPeriod;
      while (firstValid < out.length && Number.isNaN(out[firstValid]))
        firstValid++;
      return out.slice(firstValid);
    }, [data, n, rsiPeriod, showRSI]);

    const rsiXAt = useCallback(
      (i: number) => rsiArea.x + (i / Math.max(1, n - 1)) * rsiArea.w,
      [rsiArea.x, rsiArea.w, n]
    );
    const rsiYAt = useCallback(
      (v: number) => rsiArea.y + (1 - v / 100) * rsiArea.h,
      [rsiArea.y, rsiArea.h]
    );

    const rsiPath = useMemo(() => {
      if (!showRSI || rsiSeries.length === 0) return "";
      const start = n - rsiSeries.length;
      let cmds = "";
      for (let k = 0; k < rsiSeries.length; k++) {
        const i = start + k;
        const x = rsiXAt(i);
        const y = rsiYAt(rsiSeries[k]);
        cmds += (k === 0 ? "M " : " L ") + x + "," + y;
      }
      return cmds;
    }, [n, showRSI, rsiSeries, rsiXAt, rsiYAt]);

    const priceGridYs = [0.25, 0.5, 0.75, 1].map(
      (p) => priceArea.y + p * priceArea.h
    );
    const rsiGridYs = showRSI
      ? [0.3, 0.7].map((p) => rsiArea.y + p * rsiArea.h)
      : [];
    const upper = rsiLevels?.upper ?? 70;
    const lower = rsiLevels?.lower ?? 30;

    const lastPt = points.length ? points[points.length - 1] : null;

    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Série histórica de ${nome} com ${n} pontos.`}
        tabIndex={0}
      >
        <title>{`Preço de ${nome}`}</title>
        <desc>{`Gráfico com ${n} pontos, eixo Y compacto e destaque no último ponto.`}</desc>

        <SvgDefs
          uid={uid}
          id={id}
          priceArea={priceArea}
          rsiArea={rsiArea}
          showRSI={showRSI}
        />

        {priceGridYs.map((y, k) => (
          <line
            key={`g-price-${k}`}
            x1={priceArea.x}
            y1={y}
            x2={priceArea.x + priceArea.w}
            y2={y}
            className="chart-grid-line"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <g
          clipPath={`url(#clip-${uid})`}
          className={`chart-series ${visible ? "is-visible" : ""}`}
        >
          <path
            d={areaPath}
            className="chart-area"
            fill={`url(#areaGrad-${uid})`}
          />
          <path
            d={pricePath}
            className="chart-price"
            stroke={`url(#lineGrad-${uid})`}
            vectorEffect="non-scaling-stroke"
            filter={`url(#shadow-${uid})`}
          />
          {lastPt && (
            <>
              <circle
                className="chart-last-dot-pulse"
                cx={lastPt[0]}
                cy={lastPt[1]}
                r={3.6}
              />
              <circle
                className="chart-last-dot"
                cx={lastPt[0]}
                cy={lastPt[1]}
                r={1.7}
              />
            </>
          )}
        </g>

        {yTickYs.map((y, k) => (
          <g key={`yaxis-${k}`}>
            <line
              x1={priceArea.x}
              y1={y}
              x2={priceArea.x - TICK_LEN}
              y2={y}
              className="chart-axis-tick"
              vectorEffect="non-scaling-stroke"
            />
            <text
              className="chart-axis-label"
              x={priceArea.x - TICK_LEN - LABEL_PAD}
              y={y}
              dominantBaseline="middle"
              textAnchor="end"
            >
              {fmt.format(yTickValues[k])}
            </text>
          </g>
        ))}

        {showRSI && (
          <>
            {rsiGridYs.map((y, k) => (
              <line
                key={`g-rsi-${k}`}
                x1={rsiArea.x}
                y1={y}
                x2={rsiArea.x + rsiArea.w}
                y2={y}
                className="chart-rsi-level"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <text
              className="chart-rsi-label"
              x={rsiArea.x + 2}
              y={rsiYAt(upper) - 1}
              aria-hidden="true"
            >
              {upper}
            </text>
            <text
              className="chart-rsi-label"
              x={rsiArea.x + 2}
              y={rsiYAt(lower) - 1}
              aria-hidden="true"
            >
              {lower}
            </text>
            <g clipPath={`url(#clip-rsi-${uid})`}>
              <path
                d={rsiPath}
                className="chart-rsi"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            <text
              className="chart-rsi-title"
              x={rsiArea.x}
              y={rsiArea.y - 1}
              aria-hidden="true"
            >
              RSI ({rsiPeriod})
            </text>
          </>
        )}
      </svg>
    );
  }
);
