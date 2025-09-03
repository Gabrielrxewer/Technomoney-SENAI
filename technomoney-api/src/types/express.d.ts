declare namespace Express {
  interface Request {
    user?: {
      id: string;
      jti: string;
      scope: string;
      payload: Record<string, unknown>;
    };
  }
}
