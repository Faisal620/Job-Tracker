import User from "../models/User";
import { encrypt } from "../utils/crypto";
import { Router } from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { requireAuth, AuthedRequest } from "../middleware/auth";


const router = Router();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

// Step 1 of login: send the user to Google's permission page
router.get("/google", (req, res) => {
  const url = getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });
  res.redirect(url);
});

// Step 2 of login: Google sends the user back here with a code
router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("Missing code");

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    const update: Record<string, unknown> = {
      email: profile.email,
      name: profile.name,
    };
    if (tokens.refresh_token) {
      update.refreshToken = encrypt(tokens.refresh_token);
    }

    const user = await User.findOneAndUpdate(
      { googleId: profile.id },
      update,
      { upsert: true, returnDocument: "after" }
    );
    if (!user) throw new Error("User could not be saved");

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("http://localhost:5173/");
  } catch (err) {
    console.error("Google callback failed:", (err as Error).message);
    res.status(500).send("Login failed");
  }
});

// Who is logged in right now?
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select("email name");
  if (!user) return res.status(401).json({ error: "User not found" });
  res.json(user);
});

// Log out
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export default router;