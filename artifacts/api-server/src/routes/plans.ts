import { Router } from "express";
import { db } from "@workspace/db";
import { videosTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { UnlockPlanBody } from "@workspace/api-zod";

const router = Router();

export type Plan = "free" | "premium" | "admin";

export function resolvePlan(code: string | undefined): Plan {
  if (!code) return "free";
  if (code === process.env.ADMIN_CODE) return "admin";
  if (code === process.env.PREMIUM_CODE) return "premium";
  return "free";
}

const FREE_DAILY_LIMIT = 3;
const FREE_ALLOWED_DURATIONS = [2, 3, 4, 5];
const PREMIUM_ALLOWED_DURATIONS = [2, 3, 4, 5, 8];

export async function getQuotaForPlan(plan: Plan): Promise<{
  plan: Plan;
  used: number;
  limit: number | null;
  canGenerate: boolean;
  allowedDurations: number[];
}> {
  if (plan === "admin" || plan === "premium") {
    return {
      plan,
      used: 0,
      limit: null,
      canGenerate: true,
      allowedDurations: PREMIUM_ALLOWED_DURATIONS,
    };
  }

  // Free: count today's videos
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(videosTable)
    .where(sql`${videosTable.createdAt} >= ${today}`);

  const used = Number(result?.count ?? 0);
  return {
    plan: "free",
    used,
    limit: FREE_DAILY_LIMIT,
    canGenerate: used < FREE_DAILY_LIMIT,
    allowedDurations: FREE_ALLOWED_DURATIONS,
  };
}

// POST /unlock
router.post("/unlock", (req, res) => {
  const parsed = UnlockPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { code } = parsed.data;
  const plan = resolvePlan(code);

  if (plan === "free") {
    res.status(401).json({ error: "Invalid code. Please check and try again." });
    return;
  }

  res.json({ plan });
});

// GET /quota
router.get("/quota", async (req, res) => {
  const code = req.headers["x-plan-code"] as string | undefined;
  const plan = resolvePlan(code);

  try {
    const quota = await getQuotaForPlan(plan);
    res.json(quota);
  } catch (err) {
    req.log.error({ err }, "Failed to get quota");
    res.status(500).json({ error: "Failed to get quota" });
  }
});

export default router;
