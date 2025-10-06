import type { TechnomoneyAuthenticatedUser } from "@technomoney/types/express";

declare global {
  namespace Express {
    interface Request {
      user?: TechnomoneyAuthenticatedUser;
    }
  }
}

export {};
