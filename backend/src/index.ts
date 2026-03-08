import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import qrRoutes from "./routes/qr";
import attendanceRoutes from "./routes/attendance";
import lectureRoutes from "./routes/lecture";
import studentRoutes from "./routes/student";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/qr", qrRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/lecture", lectureRoutes);
app.use("/api/student", studentRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    program_id: process.env.PROGRAM_ID,
    network: process.env.SOLANA_NETWORK,
    anti_proxy_layers: [
      "HMAC-signed rotating QR (60s expiry)",
      "DB-backed nonce (one-time use)",
      "Geolocation radius check (50m)",
      "Time window enforcement",
      "Device fingerprint binding",
      "Duplicate prevention (unique constraint)",
      "Wallet identity verification",
    ],
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Web3 Attendance Backend v2.0         ║
║   http://localhost:${PORT}               ║
║   SQLite DB: data/attendance.db        ║
║   Anti-proxy layers: 7                 ║
╚════════════════════════════════════════╝
  `);
});

export default app;