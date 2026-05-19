// Fastify hook: authenticates requests via Bearer JWT and attaches
// `request.user`. Skips public routes.

import type { FastifyInstance, FastifyRequest } from "fastify";
import { verifyJwt } from "./jwt.js";
import { redis } from "./redis.js";
import { env } from "./env.js";
import type { JwtClaims } from "@yuno/shared";

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtClaims;
  }
}

const PUBLIC_PATHS = new Set<string>([
  "/healthz",
  "/auth/guest",
  "/auth/login",
  "/auth/register",
  "/billing/webhook",
  "/verification/webhook",
  "/interests",
  "/ice/regions",
]);

const INTERNAL_PREFIX = "/internal/";

// Type for any Fastify instance — looser generics so this hook works whether
// the parent app uses pino's Logger<...> or FastifyBaseLogger.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFastifyInstance = FastifyInstance<any, any, any, any, any>;

export function registerAuthHook(app: AnyFastifyInstance): void {
  app.addHook("onRequest", async (req, reply) => {
    const url = (req.routeOptions?.url ?? req.url).split("?")[0]!;

    if (PUBLIC_PATHS.has(url)) return;

    if (url.startsWith(INTERNAL_PREFIX)) {
      const sec = req.headers["x-internal-secret"];
      if (sec !== env.INTERNAL_SECRET) {
        return reply.code(403).send({ error: { code: "FORBIDDEN", message: "internal" } });
      }
      return;
    }

    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "missing token" } });
    }
    try {
      const claims = verifyJwt(auth.slice("Bearer ".length));
      if (claims.jti) {
        const denied = await redis.get(`jwt:deny:${claims.jti}`);
        if (denied) {
          return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "revoked" } });
        }
      }
      req.user = claims;
    } catch {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "invalid token" } });
    }
  });
}

export function requireUser(req: FastifyRequest): JwtClaims {
  if (!req.user) {
    const err: Error & { statusCode?: number } = new Error("UNAUTHORIZED");
    err.statusCode = 401;
    throw err;
  }
  return req.user;
}

export function requireAdmin(req: FastifyRequest): JwtClaims {
  const u = requireUser(req);
  if (u.kind !== "admin") {
    const err: Error & { statusCode?: number } = new Error("FORBIDDEN");
    err.statusCode = 403;
    throw err;
  }
  return u;
}
