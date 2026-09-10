import type { AccessTokenPayload } from "#shared/utils/tokens.js";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
