import type { SessionUser } from "../types/auth";

declare global {
  namespace Express {
    interface Request {
      staff?: SessionUser;
    }
  }
}

export {};
