import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import applicationRoutes from "./routes/applications";
import authRoutes from "./routes/auth";
import syncRoutes from "./routes/sync";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use("/api/applications", applicationRoutes);
app.use("/api/sync", syncRoutes);
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Job Tracker Server is running!");
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });