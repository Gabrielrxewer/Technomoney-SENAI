import React from "react";
import "./TickerSelectBar.css";

export type TickerOption = { value: string; label: string };

type Props = {
  options: TickerOption[];
  selected: string;
  onChange: (ticker: string) => void;
  showRSI: boolean;
  onToggleRSI: () => void;
  affixTopLeft?: boolean;
  fullBleed?: boolean;
  emphasizeOnInteract?: boolean;
};

const TickerSelectBar: React.FC<Props> = ({
  options,
  selected,
  onChange,
  showRSI,
  onToggleRSI,
  affixTopLeft = false,
  fullBleed = true,
  emphasizeOnInteract = true,
}) => {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const listboxIdRef = React.useRef<string>(React.useId());
  const [open, setOpen] = React.useState(false);

  const selectedIndex = React.useMemo(
    () =>
      Math.max(
        0,
        options.findIndex((o) => o.value === selected)
      ),
    [options, selected]
  );

  const [activeIndex, setActiveIndex] = React.useState<number>(selectedIndex);

  const typeaheadBuf = React.useRef("");
  const typeaheadTimer = React.useRef<number | null>(null);
  const pushTypeahead = React.useCallback(
    (ch: string) => {
      if (typeaheadTimer.current)
        window.clearTimeout(typeaheadTimer.current as unknown as number);
      typeaheadBuf.current += ch.toLowerCase();
      typeaheadTimer.current = window.setTimeout(() => {
        typeaheadBuf.current = "";
        typeaheadTimer.current = null;
      }, 600) as unknown as number;

      const q = typeaheadBuf.current;
      if (!q) return;
      const start = Math.max(0, activeIndex);
      const rot = options
        .map((o, i) => ({ o, i }))
        .slice(start)
        .concat(options.map((o, i) => ({ o, i })).slice(0, start));
      const found = rot.find(({ o }) => o.label.toLowerCase().startsWith(q));
      if (found) setActiveIndex(found.i);
    },
    [activeIndex, options]
  );

  React.useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedIndex]);

  React.useEffect(() => {
    if (!open) return;
    const onDocDown = (ev: MouseEvent | PointerEvent) => {
      const root = wrapRef.current;
      if (!root) return;
      if (!root.contains(ev.target as Node)) {
        setOpen(false);
        triggerRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("pointerdown", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("pointerdown", onDocDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const lb = listboxRef.current;
    const el = document.getElementById(
      `${listboxIdRef.current}-opt-${activeIndex}`
    );
    if (lb && el) {
      const lbRect = lb.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (elRect.top < lbRect.top) lb.scrollTop -= lbRect.top - elRect.top + 4;
      if (elRect.bottom > lbRect.bottom)
        lb.scrollTop += elRect.bottom - lbRect.bottom + 4;
    }
  }, [open, activeIndex]);

  const affixClass = fullBleed
    ? "affix-top-full"
    : affixTopLeft
      ? "affix-top-left"
      : "edge-x";

  const openMenu = React.useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => {
      listboxRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const closeMenu = React.useCallback(
    (opts?: { focusTrigger?: boolean; blurTrigger?: boolean }) => {
      const { focusTrigger = false, blurTrigger = false } = opts || {};
      setOpen(false);
      if (blurTrigger) {
        triggerRef.current?.blur();
        return;
      }
      if (focusTrigger) {
        triggerRef.current?.focus();
      }
    },
    []
  );

  const commitSelection = React.useCallback(
    (index: number, viaKeyboard = false) => {
      const opt = options[index];
      if (!opt) return;
      onChange(opt.value);
      closeMenu({ focusTrigger: viaKeyboard, blurTrigger: !viaKeyboard });
    },
    [options, onChange, closeMenu]
  );

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Down") {
      e.preventDefault();
      setActiveIndex(Math.min(options.length - 1, selectedIndex + 1));
      openMenu();
    } else if (e.key === "ArrowUp" || e.key === "Up") {
      e.preventDefault();
      setActiveIndex(Math.max(0, selectedIndex - 1));
      openMenu();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      open ? closeMenu({ focusTrigger: true }) : openMenu();
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu({ focusTrigger: true });
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (e.key === "PageDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 5));
      return;
    }
    if (e.key === "PageUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 5));
      return;
    }
    if (e.key === "ArrowDown" || e.key === "Down") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp" || e.key === "Up") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      commitSelection(activeIndex, true);
      return;
    }

    const char = e.key.length === 1 ? e.key : "";
    if (char && /\S/.test(char)) pushTypeahead(char);
  };

  return (
    <div
      className={["control-bar", "tsb-bar", affixClass].join(" ")}
      role="region"
      aria-label="Barra de seleção de ativos"
      data-testid="ticker-select-bar"
    >
      <div
        ref={wrapRef}
        className={["tsb-wrap", "select-enhanced"].join(" ")}
        data-emphasis={emphasizeOnInteract ? "on" : "off"}
        data-open={open ? "true" : "false"}
      >
        <label htmlFor={`${listboxIdRef.current}-trigger`} className="sr-only">
          Selecionar ativo
        </label>

        <button
          id={`${listboxIdRef.current}-trigger`}
          ref={triggerRef}
          type="button"
          className="tsb-select"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxIdRef.current}
          onClick={() => (open ? closeMenu({ blurTrigger: true }) : openMenu())}
          onKeyDown={onTriggerKeyDown}
          title="Selecionar ativo"
        >
          {options[selectedIndex]?.label ?? "Selecionar..."}
        </button>

        <div
          id={listboxIdRef.current}
          ref={listboxRef}
          className="tsb-listbox"
          role="listbox"
          tabIndex={-1}
          aria-hidden={!open}
          aria-activedescendant={`${listboxIdRef.current}-opt-${activeIndex}`}
          onKeyDown={onListKeyDown}
        >
          {open &&
            options.map((opt, idx) => {
              const isSelected = idx === selectedIndex;
              const isActive = idx === activeIndex;
              return (
                <div
                  key={opt.value}
                  id={`${listboxIdRef.current}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    "tsb-option",
                    isSelected ? "is-selected" : "",
                    isActive ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSelection(idx, false)}
                >
                  {opt.label}
                </div>
              );
            })}
        </div>

        <select
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          value={options[selectedIndex]?.value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tsb-actions" role="toolbar" aria-label="Ações rápidas">
        <button
          type="button"
          className="tsb-btn"
          aria-label="Adicionar ativo"
          title="Adicionar ativo"
        >
          +
        </button>
        <button
          type="button"
          className="tsb-btn"
          aria-label="Comprar ativo"
          title="Comprar ativo"
        >
          🛒
        </button>
        <button
          type="button"
          className="tsb-btn rsi"
          aria-pressed={showRSI}
          onClick={onToggleRSI}
          title="Alternar RSI"
        >
          RSI
        </button>
      </div>
    </div>
  );
};

export default TickerSelectBar;
