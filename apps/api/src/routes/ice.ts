import type { FastifyPluginAsync } from "fastify";
import { buildTurnCredentials, IceCredentialsBody } from "@yuno/shared";
import { env } from "../env.js";
import { requireUser } from "../auth.js";

export const iceRoutes: FastifyPluginAsync = async (app) => {
  // ----- POST /ice/credentials -----
  app.post("/ice/credentials", async (req) => {
    const claims = requireUser(req);
    IceCredentialsBody.parse(req.body ?? {});

    const result = await buildTurnCredentials({
      host: env.TURN_HOST,
      port: env.TURN_PORT,
      tlsPort: env.TURN_TLS_PORT,
      realm: env.TURN_REALM,
      sharedSecret: env.TURN_SHARED_SECRET,
      userId: claims.sub,
      ttlSeconds: env.TURN_CRED_TTL,
      stunUrls: env.PUBLIC_STUN_URLS,
    });
    return { iceServers: result.servers, ttlSeconds: result.ttlSeconds };
  });

  // ----- GET /ice/regions (public) -----
  app.get("/ice/regions", async () => {
    return {
      regions: [
        { code: "us-east", host: env.TURN_HOST },
        // In production this list grows with the Coturn fleet.
      ],
    };
  });

  // ----- POST /internal/ice/mint (called by signaling) -----
  app.post("/internal/ice/mint", async (req) => {
    const body = req.body as { userId: string; regionHint?: string };
    if (!body?.userId) return { error: { code: "INVALID_INPUT", message: "userId required" } };
    const result = await buildTurnCredentials({
      host: env.TURN_HOST,
      port: env.TURN_PORT,
      tlsPort: env.TURN_TLS_PORT,
      realm: env.TURN_REALM,
      sharedSecret: env.TURN_SHARED_SECRET,
      userId: body.userId,
      ttlSeconds: env.TURN_CRED_TTL,
      stunUrls: env.PUBLIC_STUN_URLS,
    });
    return { iceServers: result.servers, ttlSeconds: result.ttlSeconds };
  });
};
