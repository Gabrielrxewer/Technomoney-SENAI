// SvgDefs.tsx
import React from "react";

type Area = { x: number; y: number; w: number; h: number };

export const SvgDefs: React.FC<{
  uid: string;
  id: string;
  priceArea: Area;
  rsiArea: Area;
  showRSI: boolean;
}> = ({ uid, priceArea, rsiArea, showRSI }) => {
  return (
    <defs>
      <linearGradient id={`areaGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--chart-stroke)" stopOpacity="0.18" />
        <stop
          offset="100%"
          stopColor="var(--chart-stroke)"
          stopOpacity="0.02"
        />
      </linearGradient>

      <linearGradient id={`lineGrad-${uid}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="var(--chart-stroke)" />
        <stop offset="100%" stopColor="var(--chart-stroke-strong)" />
      </linearGradient>

      <clipPath id={`clip-${uid}`}>
        <rect
          x={priceArea.x}
          y={priceArea.y}
          width={priceArea.w}
          height={priceArea.h}
          rx="2"
          ry="2"
        />
      </clipPath>

      {showRSI && (
        <clipPath id={`clip-rsi-${uid}`}>
          <rect
            x={rsiArea.x}
            y={rsiArea.y}
            width={rsiArea.w}
            height={rsiArea.h}
            rx="2"
            ry="2"
          />
        </clipPath>
      )}

      <filter id={`shadow-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow
          dx="0"
          dy="0.4"
          stdDeviation="0.7"
          floodColor="var(--chart-stroke-strong)"
          floodOpacity="0.35"
        />
        <feDropShadow
          dx="0"
          dy="0"
          stdDeviation="0.6"
          floodColor="var(--chart-stroke)"
          floodOpacity="0.25"
        />
      </filter>
    </defs>
  );
};
