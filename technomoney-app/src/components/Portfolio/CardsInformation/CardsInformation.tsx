import React, { useEffect, useMemo, useRef, useState } from "react";
import "./CardsInformation.css";
import { analyzeAsset } from "../../../services/ai";
import type { AssetDetail } from "../../../types/assets";
import type { TrendLabel } from "../../../types/ai";
type Facts = {
  setor: string;
  industria: string;
  sede: string;
  fundacao: number | string;
  empregados: string;
};

type Props = {
  recomendacao: string;
  analise: string;
  bio: string;
  facts: Facts;
  noticias: string[];
  asset?: AssetDetail | null;
};

type ActiveModal = "reco" | "sobre" | "news" | null;

const CardsInformation: React.FC<Props> = ({
  recomendacao,
  analise,
  bio,
  facts,
  noticias,
  asset,
}) => {
  const [active, setActive] = useState<ActiveModal>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const [iaResult, setIaResult] = useState<{ tendencia: TrendLabel | string; analise: string } | null>(
    null
  );
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);

  useEffect(() => {
    setIaResult({ tendencia: recomendacao, analise });
  }, [recomendacao, analise]);

  useEffect(() => {
    if (!asset) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchAnalysis = async () => {
      try {
        setIaLoading(true);
        setIaError(null);
        const response = await analyzeAsset(
          {
            asset,
            facts,
            context: {
              analiseTexto: analise,
              recomendacaoAnterior: recomendacao,
            },
          },
          controller.signal
        );
        if (!cancelled) {
          setIaResult({ tendencia: response.tendencia, analise: response.analise });
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setIaError("Não foi possível atualizar a tendência inteligente no momento.");
        }
      } finally {
        if (!cancelled) {
          setIaLoading(false);
        }
      }
    };

    fetchAnalysis();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    asset?.id,
    asset?.analise,
    asset?.fundamentals?.score,
    asset?.recomendacao,
    facts.setor,
    facts.industria,
    facts.sede,
    facts.fundacao,
    facts.empregados,
    analise,
    recomendacao,
  ]);

  const tendenciaAtual = iaResult?.tendencia ?? recomendacao;
  const analiseAtual = iaResult?.analise ?? analise;

  const recoClass = useMemo(() => {
    return tendenciaAtual === "Comprar"
      ? "ci-up"
      : tendenciaAtual === "Manter"
        ? "ci-neutral"
        : "ci-down";
  }, [tendenciaAtual]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (!active && lastTriggerRef.current) {
      lastTriggerRef.current.focus();
    }
  }, [active]);

  const openModal =
    (which: ActiveModal) =>
    (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
      if ("key" in e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
      }
      lastTriggerRef.current = e.currentTarget as HTMLElement;
      setActive(which);
    };

  const factsPreview = [
    { label: "Setor", value: facts.setor },
    { label: "Sede", value: facts.sede },
  ];
  const newsPreview = noticias.slice(0, 3);

  return (
    <section className="ci-bottom" aria-label="Seção inferior de informações">
      <div className="ci-grid" role="grid" aria-label="Cards informativos">
        {/* Recomendação */}
        <article
          className="ci-card ci-card--reco"
          role="button"
          aria-labelledby="ci-card-reco-title"
          aria-expanded={active === "reco"}
          tabIndex={0}
          onClick={openModal("reco")}
          onKeyDown={openModal("reco")}
        >
          <h2 id="ci-card-reco-title" className="ci-title">
            Tendência
          </h2>
          <p
            className={`ci-badge ${recoClass}`}
            aria-live="polite"
            role="status"
          >
            {tendenciaAtual}
          </p>
          <p className="ci-desc ci-desc--compact" aria-live="polite">
            {iaLoading
              ? "Gerando tendência com IA..."
              : analiseAtual}
          </p>
          {iaError && (
            <p className="ci-desc ci-desc--warning" role="status">
              {iaError}
            </p>
          )}
        </article>

        {/* Sobre */}
        <article
          className="ci-card"
          role="button"
          aria-labelledby="ci-card-sobre-title"
          aria-expanded={active === "sobre"}
          tabIndex={0}
          onClick={openModal("sobre")}
          onKeyDown={openModal("sobre")}
        >
          <h2 id="ci-card-sobre-title" className="ci-title">
            Sobre a empresa
          </h2>
          <p className="ci-desc ci-desc--compact">{bio}</p>
          <ul className="ci-facts" aria-label="Fatos rápidos">
            {factsPreview.map((f) => (
              <li key={f.label}>
                <span>{f.label}</span>
                <strong>{f.value}</strong>
              </li>
            ))}
          </ul>
        </article>

        {/* Notícias */}
        <article
          className="ci-card"
          role="button"
          aria-labelledby="ci-card-news-title"
          aria-expanded={active === "news"}
          tabIndex={0}
          onClick={openModal("news")}
          onKeyDown={openModal("news")}
        >
          <h2 id="ci-card-news-title" className="ci-title">
            Notícias
          </h2>
          {newsPreview.length === 0 ? (
            <p className="ci-desc">Sem notícias recentes.</p>
          ) : (
            <ul
              className="ci-news ci-news--compact"
              aria-label="Lista de notícias"
            >
              {newsPreview.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </article>
      </div>

      {/* MODAL */}
      {active && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ci-modal-title"
          onClick={() => setActive(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal__close"
              onClick={() => setActive(null)}
              aria-label="Fechar"
            >
              ×
            </button>

            {active === "reco" && (
              <>
                <h2 id="ci-modal-title" className="modal__title">
                  Tendência
                </h2>
                <p
                  className={`ci-modal-badge ${recoClass}`}
                  style={{ marginBottom: 10 }}
                >
                  {tendenciaAtual}
                </p>
                <p className="modal__body">{iaLoading ? "Gerando tendência com IA..." : analiseAtual}</p>
                {iaError && <p className="modal__body modal__body--warning">{iaError}</p>}
              </>
            )}

            {active === "sobre" && (
              <>
                <h2 id="ci-modal-title" className="modal__title">
                  Sobre a empresa
                </h2>
                <p className="modal__body" style={{ marginBottom: 14 }}>
                  {bio}
                </p>
                <ul className="modal__list">
                  <li>
                    <strong>Setor:</strong> {facts.setor}
                  </li>
                  <li>
                    <strong>Indústria:</strong> {facts.industria}
                  </li>
                  <li>
                    <strong>Sede:</strong> {facts.sede}
                  </li>
                  <li>
                    <strong>Fundação:</strong> {facts.fundacao}
                  </li>
                  <li>
                    <strong>Empregados:</strong> {facts.empregados}
                  </li>
                </ul>
              </>
            )}

            {active === "news" && (
              <>
                <h2 id="ci-modal-title" className="modal__title">
                  Notícias
                </h2>
                {noticias.length === 0 ? (
                  <p className="modal__body">Sem notícias recentes.</p>
                ) : (
                  <ul className="modal__list">
                    {noticias.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CardsInformation;
