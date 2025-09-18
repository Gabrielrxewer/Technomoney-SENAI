export interface AuthResponse {
  token: string;
  username: string | null;
}

export interface StepUpRequirement {
  type: "totp";
  acr?: string | null;
  source?: "login" | "register" | "websocket" | string;
}

export interface LoginVars {
  email: string;
  password: string;
  captchaToken: string;
}

export interface RegisterVars {
  username: string;
  email: string;
  password: string;
  captchaToken: string;
}

export type AuthEvent =
  | { type: "hello"; sid: string; user_id: string }
  | { type: "token.expiring_soon"; exp: number }
  | { type: "session.refreshed"; exp?: number }
  | { type: "session.revoked"; reason: string }
  | { type: "session.compromised" }
  | { type: "stepup.required"; acr: string }
  | { type: "jwks.rotated"; kid: string };

export interface MeResponse {
  id: string;
  username: string;
  exp: number;
}

export interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (token: string, username: string | null) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  fetchWithAuth: (input: string, config?: any) => Promise<any>;
  connected: boolean;
  lastEvent: AuthEvent | null;
  connectEvents: (currentToken?: string) => Promise<void>;
  webauthnRegister: () => Promise<boolean>;
  webauthnAuthenticate: () => Promise<boolean>;
  stepUpRequirement: StepUpRequirement | null;
  setStepUpRequirement?: (value: StepUpRequirement | null) => void;
}
