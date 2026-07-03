import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { migrate } from "./database/migrate.js";
import { ensureUploadDirs, UPLOAD_DIR } from "./lib/upload.js";
import { profileRoutes } from "./routes/profileRoutes.js";
import { settingsRoutes } from "./routes/settingsRoutes.js";
import { measurementRoutes } from "./routes/measurementRoutes.js";
import { goalRoutes } from "./routes/goalRoutes.js";
import { photoRoutes } from "./routes/photoRoutes.js";
import { exerciseRoutes } from "./routes/exerciseRoutes.js";
import { catalogRoutes } from "./routes/catalogRoutes.js";
import { splitRoutes } from "./routes/splitRoutes.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { sessionExerciseRoutes, sessionSetRoutes } from "./routes/sessionItemRoutes.js";
import { statsRoutes } from "./routes/statsRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { uploadErrorHandler } from "./middleware/uploadErrorHandler.js";

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/splits", splitRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/session-exercises", sessionExerciseRoutes);
app.use("/api/session-sets", sessionSetRoutes);
app.use("/api/stats", statsRoutes);

app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "365d", immutable: true }));

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(uploadErrorHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  ensureUploadDirs();
  await migrate();
  app.listen(PORT, () => {
    process.stdout.write(`Health backend rodando em http://localhost:${PORT}\n`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar o backend:", error);
  process.exit(1);
});
