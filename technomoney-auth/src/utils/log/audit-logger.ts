import { getLogger } from "./logger";
import { getLogContext } from "./logging-context";

export const audit = (bindings?: Record<string, unknown>) =>
  getLogger({ channel: "audit", ...getLogContext(), ...(bindings || {}) });
