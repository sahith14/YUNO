import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { prisma } from "@yuno/db";
import { CheckoutBody } from "@yuno/shared";
import { requireUser } from "../auth.js";
import { env } from "../env.js";
import { logger } from "../logger.js";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

export const billingRoutes: FastifyPluginAsync = async (app) => {
  // --------------------- POST /billing/checkout ---------------------
  app.post("/billing/checkout", async (req, reply) => {
    if (!stripe) return reply.code(501).send({ error: { code: "INTERNAL", message: "stripe not configured" } });
    const claims = requireUser(req);
    const body = CheckoutBody.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "user gone" } });

    let priceId: string | null = null;
    if (body.product === "premium") priceId = env.STRIPE_PRICE_PREMIUM_MONTHLY;
    if (body.product === "verified") priceId = env.STRIPE_PRICE_VERIFIED_FEMALE;
    // bundle handled as a separate Stripe price in real config

    if (!priceId) return reply.code(400).send({ error: { code: "INVALID_INPUT", message: "unknown product" } });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      success_url: `${env.WEB_URL}/billing/success?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.WEB_URL}/billing/cancel`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { yunoUserId: user.id, yunoProduct: body.product },
      },
      metadata: { yunoUserId: user.id, yunoProduct: body.product },
    });

    return { checkoutUrl: session.url };
  });

  // --------------------- POST /billing/portal ---------------------
  app.post("/billing/portal", async (req, reply) => {
    if (!stripe) return reply.code(501).send({ error: { code: "INTERNAL", message: "stripe not configured" } });
    const claims = requireUser(req);

    const sub = await prisma.premiumSub.findUnique({ where: { userId: claims.sub } });
    if (!sub) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "no subscription" } });

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${env.WEB_URL}/account`,
    });
    return { url: portal.url };
  });

  // --------------------- GET /billing/status ---------------------
  app.get("/billing/status", async (req) => {
    const claims = requireUser(req);
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { premiumUntil: true, verifiedAt: true, verifiedLabel: true },
    });
    const sub = await prisma.premiumSub.findUnique({
      where: { userId: claims.sub },
      select: { product: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    });
    return {
      premium: !!user?.premiumUntil && user.premiumUntil > new Date(),
      premiumUntil: user?.premiumUntil ?? null,
      verified: !!user?.verifiedAt,
      verifiedLabel: user?.verifiedLabel ?? null,
      subscription: sub,
    };
  });

  // --------------------- POST /billing/webhook ---------------------
  // Public path (no auth header). Verified by Stripe signature.
  app.post("/billing/webhook", { config: { rawBody: true } }, async (req, reply) => {
    if (!stripe) return reply.code(501).send({ ok: false });

    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") return reply.code(400).send({ ok: false });

    let event: Stripe.Event;
    try {
      const raw = (req as unknown as { rawBody: Buffer | string }).rawBody;
      event = stripe.webhooks.constructEvent(raw as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, "stripe webhook signature failed");
      return reply.code(400).send({ ok: false });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub =
            event.type === "checkout.session.completed"
              ? await stripe.subscriptions.retrieve(
                  ((event.data.object as Stripe.Checkout.Session).subscription as string) ?? "",
                )
              : (event.data.object as Stripe.Subscription);

          const userId =
            (sub.metadata?.yunoUserId as string) ||
            ((event.data.object as Stripe.Checkout.Session).client_reference_id ?? "");

          if (!userId) break;
          const product = (sub.metadata?.yunoProduct as "premium" | "verified" | "bundle") ?? "premium";
          const status = sub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete";
          const currentPeriodEnd = new Date(sub.current_period_end * 1000);

          await prisma.premiumSub.upsert({
            where: { userId },
            update: {
              stripeCustomerId: sub.customer as string,
              stripeSubscriptionId: sub.id,
              product,
              status,
              currentPeriodEnd,
              cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            },
            create: {
              userId,
              stripeCustomerId: sub.customer as string,
              stripeSubscriptionId: sub.id,
              product,
              status,
              currentPeriodEnd,
              cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            },
          });

          // Mirror to user.premiumUntil for fast reads
          if (product === "premium" || product === "bundle") {
            await prisma.user.update({
              where: { id: userId },
              data: { premiumUntil: status === "active" || status === "trialing" ? currentPeriodEnd : null },
            });
          }
          break;
        }
        case "invoice.payment_failed": {
          // Email user; for MVP just log
          logger.warn({ event: event.type }, "payment failed");
          break;
        }
      }
    } catch (err) {
      logger.error({ err, type: event.type }, "stripe webhook handler error");
    }
    return { received: true };
  });
};
