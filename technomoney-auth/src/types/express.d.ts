import type { TechnomoneyAuthenticatedUser } from "./technomoney-authenticated-user";

declare global {
  namespace Express {
    interface Request {
      user?: TechnomoneyAuthenticatedUser;
    }
  }
}

export {};
