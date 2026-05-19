import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@yuno/db";
import { requireAdmin } from "../auth.js";
import { AdminActionBody, AdminBanBody } from "@yuno/shared";
import { redis } from "../redis.js";
import { logger } from "../logger.js";

const ms = { "24h": 24 * 3600 * 1000, "7d": 7 * 24 * 3600 * 1000 } as const;

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // ---------- GET /admin/reports ----------
  app.get<{ Querystring: { status?: string; limit?: string; cursor?: string } }>(
    "/admin/reports",
    async (req) => {
      requireAdmin(req);
      const status = (req.query.status as "pending" | "actioned" | "dismissed") ?? "pending";
      const limit = Math.min(100, Number(req.query.limit ?? "50"));
      const cursor = req.query.cursor;

      const items = await prisma.report.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          reporter: { select: { id: true, reputationScore: true } },
          reportee: {
            select: {
              id: true,
              reputationScore: true,
              banUntil: true,
              isShadowBanned: true,
              ipCountry: true,
            },
          },
          session: {
            select: { id: true, startedAt: true, endedAt: true, modality: true, matchedVia: true },
          },
        },
      });

      const nextCursor = items.length > limit ? items.pop()!.id : null;
      return { items, nextCursor };
    },
  );

  // ---------- POST /admin/reports/:id/action ----------
  app.post<{ Params: { id: string } }>("/admin/reports/:id/action", async (req, reply) => {
    const admin = requireAdmin(req);
    const body = AdminActionBody.parse(req.body);

    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "report" } });

    const targetUserId = report.reporteeId;

    let banUntil: Date | null = null;
    let shadow: boolean = false;
    let repDelta = 0;

    switch (body.action) {
      case "warn":
        repDelta = -50;
        break;
      case "shadow_ban_24h":
        shadow = true;
        repDelta = -150;
        banUntil = new Date(Date.now() + ms["24h"]);
        break;
      case "ban_7d":
        banUntil = new Date(Date.now() + ms["7d"]);
        repDelta = -300;
        break;
      case "ban_perm":
        banUntil = new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000);
        repDelta = -1000;
        break;
      case "dismiss":
        repDelta = 0;
        break;
    }

    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: report.id },
        data: {
          status: body.action === "dismiss" ? "dismissed" : "actioned",
          actionTaken: body.action,
          actionedById: admin.sub,
          actionedAt: new Date(),
        },
      });

      if (body.action !== "dismiss") {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            banUntil,
            isShadowBanned: shadow,
          },
        });
        await tx.ban.create({
          data: {
            userId: targetUserId,
            reason: body.notes ?? `report-${report.id}-${body.action}`,
            startsAt: new Date(),
            endsAt: banUntil,
            issuedById: admin.sub,
          },
        });
      }

      if (repDelta !== 0) {
        await tx.reputationEvent.create({
          data: { userId: targetUserId, delta: repDelta, reason: `mod_${body.action}` },
        });
        await tx.user.update({
          where: { id: targetUserId },
          data: { reputationScore: { increment: repDelta } },
        });
      }

      await tx.moderationAction.create({
        data: {
          moderatorId: admin.sub,
          targetUserId,
          reportId: report.id,
          action: body.action,
          notes: body.notes,
        },
      });
    });

    if (banUntil) {
      const ttl = Math.floor((banUntil.getTime() - Date.now()) / 1000);
      await redis.set(`ban:${targetUserId}`, banUntil.getTime().toString(), "EX", Math.max(60, ttl));
    }
    if (shadow) {
      await redis.set(`shadow:${targetUserId}`, "1", "EX", 24 * 3600);
    }

    return { ok: true };
  });

  // ---------- GET /admin/users/:id ----------
  app.get<{ Params: { id: string } }>("/admin/users/:id", async (req, reply) => {
    requireAdmin(req);
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        bans: { orderBy: { createdAt: "desc" }, take: 20 },
        sessionsAsA: { orderBy: { startedAt: "desc" }, take: 20 },
        sessionsAsB: { orderBy: { startedAt: "desc" }, take: 20 },
        reportsAgainst: { orderBy: { createdAt: "desc" }, take: 50 },
        reportsFiled: { orderBy: { createdAt: "desc" }, take: 50 },
        verification: true,
      },
    });
    if (!user) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "user" } });
    return user;
  });

  // ---------- POST /admin/users/:id/ban ----------
  app.post<{ Params: { id: string } }>("/admin/users/:id/ban", async (req) => {
    const admin = requireAdmin(req);
    const body = AdminBanBody.parse(req.body);

    let endsAt: Date | null = null;
    if (body.duration === "24h") endsAt = new Date(Date.now() + ms["24h"]);
    if (body.duration === "7d") endsAt = new Date(Date.now() + ms["7d"]);
    // perm: leave null

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.params.id },
        data: { banUntil: endsAt ?? new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000) },
      }),
      prisma.ban.create({
        data: {
          userId: req.params.id,
          reason: body.reason,
          endsAt,
          issuedById: admin.sub,
        },
      }),
      prisma.moderationAction.create({
        data: {
          moderatorId: admin.sub,
          targetUserId: req.params.id,
          action: `ban_${body.duration}`,
          notes: body.reason,
        },
      }),
    ]);

    if (endsAt) {
      const ttl = Math.floor((endsAt.getTime() - Date.now()) / 1000);
      await redis.set(`ban:${req.params.id}`, endsAt.getTime().toString(), "EX", Math.max(60, ttl));
    } else {
      await redis.set(`ban:${req.params.id}`, (Date.now() + 100 * 365 * 24 * 3600 * 1000).toString());
    }
    return { ok: true };
  });

  // ---------- GET /admin/metrics ----------
  app.get("/admin/metrics", async (req) => {
    requireAdmin(req);
    const [pendingReports, last24Reports, banned24, shadow24, totalUsers, premiumUsers] =
      await Promise.all([
        prisma.report.count({ where: { status: "pending" } }),
        prisma.report.count({ where: { createdAt: { gt: new Date(Date.now() - 24 * 3600 * 1000) } } }),
        prisma.user.count({
          where: { banUntil: { gt: new Date(Date.now() - 24 * 3600 * 1000) } },
        }),
        prisma.user.count({ where: { isShadowBanned: true } }),
        prisma.user.count(),
        prisma.user.count({ where: { premiumUntil: { gt: new Date() } } }),
      ]);

    const queueDepth = {
      video: await redis.zcard("mm:queue:video"),
      audio: await redis.zcard("mm:queue:audio"),
      text: await redis.zcard("mm:queue:text"),
    };
    const activeRooms = await redis.hlen("rooms:active");

    return {
      pendingReports,
      last24Reports,
      banned24,
      shadow24,
      totalUsers,
      premiumUsers,
      queueDepth,
      activeRooms,
    };
  });

  // ---------- GET /admin/sessions/live (snapshot, not SSE for simplicity) ----------
  app.get("/admin/sessions/live", async (req) => {
    requireAdmin(req);
    const active = await prisma.session.findMany({
      where: { endedAt: null },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        userA: { select: { id: true, ipCountry: true, reputationScore: true } },
        userB: { select: { id: true, ipCountry: true, reputationScore: true } },
      },
    });
    return { sessions: active };
  });

  logger.info("admin routes registered");
};
