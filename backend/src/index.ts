import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env, isProduction } from "./config/env";
import { purgeExpiredNonces } from "./config/database";
import qrRoutes from "./routes/qr";
import attendanceRoutes from "./routes/attendance";
import lectureRoutes from "./routes/lecture";
import studentRoutes from "./routes/student";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and non-browser clients (curl, health checks) send no Origin.
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);
app.use(morgan(isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: env.solanaNetwork,
    program_id: env.programId,
    qr_expiry_seconds: env.qrExpirySeconds,
    allowed_radius_meters: env.allowedRadiusMeters,
  });
});

app.use("/api/qr", qrRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/lecture", lectureRoutes);
app.use("/api/student", studentRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({
    success: false,
    error: isProduction ? "Internal server error" : err.message,
  });
});

// Expired nonces are dead weight; sweep them hourly.
const sweep = setInterval(() => purgeExpiredNonces(), 60 * 60 * 1000);
sweep.unref();

const server = app.listen(env.port, () => {
  console.log(`Web3 attendance API listening on http://localhost:${env.port}`);
  console.log(`  network:  ${env.solanaNetwork}`);
  console.log(`  program:  ${env.programId}`);
  console.log(`  cors:     ${env.corsOrigins.join(", ")}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

export default app;
