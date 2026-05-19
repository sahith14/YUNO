import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@yuno/db";
import { requireUser } from "../auth.js";
import { SetInterestsBody } from "@yuno/shared";
import { redis } from "../redis.js";

const CACHE_KEY = "interests:active";
const CACHE_TTL = 3600;

export const interestRoutes: FastifyPluginAsync = async (app) => {
  // GET /interests — public, cached
  app.get("/interests", async () => {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
    const list = await prisma.interest.findMany({
      where: { isActive: true },
      orderBy: { label: "asc" },
      select: { slug: true, label: true, category: true },
    });
    const payload = { interests: list };
    await redis.set(CACHE_KEY, JSON.stringify(payload), "EX", CACHE_TTL);
    return payload;
  });

  // PUT /me/interests — replace user's interests
  app.put("/me/interests", async (req, reply) => {
    const claims = requireUser(req);
    const body = SetInterestsBody.parse(req.body);

    // Cap by tier
    const max = claims.premium ? 5 : 1;
    const slugs = body.slugs.slice(0, max);

    const existing = await prisma.interest.findMany({
      where: { slug: { in: slugs }, isActive: true },
      select: { id: true, slug: true },
    });
    if (existing.length !== slugs.length) {
      return reply
        .code(400)
        .send({ error: { code: "INVALID_INPUT", message: "unknown interest slug" } });
    }

    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId: claims.sub } }),
      prisma.userInterest.createMany({
        data: existing.map((i) => ({ userId: claims.sub, interestId: i.id })),
      }),
    ]);

    return { ok: true, interests: existing.map((i) => i.slug) };
  });
};
