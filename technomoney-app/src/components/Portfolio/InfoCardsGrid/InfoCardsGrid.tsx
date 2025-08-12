import React from "react";
import "./InfoCardsGrid.css";

export interface InfoCardItem {
  title: string;
  value: string;
  detail?: string;
}

type InfoCardsGridProps = {
  items: InfoCardItem[];
  className?: string;
};

const toId = (txt: string) =>
  txt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const InfoCardsGrid: React.FC<InfoCardsGridProps> = ({ items, className }) => {
  const rootClass = ["icg-grid", className].filter(Boolean).join(" ");

  return (
    <section className="icg-container" aria-label="Painel de informações">
      <div className={rootClass} role="grid" aria-label="Informações resumidas">
        {items.map(({ title, value, detail }) => {
          const baseId = toId(title);
          const titleId = `${baseId}-label`;
          const detailId = detail ? `${baseId}-detail` : undefined;

          return (
            <article
              key={titleId}
              className="icg-card"
              role="group"
              aria-labelledby={titleId}
              aria-describedby={detail ? detailId : undefined}
              tabIndex={0}
            >
              <header id={titleId} className="icg-title ss-label">
                {title}
              </header>
              <div
                className="icg-value ss-value"
                data-testid={`value-${baseId}`}
              >
                {value}
              </div>
              {detail && (
                <p id={detailId} className="icg-detail">
                  {detail}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default React.memo(InfoCardsGrid);
