import { EmailSummary } from "./gmail";

export type Stage =
  | "applied"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected";

export type Classified = {
  email: EmailSummary;
  stage: Stage;
  company: string;
};

// Senders that are never job applications (matched against the From text)
const BLOCKED_SENDERS = [
  "unstop",
  "linkedin.com",
  "naukri.com",
  "slice.bank.in",
  "harvardonline",
  "getscreen.me",
];

// Checked in this order, first match wins
const STAGE_RULES: { stage: Stage; words: string[] }[] = [
  {
    stage: "offer",
    words: ["offer letter", "pleased to offer", "delighted to offer", "job offer"],
  },
  {
    stage: "rejected",
    words: [
      "regret to inform",
      "unfortunately",
      "not moving forward",
      "other candidates",
      "decided not to proceed",
    ],
  },
  {
    stage: "interview",
    words: ["interview", "schedule a call", "next round", "moving forward"],
  },
  {
    stage: "assessment",
    words: ["assessment", "coding test", "online test", "hackerrank", "codility"],
  },
  {
    stage: "applied",
    words: [
      "application was submitted",
      "application received",
      "thank you for applying",
      "thanks for applying",
      "received your application",
    ],
  },
];

function extractCompany(from: string, subject: string): string {
  // 1. "... at Company" in the subject
  const atMatch = subject.match(/\bat ([A-Z][\w&.\- ]{1,40}?)(?:[:,!|\-–]|$)/);
  if (atMatch) return atMatch[1].trim();

  // 2. The sender's display name, minus words like "Team"
  const name = from.split("<")[0].replace(/["']/g, "");
  const cleaned = name
    .replace(/\b(team|careers|recruiting|talent|hr|jobs|support|no-?reply)\b/gi, "")
    .trim();
  if (cleaned) return cleaned;

  // 3. The sender's domain
  const domain = from.match(/@([\w.-]+)/)?.[1] ?? "Unknown";
  return domain.split(".").slice(-2, -1)[0] ?? domain;
}

export function classifyEmail(email: EmailSummary): Classified | null {
  const from = email.from.toLowerCase();

  // Layer 1: bulk mail
  if (
    email.labels.includes("CATEGORY_PROMOTIONS") ||
    email.labels.includes("CATEGORY_SOCIAL") ||
    email.unsubscribe
  ) {
    return null;
  }

  // Layer 2: known-noise senders
  if (BLOCKED_SENDERS.some((s) => from.includes(s))) return null;

  // Layer 3: stage words
  const text = `${email.subject} ${email.snippet}`.toLowerCase();
  const rule = STAGE_RULES.find((r) => r.words.some((w) => text.includes(w)));
  if (!rule) return null;

  return {
    email,
    stage: rule.stage,
    company: extractCompany(email.from, email.subject),
  };
}