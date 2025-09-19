export type TechnomoneyAuthenticatedUser = {
  id: string;
  jti: string;
  scope: string[];
  payload?: Record<string, unknown>;
  acr?: string;
  username?: string;
  exp?: number;
  token?: string;
  amr?: string[];
  email?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: TechnomoneyAuthenticatedUser;
    }
  }
}

export {};
