import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import qrRoutes from "./routes/qr";
import attendanceRoutes from "./routes/attendance";
import lectureRoutes from "./routes/lecture";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/qr", qrRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/lecture", lectureRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", program_id: process.env.PROGRAM_ID });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;