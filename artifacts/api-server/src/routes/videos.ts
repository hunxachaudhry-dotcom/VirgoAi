import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GenerateVideoBody,
  GetVideoParams,
  DeleteVideoParams,
  GetVideoStatusParams,
} from "@workspace/api-zod";

const router = Router();

// GET /videos/stats — must be before /:id
router.get("/videos/stats", async (req, res) => {
  try {
    const rows = await db
      .select({
        status: videosTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(videosTable)
      .groupBy(videosTable.status);

    const stats = { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      stats.total += count;
      if (row.status === "pending") stats.pending = count;
      else if (row.status === "processing") stats.processing = count;
      else if (row.status === "completed") stats.completed = count;
      else if (row.status === "failed") stats.failed = count;
    }

    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Failed to get video stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /videos
router.get("/videos", async (req, res) => {
  try {
    const videos = await db
      .select()
      .from(videosTable)
      .orderBy(sql`${videosTable.createdAt} DESC`);
    res.json(videos.map(formatVideo));
  } catch (err) {
    req.log.error({ err }, "Failed to list videos");
    res.status(500).json({ error: "Failed to list videos" });
  }
});

// POST /videos — generate a new video
router.post("/videos", async (req, res) => {
  const parsed = GenerateVideoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { prompt, aspectRatio = "16:9", duration = 6 } = parsed.data;

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    res.status(503).json({ error: "Video generation service not configured. Please add your FAL_KEY." });
    return;
  }

  // Enforce plan limits
  const { resolvePlan, getQuotaForPlan } = await import("./plans.js");
  const planCode = req.headers["x-plan-code"] as string | undefined;
  const plan = resolvePlan(planCode);
  const quota = await getQuotaForPlan(plan);

  if (!quota.allowedDurations.includes(duration)) {
    res.status(403).json({ error: `Duration ${duration}s requires a Premium plan.` });
    return;
  }

  if (!quota.canGenerate) {
    res.status(429).json({ error: `Free plan limit reached (${quota.limit} videos/day). Upgrade to Premium for unlimited.` });
    return;
  }

  // Insert as pending first
  const [video] = await db
    .insert(videosTable)
    .values({ prompt, aspectRatio, duration, status: "pending" })
    .returning();

  res.status(201).json(formatVideo(video));

  // Kick off generation in the background (fire-and-forget)
  generateVideoBackground(video.id, prompt, aspectRatio, duration, FAL_KEY).catch((err) => {
    req.log.error({ err, videoId: video.id }, "Background video generation failed");
  });
});

// GET /videos/:id/status
router.get("/videos/:id/status", async (req, res) => {
  const parsed = GetVideoStatusParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.id, parsed.data.id));

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  res.json(formatVideo(video));
});

// GET /videos/:id
router.get("/videos/:id", async (req, res) => {
  const parsed = GetVideoParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [video] = await db
    .select()
    .from(videosTable)
    .where(eq(videosTable.id, parsed.data.id));

  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  res.json(formatVideo(video));
});

// DELETE /videos/:id
router.delete("/videos/:id", async (req, res) => {
  const parsed = DeleteVideoParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(videosTable)
    .where(eq(videosTable.id, parsed.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  res.status(204).send();
});

// --- helpers ---

function formatVideo(v: typeof videosTable.$inferSelect) {
  return {
    id: v.id,
    prompt: v.prompt,
    status: v.status,
    aspectRatio: v.aspectRatio,
    duration: v.duration,
    videoUrl: v.videoUrl ?? null,
    errorMessage: v.errorMessage ?? null,
    falRequestId: v.falRequestId ?? null,
    createdAt: v.createdAt?.toISOString() ?? null,
    updatedAt: v.updatedAt?.toISOString() ?? null,
  };
}

async function generateVideoBackground(
  videoId: number,
  prompt: string,
  aspectRatio: string,
  duration: number,
  falKey: string
) {
  // Mark as processing
  await db
    .update(videosTable)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(videosTable.id, videoId));

  try {
    // Map duration to fal.ai accepted values
    const durationStr = duration <= 5 ? "5" : "10";

    const response = await fetch(
      "https://queue.fal.run/fal-ai/wan/v2.1/1.3b/text-to-video",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          num_frames: duration * 8,
          aspect_ratio: aspectRatio,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fal.ai queue error: ${response.status} ${errText}`);
    }

    const queued = (await response.json()) as { request_id: string; response_url: string; status_url: string };

    // Save request_id
    await db
      .update(videosTable)
      .set({ falRequestId: queued.request_id, updatedAt: new Date() })
      .where(eq(videosTable.id, videoId));

    // Poll for result (up to 5 minutes)
    const result = await pollFalResult(queued.status_url, queued.response_url, falKey, 300);

    const resultData = result as { video?: { url?: string } };
    const videoUrl = resultData?.video?.url ?? null;

    if (!videoUrl) {
      throw new Error("No video URL in result");
    }

    await db
      .update(videosTable)
      .set({ status: "completed", videoUrl, updatedAt: new Date() })
      .where(eq(videosTable.id, videoId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(videosTable)
      .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
      .where(eq(videosTable.id, videoId));
  }
}

async function pollFalResult(
  statusUrl: string,
  responseUrl: string,
  falKey: string,
  maxSeconds: number
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + maxSeconds * 1000;

  while (Date.now() < deadline) {
    await sleep(4000);

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${falKey}` },
    });

    if (!statusRes.ok) continue;

    const status = (await statusRes.json()) as { status: string };

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (resultRes.ok) {
        return (await resultRes.json()) as Record<string, unknown>;
      }
    }

    if (status.status === "FAILED") {
      throw new Error("Fal.ai job failed");
    }
  }

  throw new Error("Video generation timed out");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default router;
