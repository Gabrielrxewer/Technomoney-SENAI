export type IntrospectionSuccess = {
  active: boolean;
  sub?: string;
  scope?: string | string[];
  username?: string;
  preferred_username?: string;
  jti?: string;
  acr?: string;
  exp?: number;
  cnf?: { jkt?: string };
  [key: string]: unknown;
};
