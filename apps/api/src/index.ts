import "./load-env.js";

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";

import { env } from "./env.js";
import { logger } from "./logger.js";
import { redis } from "./redis.js";
import { registerAuthHook } from "./auth.js";

import { authRoutes } from "./routes/auth.js";
import { iceRoutes } from "./routes/ice.js";
import { interestRoutes } from "./routes/interests.js";
import { reportRoutes } from "./routes/reports.js";
import { billingRoutes } from "./routes/billing.js";
import { verificationRoutes } from "./routes/verification.js";
import { adminRoutes } from "./routes/admin.js";

async function main() {
  const app = Fastify({
    logger,
    trustProxy: true,
    bodyLimit: 4 * 1024 * 1024, // up to 4MB for evidence frames
  });

  // ---- Capture raw body on Stripe webhooks ----
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      try {
        const url = (req as unknown as { url: string }).url;
        if (url.includes("/webhook")) {
          // attach raw for signature verification
          (req as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
        }
        const text = (body as Buffer).toString("utf-8");
        done(null, text.length ? JSON.parse(text) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  await app.register(helmet, {
    contentSecurityPolicy: false, // we set CSP at the edge / web layer
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
  });

  await app.register(cors, {
    origin: env.WEB_URL.split(",").map((s) => s.trim()),
    credentials: true,
  });

  await app.register(sensible);
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    redis,
    keyGenerator: (req) => `${req.ip}:${req.user?.sub ?? "anon"}`,
    skipOnError: true,
  });

  // Auth hook (skips public + internal paths)
  registerAuthHook(app);

  // Health
  app.get("/healthz", async () => {
    const r = await redis.ping().catch(() => "");
    return { ok: r === "PONG", service: "api" };
  });

  // Routes
  await app.register(authRoutes);
  await app.register(iceRoutes);
  await app.register(interestRoutes);
  await app.register(reportRoutes);
  await app.register(billingRoutes);
  await app.register(verificationRoutes);
  await app.register(adminRoutes);

  // Error handler — uniform envelope
  app.setErrorHandler((err, _req, reply) => {
    const status = err.statusCode ?? 500;
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: { code: "INVALID_INPUT", message: err.errors.map((e) => e.message).join("; ") },
      });
    }
    if (status >= 500) logger.error({ err }, "internal error");
    reply.code(status).send({
      error: {
        code: status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 429 ? "RATE_LIMITED" : "INTERNAL",
        message: err.message ?? "error",
      },
    });
  });

  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info({ port: env.PORT }, "api listening");

  const shutdown = async (sig: string) => {
    logger.info({ sig }, "shutting down");
    try {
      await app.close();
      await redis.quit();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "api boot failed");
  process.exit(1);
});
