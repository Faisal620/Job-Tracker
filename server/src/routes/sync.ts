import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { fetchRecentEmails } from "../services/gmail";
import { classifyEmail, Classified } from "../services/classifier";
import Application from "../models/Application";

const router = Router();

router.use(requireAuth);

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.post("/", async (req: AuthedRequest, res) => {
  try {
    const userId = req.userId as string;
    const emails = await fetchRecentEmails(userId);

    // Oldest first, so the latest email decides the final stage
    const results = emails
      .map(classifyEmail)
      .filter((r): r is Classified => r !== null)
      .sort(
        (a, b) =>
          new Date(a.email.date).getTime() - new Date(b.email.date).getTime()
      );

    let created = 0;
    let updated = 0;

    for (const r of results) {
      // Skip emails we've already processed
      const seen = await Application.exists({ userId, emailIds: r.email.id });
      if (seen) continue;

      const existing = await Application.findOne({
        userId,
        company: new RegExp(`^${escapeRegex(r.company)}$`, "i"),
      });

      if (existing) {
        existing.stage = r.stage;
        existing.emailIds.push(r.email.id);
        await existing.save();
        updated++;
      } else {
        await Application.create({
          userId,
          company: r.company,
          role: r.email.subject.slice(0, 80),
          stage: r.stage,
          source: "email",
          emailIds: [r.email.id],
        });
        created++;
      }
    }

    res.json({
      fetched: emails.length,
      matched: results.length,
      created,
      updated,
    });
  } catch (err) {
    const message = (err as Error).message;
    console.error("Sync failed:", message);
    if (message.includes("invalid_grant")) {
      return res
        .status(401)
        .json({ error: "Google access expired. Please log in again." });
    }
    res.status(500).json({ error: "Sync failed" });
  }
});

export default router;