import { Router } from "express";
import Application from "../models/Application";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// Every route in this file needs a logged-in user
router.use(requireAuth);

const ALLOWED = ["company", "role", "stage", "deadline", "notes"];

function pickAllowed(body: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(body).filter(([key]) => ALLOWED.includes(key))
  );
}

// Get my applications
router.get("/", async (req: AuthedRequest, res) => {
  const applications = await Application.find({ userId: req.userId }).sort({
    createdAt: -1,
  });
  res.json(applications);
});

// Create an application for me
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const application = await Application.create({
      ...pickAllowed(req.body),
      userId: req.userId,
    });
    res.status(201).json(application);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Update one of my applications
router.patch("/:id", async (req: AuthedRequest, res) => {
  try {
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      pickAllowed(req.body),
      { returnDocument: "after", runValidators: true }
    );
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json(application);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Delete one of my applications
router.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;