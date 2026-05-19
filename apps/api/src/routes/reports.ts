import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@yuno/db";
import { requireUser } from "../auth.js";
import { ReportBody } from "@yuno/shared";
import { env } from "../env.js";
import { redis } from "../redis.js";
import { logger } from "../logger.js";

// ---------------------------------------------------------------------------
// External-facing report endpoints
// ---------------------------------------------------------------------------

export const reportRoutes: FastifyPluginAsync = async (app) => {
  // POST /reports — file a report
  app.post("/reports", async (req, reply) => {
    const claims = requireUser(req);
    const body = ReportBody.parse(req.body);

    // Verify reporter actually was in the session
    const session = await prisma.session.findUnique({
      where: { id: body.sessionId },
      select: { userAId: true, userBId: true },
    });
    if (!session) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "no such session" } });
    if (session.userAId !== claims.sub && session.userBId !== claims.sub) {
      return reply.code(403).send({ error: { code: "FORBIDDEN", message: "not your session" } });
    }
    const reporteeId = session.userAId === claims.sub ? session.userBId : session.userAId;

    // Persist evidence frame to S3 if provided. For MVP we just log size.
    let evidenceS3Key: string | undefined;
    if (body.evidenceFrameBase64) {
      // TODO: upload to S3 (see docs/12-security.md). For now we keep a hash + size in logs.
      evidenceS3Key = `pending/${body.sessionId}/${Date.now()}.jpg`;
      logger.info({ size: body.evidenceFrameBase64.length, sessionId: body.sessionId }, "evidence captured");
    }

    const report = await prisma.report.create({
      data: {
        sessionId: body.sessionId,
        reporterId: claims.sub,
        reporteeId,
        category: body.category,
        note: body.note,
        evidenceS3Key,
        status: "pending",
      },
    });

    await prisma.session.update({
      where: { id: body.sessionId },
      data: { reported: true },
    });

    // Auto-action on accumulated reports for nsfw/minor
    if (body.category === "nsfw" || body.category === "minor") {
      const window24h = new Date(Date.now() - 24 * 3600 * 1000);
      const recentReportsCount = await prisma.report.count({
        where: {
          reporteeId,
          category: body.category,
          createdAt: { gt: window24h },
          status: { in: ["pending", "auto_actioned"] },
        },
      });

      if (recentReportsCount >= env.MODERATION_REPORT_THRESHOLD) {
        const banUntil = new Date(Date.now() + 24 * 3600 * 1000);
        await prisma.$transaction([
          prisma.user.update({
            where: { id: reporteeId },
            data: { isShadowBanned: true, banUntil },
          }),
          prisma.report.updateMany({
            where: {
              reporteeId,
              category: body.category,
              status: "pending",
            },
            data: { status: "auto_actioned", actionTaken: "shadow_ban_24h", actionedAt: new Date() },
          }),
          prisma.reputationEvent.create({
            data: { userId: reporteeId, delta: -200, reason: "auto_action_nsfw_threshold" },
          }),
        ]);
        await redis.set(`ban:${reporteeId}`, banUntil.getTime().toString(), "EX", 24 * 3600);
        await redis.set(`shadow:${reporteeId}`, "1", "EX", 24 * 3600);
        logger.warn({ reporteeId, category: body.category }, "auto-action threshold hit");
      }
    }

    return { reportId: report.id };
  });

  // GET /reports/mine — transparency
  app.get("/reports/mine", async (req) => {
    const claims = requireUser(req);
    const reports = await prisma.report.findMany({
      where: { reporterId: claims.sub },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, category: true, status: true, actionTaken: true, createdAt: true },
    });
    return { reports };
  });

  // ----- POST /internal/reports — called by signaling -----
  app.post("/internal/reports", async (req) => {
    const body = req.body as {
      reporterId: string;
      reporteeId: string;
      sessionId: string;
      category: string;
      evidenceFrameBase64?: string;
    };

    let evidenceS3Key: string | undefined;
    if (body.evidenceFrameBase64) {
      evidenceS3Key = `pending/${body.sessionId}/${Date.now()}.jpg`;
    }

    const report = await prisma.report.create({
      data: {
        sessionId: body.sessionId,
        reporterId: body.reporterId,
        reporteeId: body.reporteeId,
        category: body.category as "nsfw",
        evidenceS3Key,
        status: "pending",
      },
    });

    return { reportId: report.id };
  });

  // ----- POST /internal/users/profile — quick lookup used by signaling -----
  app.post("/internal/users/profile", async (req) => {
    const body = req.body as { userIds: string[] };
    if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
      return { users: [] };
    }
    const users = await prisma.user.findMany({
      where: { id: { in: body.userIds } },
      select: {
        id: true,
        selfGender: true,
        verifiedLabel: true,
        verifiedAt: true,
        premiumUntil: true,
        ipCountry: true,
      },
    });
    return {
      users: users.map((u) => ({
        userId: u.id,
        selfGender: u.selfGender,
        verifiedLabel: u.verifiedLabel,
        verified: !!u.verifiedAt,
        premium: !!u.premiumUntil && u.premiumUntil > new Date(),
        country: u.ipCountry,
      })),
    };
  });

  // ----- POST /internal/sessions/start — called by signaling -----
  app.post("/internal/sessions/start", async (req) => {
    const body = req.body as {
      sessionId: string;
      userAId: string;
      userBId: string;
      modality: string;
      matchedVia: string;
    };
    // Insert ignoring duplicate (session may have been pre-allocated)
    await prisma.session.upsert({
      where: { id: body.sessionId },
      update: {},
      create: {
        id: body.sessionId,
        userAId: body.userAId,
        userBId: body.userBId,
        modality: body.modality as "video",
        matchedVia: body.matchedVia,
      },
    });
    return { ok: true };
  });

  // ----- POST /internal/sessions/end — called by signaling -----
  app.post("/internal/sessions/end", async (req) => {
    const body = req.body as { sessionId: string; endedReason: string; iceRelayUsed?: boolean };
    // Signaling uses peer-relative reasons (you_skip / peer_skip / peer_left)
    // while the DB enum is per-side (skip_a / skip_b / disconnect_a / ...).
    // We don't know which side from this payload alone, so collapse to a
    // canonical neutral set we DO have in the enum.
    const reasonMap: Record<string, "moderator" | "system" | "skip_a" | "disconnect_a" | "report_a"> = {
      you_skip: "skip_a",
      peer_skip: "skip_a",
      peer_left: "disconnect_a",
      moderator: "moderator",
      system: "system",
      report: "report_a",
    };
    const dbReason = reasonMap[body.endedReason] ?? "system";

    await prisma.session
      .update({
        where: { id: body.sessionId },
        data: {
          endedAt: new Date(),
          endedReason: dbReason,
          iceRelayUsed: body.iceRelayUsed ?? false,
        },
      })
      .catch(() => {
        // session row may not exist if start raced
      });
    return { ok: true };
  });
};
