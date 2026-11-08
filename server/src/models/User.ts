import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: { type: String },
    refreshToken: { type: String },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
);

export default model("User", userSchema);