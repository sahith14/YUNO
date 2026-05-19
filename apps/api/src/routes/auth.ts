import type { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import { prisma } from "@yuno/db";
import { signJwt, verifyJwt } from "../jwt.js";
import { redis } from "../redis.js";
import { requireUser } from "../auth.js";
import { RegisterEmailBody, LoginBody, SetGenderBody } from "@yuno/shared";

export const authRoutes: FastifyPluginAsync = async (app) => {
  // ----- POST /auth/guest -----
  app.post("/auth/guest", async (req) => {
    const fingerprint = (req.headers["x-device-fingerprint"] as string) ?? "";
    const fingerprintHash = fingerprint
      ? createHash("sha256").update(fingerprint).digest("hex")
      : null;
    const ipCountry = ((req.headers["cf-ipcountry"] as string) || "").slice(0, 2) || null;

    // Check fingerprint deny-list (banned device)
    if (fingerprintHash) {
      const existingBan = await prisma.ban.findFirst({
        where: {
          deviceFingerprintHash: fingerprintHash,
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
      });
      if (existingBan) {
        return { statusCode: 403, error: { code: "BANNED", message: "device banned" } };
      }
    }

    const user = await prisma.user.create({
      data: {
        deviceFingerprintHash: fingerprintHash,
        ipCountry,
        createdCountry: ipCountry,
        consentAge18: false,
      },
    });
    const { token, expiresAt } = signJwt({
      userId: user.id,
      kind: "guest",
      premium: false,
      verified: false,
    });
    return { userId: user.id, token, expiresAt, kind: "guest" };
  });

  // ----- POST /auth/register -----
  app.post("/auth/register", async (req, reply) => {
    const body = RegisterEmailBody.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: { code: "INVALID_INPUT", message: "email taken" } });

    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const fingerprint = (req.headers["x-device-fingerprint"] as string) ?? "";
    const fingerprintHash = fingerprint ? createHash("sha256").update(fingerprint).digest("hex") : null;

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        emailVerifiedAt: null,
        deviceFingerprintHash: fingerprintHash,
        consentAge18: true, // self-attested at signup
        consentTermsAt: new Date(),
      },
    });
    const { token, expiresAt } = signJwt({
      userId: user.id,
      kind: "user",
      premium: false,
      verified: false,
    });
    return { userId: user.id, token, expiresAt, kind: "user" };
  });

  // ----- POST /auth/login -----
  app.post("/auth/login", async (req, reply) => {
    const body = LoginBody.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) {
      return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "invalid credentials" } });
    }
    const ok = await argon2.verify(user.passwordHash, body.password);
    if (!ok) return reply.code(401).send({ error: { code: "UNAUTHORIZED", message: "invalid credentials" } });

    if (user.banUntil && user.banUntil > new Date()) {
      return reply.code(403).send({
        error: { code: "BANNED", message: "account banned", banUntil: user.banUntil.toISOString() },
      });
    }

    const { token, expiresAt } = signJwt({
      userId: user.id,
      kind: user.isAdmin ? "admin" : "user",
      premium: !!user.premiumUntil && user.premiumUntil > new Date(),
      verified: !!user.verifiedAt,
    });
    return { userId: user.id, token, expiresAt, kind: user.isAdmin ? "admin" : "user" };
  });

  // ----- POST /auth/upgrade-email -----
  app.post("/auth/upgrade-email", async (req, reply) => {
    const claims = requireUser(req);
    if (claims.kind !== "guest") {
      return reply.code(409).send({ error: { code: "INVALID_INPUT", message: "already a user" } });
    }
    const body = RegisterEmailBody.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: { code: "INVALID_INPUT", message: "email taken" } });

    const passwordHash = await argon2.hash(body.password, { type: argon2.argon2id });
    const updated = await prisma.user.update({
      where: { id: claims.sub },
      data: { email: body.email, passwordHash, consentAge18: true, consentTermsAt: new Date() },
    });
    const { token, expiresAt } = signJwt({
      userId: updated.id,
      kind: "user",
      premium: !!updated.premiumUntil && updated.premiumUntil > new Date(),
      verified: !!updated.verifiedAt,
    });
    return { userId: updated.id, token, expiresAt, kind: "user" };
  });

  // ----- POST /auth/logout -----
  app.post("/auth/logout", async (req) => {
    const claims = requireUser(req);
    if (claims.jti) {
      const ttl = Math.max(60, claims.exp - Math.floor(Date.now() / 1000));
      await redis.set(`jwt:deny:${claims.jti}`, "1", "EX", ttl);
    }
    return { ok: true };
  });

  // ----- GET /me -----
  app.get("/me", async (req) => {
    const claims = requireUser(req);
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      include: { interests: { include: { interest: true } } },
    });
    if (!user) return { error: { code: "NOT_FOUND", message: "user gone" } };

    const reputationBucket =
      user.reputationScore >= 1200 ? "good" : user.reputationScore >= 600 ? "neutral" : "low";

    return {
      userId: user.id,
      displayHandle: user.displayHandle,
      kind: user.isAdmin ? "admin" : claims.kind,
      premium: !!user.premiumUntil && user.premiumUntil > new Date(),
      verified: !!user.verifiedAt,
      verifiedLabel: user.verifiedLabel,
      selfGender: user.selfGender,
      reputationBucket,
      interests: user.interests.map((ui) => ui.interest.slug),
      shadowBanned: user.isShadowBanned,
      premiumUntil: user.premiumUntil ? user.premiumUntil.toISOString() : null,
    };
  });

  // ----- PATCH /me/gender -----
  app.patch("/me/gender", async (req, reply) => {
    const claims = requireUser(req);
    const body = SetGenderBody.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: claims.sub },
      data: { selfGender: body.selfGender },
      select: { id: true, selfGender: true },
    });
    return reply.send({ ok: true, selfGender: updated.selfGender });
  });

  // ----- DELETE /me (GDPR) -----
  app.delete("/me", async (req, reply) => {
    const claims = requireUser(req);
    await prisma.user.delete({ where: { id: claims.sub } });
    return reply.code(202).send({ ok: true });
  });

  // ----- POST /auth/refresh (verify token still valid + return current claims info) -----
  app.post("/auth/refresh", async (req) => {
    const claims = requireUser(req);
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) return { error: { code: "NOT_FOUND", message: "gone" } };

    const { token, expiresAt } = signJwt({
      userId: user.id,
      kind: user.isAdmin ? "admin" : claims.kind,
      premium: !!user.premiumUntil && user.premiumUntil > new Date(),
      verified: !!user.verifiedAt,
    });
    return { token, expiresAt };
  });
};
