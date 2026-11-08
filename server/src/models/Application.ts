import { Schema, model } from "mongoose";

export const STAGES = [
  "applied",
  "assessment",
  "interview",
  "offer",
  "rejected",
] as const;

const applicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    stage: { type: String, enum: STAGES, default: "applied" },
    deadline: { type: Date },
    source: { type: String, enum: ["manual", "email"], default: "manual" },
    notes: { type: String },
    emailIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default model("Application", applicationSchema);