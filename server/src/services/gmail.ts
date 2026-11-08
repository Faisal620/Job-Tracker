import { google } from "googleapis";
import User from "../models/User";
import { decrypt } from "../utils/crypto";

const QUERY =
  'newer_than:30d (application OR applied OR assessment OR interview OR offer OR "regret to inform" OR "thank you for applying")';

const MAX_EMAILS = 100;
const BATCH_SIZE = 10;

export type EmailSummary = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  labels: string[];
  unsubscribe: boolean;
};

export async function fetchRecentEmails(
  userId: string
): Promise<EmailSummary[]> {
  const user = await User.findById(userId);
  if (!user || !user.refreshToken) {
    throw new Error("No Gmail access. Please log in again.");
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  client.setCredentials({ refresh_token: decrypt(user.refreshToken) });

  const gmail = google.gmail({ version: "v1", auth: client });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: QUERY,
    maxResults: MAX_EMAILS,
  });
  const messages = list.data.messages ?? [];

    const results: EmailSummary[] = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);

    const summaries = await Promise.all(
      chunk.map(async (m) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: m.id as string,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date", "List-Unsubscribe"],
        });
        const headers = msg.data.payload?.headers ?? [];
        const header = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value ?? "";

        return {
          id: m.id as string,
          from: header("From"),
          subject: header("Subject"),
          snippet: msg.data.snippet ?? "",
          date: header("Date"),
          labels: msg.data.labelIds ?? [],
          unsubscribe: header("List-Unsubscribe") !== "",
        };
      })
    );

    results.push(...summaries);
  }

  return results;
}