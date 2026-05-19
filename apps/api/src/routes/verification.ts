import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { prisma } from "@yuno/db";
import { createHash } from "node:crypto";
import { env } from "../env.js";
import { requireUser } from "../auth.js";
import { logger } from "../logger.js";

const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

export const verificationRoutes: FastifyPluginAsync = async (app) => {
  // POST /verification/start — kicks off Stripe Identity flow
  app.post("/verification/start", async (req, reply) => {
    if (!stripe) return reply.code(501).send({ error: { code: "INTERNAL", message: "stripe not configured" } });
    const claims = requireUser(req);

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { yunoUserId: claims.sub },
      options: {
        document: {
          require_id_number: false,
          require_matching_selfie: true,
          require_live_capture: true,
        },
      },
    });

    return { sessionId: session.id, url: session.url };
  });

  // POST /verification/webhook — Stripe Identity webhook
  app.post("/verification/webhook", { config: { rawBody: true } }, async (req, reply) => {
    if (!stripe) return reply.code(501).send({ ok: false });
    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") return reply.code(400).send({ ok: false });

    let event: Stripe.Event;
    try {
      const raw = (req as unknown as { rawBody: Buffer | string }).rawBody;
      event = stripe.webhooks.constructEvent(raw as Buffer, sig, env.VERIFICATION_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, "verification webhook bad sig");
      return reply.code(400).send({ ok: false });
    }

    try {
      if (event.type === "identity.verification_session.verified") {
        const sess = event.data.object as Stripe.Identity.VerificationSession;
        const userId = (sess.metadata?.yunoUserId as string) || "";
        if (!userId) return { ok: true };

        const verifiedSession = await stripe.identity.verificationSessions.retrieve(sess.id, {
          expand: ["verified_outputs"],
        });
        const out = verifiedSession.verified_outputs;
        if (!out) return { ok: true };

        // Hash document number — never store raw
        const docHash = out.id_number
          ? createHash("sha256").update(`${out.id_number}|${out.first_name}`).digest("hex")
          : createHash("sha256").update(`${sess.id}|${userId}`).digest("hex");

        // Reject duplicate document
        const existingDup = await prisma.verification.findUnique({ where: { documentHash: docHash } });
        if (existingDup && existingDup.userId !== userId) {
          logger.warn({ userId, docHash }, "duplicate document attempt");
          return { ok: true };
        }

        // Map Stripe gender output to our enum (Stripe doesn't return gender, so we may need to ask)
        // For MVP we just record what we have; the user picks their badge label in UI separately.
        const yob = out.dob?.year ?? null;

        await prisma.$transaction([
          prisma.verification.upsert({
            where: { userId },
            update: {
              status: "verified",
              documentHash: docHash,
              yearOfBirth: yob ?? 1990,
              documentCountry: (out.address?.country as string) ?? "US",
              verifiedAt: new Date(),
              stripeVerificationSessionId: sess.id,
            },
            create: {
              userId,
              status: "verified",
              documentHash: docHash,
              reportedGender: "female", // placeholder; UI picks label
              yearOfBirth: yob ?? 1990,
              documentCountry: (out.address?.country as string) ?? "US",
              stripeVerificationSessionId: sess.id,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: {
              verifiedAt: new Date(),
              ageYear: yob,
            },
          }),
          prisma.reputationEvent.create({
            data: { userId, delta: 200, reason: "verification_passed" },
          }),
        ]);
      }
    } catch (err) {
      logger.error({ err }, "verification webhook handler error");
    }

    return { received: true };
  });
};
